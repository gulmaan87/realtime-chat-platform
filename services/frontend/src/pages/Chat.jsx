import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Folder,
  MessageCircle,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import ContactList from "../components/ContactList";
import ChatHeader from "../components/chat/ChatHeader";
import MessageTimeline from "../components/chat/MessageTimeline";
import MessageComposer from "../components/chat/MessageComposer";
import AssistantRail from "../components/chat/AssistantRail";
import FriendshipPanel from "../components/chat/FriendshipPanel";

  Send,
  CheckCheck,
  LogOut,
  Settings,
  Lock,
  Sparkles,
  Bot,
  RefreshCw,
} from "lucide-react";
import ContactList from "../components/ContactList";
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { clearSession, getSession, getUserId } from "../services/session";
import { analyzeConversationMood } from "../services/sentimentService";
import {
  buildTypingMetadata,
  classifyTypingEmotion,
} from "../services/typingEmotionService";
import { buildSmartReplies } from "../services/smartReplyService";
import { getConversationSummary } from "../services/aiSummaryService";
import {
  executeAssistantCommand,
  getCommandSuggestions,
} from "../services/assistantCommandService";
import {
  addAiTask,
  detectIntentActions,
  detectScamSignals,
  extractLocationQuery,
  extractScheduleHint,
  generateTonePreview,
  loadAiTasks,
  removeAiTask,
  toggleAiTask,
} from "../services/aiProductivityService";
import {
  ACHIEVEMENT_DEFINITIONS,
  applyMiniGameAttempt,
  applyPollVote,
  awardMessageXp,
  buildMiniGameMessage,
  buildPollMessage,
  closePoll,
  deriveLevel,
  evaluateAchievements,
  getAchievementMeta,
  getStoredXpState,
  loadAchievements,
  loadFriendshipStats,
  resolveMiniGameWinner,
  updateFriendshipInteraction,
} from "../services/gamificationSocialService";
import { getVoiceTranscriptPreview } from "../services/voiceCollaborationService";
import {
  buildWhiteboardMessage,
} from "../services/whiteboardCollaborationService";
import "../App.css";

const MOOD_THEME_TOGGLE_KEY = "feature:moodThemeEnabled";
const TYPING_EMOTION_TOGGLE_KEY = "feature:typingEmotionEnabled";
const REACTION_SOUND_TOGGLE_KEY = "feature:reactionSoundEnabled";

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮"];

function safeStorageGet(key, fallback = "true") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function playReactionSound() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, ctx.currentTime);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function normalizeMessage(entry, fallbackIndex = 0) {
  if (typeof entry === "string") {
    return {
      localId: `legacy-${fallbackIndex}`,
      message: entry,
      timestamp: 0,
      type: "text",
      reactions: {},
    };
  }

  const timestamp = Number(entry?.timestamp || Date.now());
  const fromId = String(entry?.fromUserId || entry?.from || "unknown");
  const toId = String(entry?.toUserId || entry?.to || "unknown");
  const localId = String(
    entry?.localId ||
      entry?.clientMessageId ||
      `${fromId}-${toId}-${timestamp}-${fallbackIndex}`
  );

  return {
    ...entry,
    localId,
    type: entry?.type || "text",
    reactions:
      entry?.reactions && typeof entry.reactions === "object"
        ? entry.reactions
        : {},
  };
}

function toTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat({ activeChatUser, setActiveChatUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [typingState, setTypingState] = useState(null);
  const [smartReplies, setSmartReplies] = useState([]);
  const [reactionPulseId, setReactionPulseId] = useState(null);
  const [secretMode, setSecretMode] = useState(false);
  const [unlockedSecrets, setUnlockedSecrets] = useState({});
  const [secretViewed, setSecretViewed] = useState({});
  const [summaryState, setSummaryState] = useState({
    loading: false,
    summary: "No summary yet.",
    source: "none",
    updatedAt: null,
  });
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [toneMode, setToneMode] = useState("professional");
  const [dismissedIntentChips, setDismissedIntentChips] = useState({});
  const [safetyWarning, setSafetyWarning] = useState(null);
  const [showSafetyWhy, setShowSafetyWhy] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [remoteWhiteboardStrokes, setRemoteWhiteboardStrokes] = useState([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [gamificationToast, setGamificationToast] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [xpState, setXpState] = useState(() => getStoredXpState());
  const [achievements, setAchievements] = useState(() => loadAchievements());
  const [aiTasks, setAiTasks] = useState(() => loadAiTasks());
  const [friendshipStats, setFriendshipStats] = useState(() =>
    loadFriendshipStats()
  );

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingMetricsRef = useRef({ lastValue: "", lastTimestamp: 0 });
  const typingEmitCooldownRef = useRef(0);
  const typingStopTimerRef = useRef(null);
  const socketRef = useRef(null);

  const { token, user } = getSession();
  const userName = user?.username || user?.email || "User";
  const userId = getUserId(user);

  const chatPartnerId = useMemo(
    () => activeChatUser?.id || activeChatUser?._id || null,
    [activeChatUser]
  );

  const activeChatOnline = chatPartnerId
    ? Boolean(onlineStatuses[String(chatPartnerId)])
    : false;

  const roomId = useMemo(() => {
    if (!chatPartnerId || !userId) return "";
    return [String(chatPartnerId), String(userId)].sort().join(":");
  }, [chatPartnerId, userId]);

  const moodThemeEnabled = safeStorageGet(MOOD_THEME_TOGGLE_KEY, "true") !== "false";
  const typingEmotionEnabled =
    safeStorageGet(TYPING_EMOTION_TOGGLE_KEY, "true") !== "false";
  const reactionSoundEnabled =
    safeStorageGet(REACTION_SOUND_TOGGLE_KEY, "true") !== "false";

  const levelInfo = useMemo(() => deriveLevel(xpState.xp), [xpState]);
  const friendshipInsight = chatPartnerId
    ? friendshipStats[String(chatPartnerId)]
    : null;
  const partnerTasks = chatPartnerId ? aiTasks[String(chatPartnerId)] || [] : [];
  const unlockedAchievementCount = Object.keys(achievements).length;

  const moodResult = useMemo(
    () =>
      moodThemeEnabled
        ? analyzeConversationMood(messages)
        : { mood: "neutral", confidence: 0 },
    [messages, moodThemeEnabled]
  );

  const outgoingTonePreview = useMemo(() => {
    if (!text.trim() || text.trim().startsWith("/")) {
      return { rewritten: "", reason: "" };
    }
    return generateTonePreview({ draft: text, tone: toneMode });
  }, [text, toneMode]);

  const handleContactsLoaded = useCallback((contactIds) => {
    if (!Array.isArray(contactIds) || contactIds.length === 0) return;
    socketRef.current?.emit("request_presence", { userIds: contactIds });
  }, []);

  const unlockAchievementsForEvent = useCallback(
    (overrides = {}) => {
      const result = evaluateAchievements({
        achievements,
        xp: overrides.xp ?? xpState.xp,
        friendshipInsight: overrides.friendshipInsight ?? friendshipInsight,
        createdPoll: Boolean(overrides.createdPoll),
        createdMiniGame: Boolean(overrides.createdMiniGame),
        reactionAdded: Boolean(overrides.reactionAdded),
        sentMessage: Boolean(overrides.sentMessage),
      });

      if (result.newlyUnlocked.length === 0) return;

      setAchievements(result.achievements);

      const firstUnlock = getAchievementMeta(result.newlyUnlocked[0]);
      if (!firstUnlock) return;

      setAchievementToast(
        result.newlyUnlocked.length > 1
          ? `Achievement unlocked: ${firstUnlock.label}. Reward: ${firstUnlock.rewardLabel} (+${result.newlyUnlocked.length - 1} more)`
          : `Achievement unlocked: ${firstUnlock.label}. Reward: ${firstUnlock.rewardLabel}`
      );
    },
    [achievements, friendshipInsight, xpState.xp]
  );

  const handleSelectChatUser = useCallback(
    (nextUser) => {
      setSafetyWarning(null);
      setShowSafetyWhy(false);
      setDismissedIntentChips({});
      setIsSidebarOpen(false);
      setActiveChatUser(nextUser);
    },
    [setActiveChatUser]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (!typingMetricsRef.current.lastTimestamp) {
      typingMetricsRef.current.lastTimestamp = Date.now();
    }
  }, []);

  const refreshSummary = useCallback(
    async (forceRefresh = false) => {
      if (!roomId || messages.length === 0) {
        setSummaryState((prev) => ({ ...prev, summary: "No summary yet." }));
        return;
      }

      setSummaryState((prev) => ({ ...prev, loading: true }));

      try {
        const result = await getConversationSummary({
          roomId,
          messages,
          activeChatUser,
          forceRefresh,
        });

        setSummaryState({
          loading: false,
          summary: result.summary || "No summary generated.",
          source: result.source,
          updatedAt: result.updatedAt,
        });
      } catch {
        setSummaryState((prev) => ({
          ...prev,
          loading: false,
          summary: "Unable to summarize conversation right now.",
        }));
      }
    },
    [activeChatUser, messages, roomId]
  );

  useEffect(() => {
    if (!roomId || messages.length === 0) return;

    const timer = setTimeout(() => refreshSummary(false), 0);
    return () => clearTimeout(timer);
  }, [refreshSummary, roomId, messages.length]);

  useEffect(() => {
    if (!userId || !token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register");
      setIsConnected(true);
    });

    socket.on("private_message", (incoming) => {
      const normalized = normalizeMessage(incoming);

      setMessages((prev) => {
        const next = [...prev, normalized];

        if (String(normalized.fromUserId || normalized.from) === String(chatPartnerId)) {
          setSmartReplies(buildSmartReplies({ messages: next, activeChatUser }));

          const scam = detectScamSignals(normalized.message || "");
          if (scam) {
            setSafetyWarning({ ...scam, messageId: normalized.localId });
            setShowSafetyWhy(false);
          }
        }

        return next;
      });
    });

    socket.on("message_reaction", ({ messageId, emoji, userId: reactorUserId, action }) => {
      if (!messageId || !emoji || !reactorUserId) return;

      setMessages((prev) =>
        prev.map((entry) => {
          if (entry.localId !== messageId) return entry;

          const reactions = { ...(entry.reactions || {}) };
          const set = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);

          if (action === "remove") set.delete(String(reactorUserId));
          else set.add(String(reactorUserId));

          reactions[emoji] = [...set];
          return { ...entry, reactions };
        })
      );
    });

    socket.on("secret_unlock", ({ messageId, userId: unlockerId }) => {
      if (!messageId || !unlockerId) return;

      if (String(unlockerId) === String(userId)) {
        setUnlockedSecrets((prev) => ({ ...prev, [messageId]: true }));
      }
    });

    socket.on("presence_update", ({ userId: presenceUserId, status }) => {
      if (!presenceUserId) return;

      setOnlineStatuses((prev) => ({
        ...prev,
        [String(presenceUserId)]: status === "online",
      }));
    });

    socket.on("presence_snapshot", (snapshot) => {
      if (!Array.isArray(snapshot)) return;

      setOnlineStatuses((prev) => {
        const next = { ...prev };

        snapshot.forEach(({ userId: presenceUserId, status }) => {
          if (presenceUserId) {
            next[String(presenceUserId)] = status === "online";
          }
        });

        return next;
      });
    });

    socket.on("typing_metadata", (payload) => {
      if (!payload || String(payload.fromUserId) !== String(chatPartnerId)) return;

      const label = !typingEmotionEnabled
        ? "typing..."

        ? "typing…"
        : classifyTypingEmotion(payload.metadata || {}).label;

      setTypingState({ label, expiresAt: Date.now() + 2200 });
    });

    socket.on("typing_stop", ({ fromUserId }) => {
      if (String(fromUserId) === String(chatPartnerId)) {
        setTypingState(null);
      }
    });

    socket.on("poll_vote", ({ messageId, optionId, voterId }) => {
      if (!messageId || !optionId || !voterId) return;
      setMessages((prev) =>
        prev.map((entry) =>
          entry.localId === messageId
            ? (() => {
                const updated = applyPollVote(entry, { optionId, voterId });
                const uniqueVoters = new Set(
                  (updated?.poll?.options || []).flatMap((option) => option.votes || [])
                ).size;
                return uniqueVoters >= 2 ? closePoll(updated) : updated;
              })()
            : entry
        )
      );
    });

    socket.on("mini_game_attempt", ({ messageId, playerId, choice }) => {
      if (!messageId || !playerId || !choice) return;
      setMessages((prev) =>
        prev.map((entry) =>
          entry.localId === messageId
            ? (() => {
                const updated = applyMiniGameAttempt(entry, { playerId, choice });
                const attemptsCount = Object.keys(updated?.miniGame?.attempts || {}).length;
                return attemptsCount >= 2 ? resolveMiniGameWinner(updated) : updated;
              })()
            : entry
        )
      );
    });

    socket.on("whiteboard_sync", (payload) => {
      if (!payload || String(payload.fromUserId) !== String(chatPartnerId)) return;
      setRemoteWhiteboardStrokes((prev) => {
        const existingIndex = prev.findIndex((entry) => entry?.stroke?.id === payload?.stroke?.id);
        if (existingIndex >= 0) {
          return prev.map((entry, index) => (index === existingIndex ? payload : entry));
        }
        return [...prev, payload].slice(-24);
      });
    });

    socket.on("disconnect", () => setIsConnected(false));
    socket.connect();

    return () => {
      [
        "connect",
        "private_message",
        "message_reaction",
        "secret_unlock",
        "presence_update",
        "presence_snapshot",
        "typing_metadata",
        "typing_stop",
        "poll_vote",
        "mini_game_attempt",
        "whiteboard_sync",
        "disconnect",
      ].forEach((eventName) => socket.off(eventName));

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, userId, chatPartnerId, typingEmotionEnabled, activeChatUser]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      if (!chatPartnerId) {
        setMessages([]);
        return;
      }

      try {
        const data = await fetchChatHistory(userId, chatPartnerId);
        if (!mounted) return;

        const normalized = (data.messages || []).map((entry, i) =>
          normalizeMessage(entry, i)
        );

        setMessages(normalized);
        setSmartReplies(buildSmartReplies({ messages: normalized, activeChatUser }));

        const lastIncoming = [...normalized]
          .reverse()
          .find(
            (entry) => String(entry.fromUserId || entry.from) === String(chatPartnerId)
          );

        if (lastIncoming) {
          const scam = detectScamSignals(lastIncoming.message || "");
          if (scam) {
            setSafetyWarning({ ...scam, messageId: lastIncoming.localId });
            setShowSafetyWhy(false);
          }
        }
      } catch {
        if (mounted) setMessages([]);
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [chatPartnerId, userId, activeChatUser]);

  useEffect(() => {
    if (!typingState) return;

    const timer = setTimeout(() => {
      if (typingState.expiresAt <= Date.now()) {
        setTypingState(null);
      }
    }, 2300);

    return () => clearTimeout(timer);
  }, [typingState]);

  const isOwnMessage = useCallback(
    (messageData) => {
      const senderId = messageData.fromUserId || messageData.senderId || messageData.from;

      return (
        messageData.self === true ||
        String(senderId) === String(userId) ||
        messageData.from === userName
      );
    },
    [userId, userName]
  );

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !isConnected || !chatPartnerId) return;

    if (text.trim().startsWith("/")) {
      const result = await executeAssistantCommand({
        input: text.trim(),
        roomId,
        messages,
        activeChatUser,
      });

      const assistantMessage = {
        localId: `assistant-${Date.now()}`,
        from: "assistant",
        fromUserId: "assistant",
        toUserId: userId,
        to: userId,
        message: result.text,
        timestamp: Date.now(),
        type: "assistant",
        reactions: {},
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (result.summary) {
        setSummaryState({
          loading: false,
          summary: result.summary.summary,
          source: result.summary.source,
          updatedAt: result.summary.updatedAt,
        });
      }

      setText("");
      setCommandSuggestions([]);
      return;
    }

    const now = Date.now();
    const localId = `${String(userId)}-${String(chatPartnerId)}-${now}`;
    const outgoingText = outgoingTonePreview.rewritten || text.trim();

    const payload = {
      localId,
      from: userName,
      fromUserId: userId,
      toUserId: chatPartnerId,
      to: chatPartnerId,
      message: outgoingText,
      timestamp: now,
      type: secretMode ? "secret" : "text",
      secret: secretMode
        ? {
            challenge: String(Math.floor(Math.random() * 9000) + 1000),
            hint: "Enter the 4-digit unlock code",
            oneTime: true,
          }
        : undefined,
      reactions: {},
    };

    socketRef.current?.emit("private_message", payload);
    setMessages((prev) => [...prev, { ...payload, self: true }]);

    const xpUpdate = awardMessageXp();
    setXpState(xpUpdate);
    const nextFriendshipStats = updateFriendshipInteraction({
      partnerId: String(chatPartnerId),
    });
    const nextFriendshipInsight = nextFriendshipStats[String(chatPartnerId)];
    setFriendshipStats(nextFriendshipStats);
    if (xpUpdate.awardedXp > 0) {
      setGamificationToast(
        xpUpdate.leveledUp
          ? `Level up! You reached Level ${deriveLevel(xpUpdate.xp).level}.`
          : `+${xpUpdate.awardedXp} XP earned`
      );
    }
    unlockAchievementsForEvent({
      sentMessage: true,
      xp: xpUpdate.xp,
      friendshipInsight: nextFriendshipInsight,
    });

    socketRef.current?.emit("typing_stop", { toUserId: chatPartnerId });

    setText("");
    setSecretMode(false);
    setCommandSuggestions([]);
    inputRef.current?.focus();
  }, [
    activeChatUser,
    chatPartnerId,
    isConnected,
    messages,
    unlockAchievementsForEvent,
    roomId,
    secretMode,
    text,
    userId,
    userName,
    outgoingTonePreview,
  ]);

  const applyReaction = useCallback(
    (message, emoji) => {
      const messageId = message.localId;
      const mine =
        Array.isArray(message.reactions?.[emoji]) &&
        message.reactions[emoji].includes(String(userId));

      const action = mine ? "remove" : "add";

      setMessages((prev) =>
        prev.map((entry) => {
          if (entry.localId !== messageId) return entry;

          const reactions = { ...(entry.reactions || {}) };
          const set = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);

          if (action === "remove") set.delete(String(userId));
          else set.add(String(userId));

          reactions[emoji] = [...set];
          return { ...entry, reactions };
        })
      );

      socketRef.current?.emit("message_reaction", {
        toUserId: chatPartnerId,
        messageId,
        emoji,
        action,
      });

      if (action === "add") {
        unlockAchievementsForEvent({ reactionAdded: true });
      }

      setReactionPulseId(messageId);
      setTimeout(() => setReactionPulseId(null), 250);

      if (reactionSoundEnabled) {
        try {
          playReactionSound();
        } catch {
          // ignore audio errors
        }
      }
    },
    [chatPartnerId, reactionSoundEnabled, unlockAchievementsForEvent, userId]

    [chatPartnerId, reactionSoundEnabled, userId]
  );

  const unlockSecret = useCallback(
    (message) => {
      const code = window.prompt(message?.secret?.hint || "Enter unlock code");
      if (!code) return;

      if (String(code).trim() !== String(message.secret?.challenge || "")) {
        alert("Incorrect code.");
        return;
      }

      setUnlockedSecrets((prev) => ({ ...prev, [message.localId]: true }));
      socketRef.current?.emit("secret_unlock", {
        toUserId: chatPartnerId,
        messageId: message.localId,
      });
    },
    [chatPartnerId]
  );

  const hasViewedSecretBody = useCallback(
    (message) => {
      if (!message?.secret?.oneTime) return false;
      return Boolean(secretViewed[message.localId]);

  const revealSecretBody = useCallback(
    (message) => {
      if (!message?.secret?.oneTime) return true;
      if (secretViewed[message.localId]) return false;

      setSecretViewed((prev) => ({ ...prev, [message.localId]: true }));
      return true;
    },
    [secretViewed]
  );

  const revealSecretBody = useCallback((message) => {
    if (!message?.secret?.oneTime) return;

    setSecretViewed((prev) => {
      if (prev[message.localId]) return prev;
      return { ...prev, [message.localId]: true };
    });
  }, []);

  const handleTypingInput = useCallback(
    (value) => {
      const now = Date.now();
      const prev = typingMetricsRef.current;
      const added = Math.max(0, value.length - prev.lastValue.length);
      const removed = Math.max(0, prev.lastValue.length - value.length);
      const interval = now - prev.lastTimestamp;

      const newChunk = added > 0 ? value.slice(-added) : "";
      const punctuationDelta = (newChunk.match(/[!?.,;:]/g) || []).length;
      const capsDelta = (newChunk.match(/[A-Z]/g) || []).length;
      const alphaDelta = (newChunk.match(/[A-Za-z]/g) || []).length;

      prev.lastValue = value;
      prev.lastTimestamp = now;

      if (value.startsWith("/")) {
        setCommandSuggestions(getCommandSuggestions(value));
        setActiveCommandIndex(0);
      } else {
        setCommandSuggestions([]);
      }

      if (!chatPartnerId || !socketRef.current) return;

      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);

      typingStopTimerRef.current = setTimeout(() => {
        socketRef.current?.emit("typing_stop", { toUserId: chatPartnerId });
      }, 1600);

      if (now - typingEmitCooldownRef.current < 750) return;
      typingEmitCooldownRef.current = now;

      socketRef.current.emit("typing_metadata", {
        toUserId: chatPartnerId,
        metadata: buildTypingMetadata({
          charDelta: added,
          intervalMs: interval,
          backspaceDelta: removed,
          pauseMs: interval,
          punctuationDelta,
          capsDelta,
          alphaDelta,
        }),
      });
    },
    [chatPartnerId]
  );

  const submitPoll = useCallback(
    ({ question, options }) => {
      if (!chatPartnerId || !isConnected) return;

      if (!question || !Array.isArray(options) || options.length < 2) {
        alert("Add a poll question and at least 2 options.");
        return;
      }

      const base = buildPollMessage({ userId, chatPartnerId, question, options });
      const payload = {
        ...base,
        from: userName,
        fromUserId: userId,
        to: chatPartnerId,
        toUserId: chatPartnerId,
        self: true,
      };

      socketRef.current?.emit("private_message", payload);
      setMessages((prev) => [...prev, payload]);
      unlockAchievementsForEvent({ createdPoll: true });
    },
    [chatPartnerId, isConnected, unlockAchievementsForEvent, userId, userName]
  );

  const sendMiniGame = useCallback(() => {
    if (!chatPartnerId || !isConnected) return;

    const base = buildMiniGameMessage({ userId, chatPartnerId });
    const payload = {
      ...base,
      from: userName,
      fromUserId: userId,
      to: chatPartnerId,
      toUserId: chatPartnerId,
      self: true,
    };

    socketRef.current?.emit("private_message", payload);
    setMessages((prev) => [...prev, payload]);
    unlockAchievementsForEvent({ createdMiniGame: true });
  }, [chatPartnerId, isConnected, unlockAchievementsForEvent, userId, userName]);

  const sendVoiceNote = useCallback(
    async ({
      audioDataUrl,
      mimeType,
      durationMs,
      transcript,
      emotionTag,
      waveform,
      previewText,
    }) => {
      if (!chatPartnerId || !isConnected || !audioDataUrl) return;

      const now = Date.now();
      const localId = `voice-${String(userId)}-${String(chatPartnerId)}-${now}`;
      const searchableText =
        transcript.trim() || previewText || getVoiceTranscriptPreview("");

      const payload = {
        localId,
        from: userName,
        fromUserId: userId,
        to: chatPartnerId,
        toUserId: chatPartnerId,
        message: searchableText,
        timestamp: now,
        type: "voice_note",
        voiceNote: {
          audioDataUrl,
          mimeType,
          durationMs,
          transcript: transcript.trim(),
          emotionTag,
          waveform: Array.isArray(waveform) ? waveform : [],
        },
        reactions: {},
        self: true,
      };

      socketRef.current?.emit("private_message", payload);
      setMessages((prev) => [...prev, payload]);

      const xpUpdate = awardMessageXp();
      setXpState(xpUpdate);
      const nextFriendshipStats = updateFriendshipInteraction({
        partnerId: String(chatPartnerId),
      });
      const nextFriendshipInsight = nextFriendshipStats[String(chatPartnerId)];
      setFriendshipStats(nextFriendshipStats);

      if (xpUpdate.awardedXp > 0) {
        setGamificationToast(
          xpUpdate.leveledUp
            ? `Level up! You reached Level ${deriveLevel(xpUpdate.xp).level}.`
            : `+${xpUpdate.awardedXp} XP earned`
        );
      }

      unlockAchievementsForEvent({
        sentMessage: true,
        xp: xpUpdate.xp,
        friendshipInsight: nextFriendshipInsight,
      });
    },
    [chatPartnerId, isConnected, unlockAchievementsForEvent, userId, userName]
  );

  const syncWhiteboardStroke = useCallback(
    (payload) => {
      if (!payload || !chatPartnerId) return;
      socketRef.current?.emit("whiteboard_sync", {
        ...payload,
        toUserId: chatPartnerId,
        fromUserId: userId,
      });
    },
    [chatPartnerId, userId]
  );

  const sendWhiteboard = useCallback(
    async ({ snapshotDataUrl, strokes }) => {
      if (!chatPartnerId || !isConnected || !snapshotDataUrl) return;

      const payload = {
        ...buildWhiteboardMessage({
          userId,
          chatPartnerId,
          userName,
          snapshotDataUrl,
          strokes,
        }),
        self: true,
      };

      socketRef.current?.emit("private_message", payload);
      setMessages((prev) => [...prev, payload]);
      setIsWhiteboardOpen(false);
      setRemoteWhiteboardStrokes([]);

      const xpUpdate = awardMessageXp();
      setXpState(xpUpdate);
      const nextFriendshipStats = updateFriendshipInteraction({
        partnerId: String(chatPartnerId),
      });
      const nextFriendshipInsight = nextFriendshipStats[String(chatPartnerId)];
      setFriendshipStats(nextFriendshipStats);

      if (xpUpdate.awardedXp > 0) {
        setGamificationToast(
          xpUpdate.leveledUp
            ? `Level up! You reached Level ${deriveLevel(xpUpdate.xp).level}.`
            : `+${xpUpdate.awardedXp} XP earned`
        );
      }

      unlockAchievementsForEvent({
        sentMessage: true,
        xp: xpUpdate.xp,
        friendshipInsight: nextFriendshipInsight,
      });
    },
    [chatPartnerId, isConnected, unlockAchievementsForEvent, userId, userName]
  );

  const votePoll = useCallback(
    (messageId, optionId) => {
      if (!messageId || !optionId) return;

      setMessages((prev) =>
        prev.map((entry) =>
          entry.localId === messageId
            ? (() => {
                const updated = applyPollVote(entry, { optionId, voterId: userId });
                const uniqueVoters = new Set(
                  (updated?.poll?.options || []).flatMap((option) => option.votes || [])
                ).size;
                return uniqueVoters >= 2 ? closePoll(updated) : updated;
              })()
            : entry
        )
      );

      socketRef.current?.emit("poll_vote", {
        toUserId: chatPartnerId,
        messageId,
        optionId,
        voterId: userId,
      });
    },
    [chatPartnerId, userId]
  );

  const submitMiniGameAttempt = useCallback(
    (messageId, choice) => {
      if (!messageId || !choice) return;

      setMessages((prev) =>
        prev.map((entry) =>
          entry.localId === messageId
            ? (() => {
                const updated = applyMiniGameAttempt(entry, { playerId: userId, choice });
                const attemptsCount = Object.keys(updated?.miniGame?.attempts || {}).length;
                return attemptsCount >= 2 ? resolveMiniGameWinner(updated) : updated;
              })()
            : entry
        )
      );

      socketRef.current?.emit("mini_game_attempt", {
        toUserId: chatPartnerId,
        messageId,
        playerId: userId,
        choice,
      });
    },
    [chatPartnerId, userId]
  );

  const shouldShowAvatar = (list, index) => {
    if (index === 0) return true;

    const current = list[index];
    const previous = list[index - 1];
    if (!current || !previous) return true;

    const currentSender = current.from || current.sender;
    const previousSender = previous.from || previous.sender;
    return currentSender !== previousSender;
  };

  const shouldGroupMessages = (list, index) => {
    if (index === 0) return false;

    const current = list[index];
    const previous = list[index - 1];
    if (!current || !previous) return false;

    const currentSender = current.from || current.sender;
    const previousSender = previous.from || previous.sender;
    const sameSender = currentSender === previousSender;

    const currentTs = Number(current.timestamp || 0);
    const previousTs = Number(previous.timestamp || 0);
    const withinFiveMinutes = Math.abs(currentTs - previousTs) < 300000;

    return sameSender && withinFiveMinutes;
  };

  const getInitials = (name = "") => {
    const parts = String(name).split(" ").filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0] || "?").slice(0, 2).toUpperCase();

  };

  const getAvatarColor = (name = "") => {
    const colors = ["#0084ff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7"];
    return colors[name.charCodeAt(0) % colors.length] || colors[0];
  };

  const getMessageIntentChips = (messageData) => {
    const intents = detectIntentActions(messageData?.message || "");
    const hidden = dismissedIntentChips[messageData?.localId] || {};
    return intents.filter((intent) => !hidden[intent.key]);
  };

  const dismissIntentChip = (messageId, intentKey) => {
    setDismissedIntentChips((prev) => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || {}),
        [intentKey]: true,
      },
    }));
  };

  const getAvatarColor = (name = "") => {
    const colors = ["#0084ff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7"];
    return colors[name.charCodeAt(0) % colors.length] || colors[0];
  };

  const getMessageIntentChips = (messageData) => {
    const intents = detectIntentActions(messageData?.message || "");
    const hidden = dismissedIntentChips[messageData?.localId] || {};
    return intents.filter((intent) => !hidden[intent.key]);
  };

  const dismissIntentChip = useCallback((messageId, intentKey) => {
    setDismissedIntentChips((prev) => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || {}),
        [intentKey]: true,
      },
    }));
  }, []);

  const pushAssistantNotice = useCallback((textValue) => {
    const assistantMessage = {
      localId: `assistant-${Date.now()}`,
      from: "assistant",
      fromUserId: "assistant",
      toUserId: userId,
      to: userId,
      message: textValue,
      timestamp: Date.now(),
      type: "assistant",
      reactions: {},
    };

    setMessages((prev) => [...prev, assistantMessage]);
  }, [userId]);

  const handleIntentAction = useCallback(
    (messageData, intent) => {
      if (!messageData?.localId || !intent?.key) return;

      const messageText = String(messageData.message || "");

      if (intent.key === "schedule") {
        const when = extractScheduleHint(messageText) || "Follow up";
        const title = `Chat follow-up with ${activeChatUser?.username || activeChatUser?.email || "contact"}`;
        const details = `Reminder from chat:\n\n${messageText}`;
        const calendarUrl =
          `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}` +
          `&details=${encodeURIComponent(details)}`;
        window.open(calendarUrl, "_blank", "noopener,noreferrer");
        setAiTasks(
          addAiTask({
            partnerId: chatPartnerId,
            text: when ? `${messageText} (${when})` : messageText,
            source: "schedule",
            metadata: { messageId: messageData.localId, when },
          })
        );
        pushAssistantNotice(`Opened a calendar draft for: ${when}.`);
      }

      if (intent.key === "location") {
        const query = extractLocationQuery(messageText);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || messageText)}`;
        window.open(mapsUrl, "_blank", "noopener,noreferrer");
        pushAssistantNotice(`Opened maps search for: ${query || "shared location"}.`);
      }

      if (intent.key === "files") {
        const followUp = "Can you send the file or attachment here so I can review it?";
        setText(followUp);
        inputRef.current?.focus();
        setAiTasks(
          addAiTask({
            partnerId: chatPartnerId,
            text: "Request the missing file or attachment",
            source: "files",
            metadata: { messageId: messageData.localId },
          })
        );
        pushAssistantNotice("Prepared a file request follow-up in the composer.");
      }

      if (intent.key === "payment") {
        setAiTasks(
          addAiTask({
            partnerId: chatPartnerId,
            text: "Verify payment request before sending money",
            source: "payment",
            metadata: { messageId: messageData.localId },
          })
        );
        pushAssistantNotice(
          "Payment verification checklist:\n- Confirm the requester identity.\n- Verify the amount and purpose.\n- Avoid sending codes, PINs, or bank details in chat."
        );
      }

      dismissIntentChip(messageData.localId, intent.key);
    },
    [activeChatUser, chatPartnerId, dismissIntentChip, pushAssistantNotice]
  );

  const handleToggleAiTask = useCallback(
    (taskId) => {
      if (!chatPartnerId) return;
      setAiTasks(toggleAiTask({ partnerId: chatPartnerId, taskId }));
    },
    [chatPartnerId]
  );

  const handleRemoveAiTask = useCallback(
    (taskId) => {
      if (!chatPartnerId) return;
      setAiTasks(removeAiTask({ partnerId: chatPartnerId, taskId }));
    },
    [chatPartnerId]
  );

  const handleLogout = useCallback(() => {
    clearSession();
    socketRef.current?.disconnect();
    window.location.href = "/login";
  }, []);

  const handleSettings = useCallback(() => {
    window.location.href = "/settings";
  }, []);

  const closeDrawers = useCallback(() => {
    setIsSidebarOpen(false);
    setIsAssistantOpen(false);
  }, []);

  const handleSelectSearchResult = useCallback((messageId) => {
    if (!messageId) return;
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
    }, 2200);
  }, []);

  useEffect(() => {
    if (!gamificationToast) return;
    const timer = setTimeout(() => setGamificationToast(null), 2400);
    return () => clearTimeout(timer);
  }, [gamificationToast]);

  useEffect(() => {
    if (!achievementToast) return;
    const timer = setTimeout(() => setAchievementToast(null), 2800);
    return () => clearTimeout(timer);
  }, [achievementToast]);

  return (
    <div
      className={`chat-app ${
        moodThemeEnabled ? `mood-${moodResult.mood}` : "mood-neutral"
      }`}
    >
      {moodThemeEnabled && ["romantic", "happy"].includes(moodResult.mood) ? (
        <div className="mood-particles" aria-hidden="true" />
      ) : null}

      {gamificationToast ? (
        <div className="gamification-toast">{gamificationToast}</div>
      ) : null}

      {achievementToast ? (
        <div className="achievement-toast">{achievementToast}</div>
      ) : null}

      <div className="chat-container">
        <aside className="app-rail">
          <div className="rail-top">
            <button type="button" className="rail-button active" aria-label="Chats">
              <MessageCircle size={18} />
            </button>
            <button type="button" className="rail-button" aria-label="Contacts">
              <Users size={18} />
            </button>
            <button type="button" className="rail-button" aria-label="Files">
              <Folder size={18} />

      <div className="chat-container">
        <aside className="app-rail">
          <div className="rail-top">
            <button className="rail-button active" aria-label="Chats">
              💬
            </button>
            <button className="rail-button" aria-label="Contacts">
              👥
            </button>
            <button className="rail-button" aria-label="Files">
              📁
            </button>
          </div>

          <div className="rail-bottom">
            <button
              type="button"
              className="rail-button"
              onClick={handleSettings}
              aria-label="Settings"
            >
              <SettingsIcon size={18} />
            </button>
            <button
              type="button"
              className="rail-button"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <ArrowLeft size={18} />

              className="rail-button"
              onClick={() => (window.location.href = "/settings")}
              aria-label="Settings"
            >
              ⚙️
            </button>
            <button
              className="rail-button"
              onClick={() => {
                clearSession();
                socketRef.current?.disconnect();
                window.location.href = "/login";
              }}
              aria-label="Logout"
            >
              ↩
            </button>
          </div>
        </aside>

        <button
          type="button"
          className={`drawer-overlay ${isSidebarOpen ? "is-visible" : ""}`}
          aria-label="Close conversations"
          onClick={closeDrawers}
        />
        <button
          type="button"
          className={`drawer-overlay drawer-overlay--assistant ${
            isAssistantOpen ? "is-visible" : ""
          }`}
          aria-label="Close assistant"
          onClick={closeDrawers}
        />

        <div className={`contact-list-sidebar ${isSidebarOpen ? "is-drawer-open" : ""}`}>
          <ContactList
            onSelect={handleSelectChatUser}
            activeChatUser={activeChatUser}
            onContactsLoaded={handleContactsLoaded}
            onlineStatuses={onlineStatuses}
          />
        </div>

        <div className="chat-main">
          <ChatHeader
            activeChatUser={activeChatUser}
            activeChatOnline={activeChatOnline}
            typingState={typingState}
            xpState={xpState}
            levelInfo={levelInfo}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            onLogout={handleLogout}
            onSettings={handleSettings}
            onOpenSidebar={() => {
              setIsAssistantOpen(false);
              setIsSidebarOpen(true);
            }}
            onOpenAssistant={() => {
              setIsSidebarOpen(false);
              setIsAssistantOpen(true);
            }}
          />

          {safetyWarning ? (
            <div className={`safety-warning-banner ${safetyWarning.level}`}>
              <div>
                <strong>{safetyWarning.title}</strong>
                <p>Be careful before sharing sensitive data or sending payments.</p>
                <button
                  className="safety-why-btn"
                  onClick={() => setShowSafetyWhy((prev) => !prev)}
                >
                  {showSafetyWhy ? "Hide why" : "Why this warning?"}
                </button>

                {showSafetyWhy ? (
                  <ul>
                    {safetyWarning.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <button className="safety-dismiss-btn" onClick={() => setSafetyWarning(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          {activeChatUser ? (
            <FriendshipPanel
              friendshipInsight={friendshipInsight}
              contactName={activeChatUser?.username || activeChatUser?.email || "this contact"}
            />
          ) : null}

          <MessageTimeline
            activeChatUser={activeChatUser}
            messages={messages}
            userId={userId}
            isOwnMessage={isOwnMessage}
            shouldGroupMessages={shouldGroupMessages}
            shouldShowAvatar={shouldShowAvatar}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            unlockedSecrets={unlockedSecrets}
            reactionPulseId={reactionPulseId}
            highlightedMessageId={highlightedMessageId}
            unlockSecret={unlockSecret}
            hasViewedSecretBody={hasViewedSecretBody}
            revealSecretBody={revealSecretBody}
            votePoll={votePoll}
            submitMiniGameAttempt={submitMiniGameAttempt}
            toTime={toTime}
            applyReaction={applyReaction}
            getMessageIntentChips={getMessageIntentChips}
            onIntentAction={handleIntentAction}
            messagesEndRef={messagesEndRef}
          />

          <MessageComposer
            activeChatUser={activeChatUser}
            text={text}
            smartReplies={smartReplies}
            setText={setText}
            outgoingTonePreview={outgoingTonePreview}
            toneMode={toneMode}
            setToneMode={setToneMode}
            commandSuggestions={commandSuggestions}
            activeCommandIndex={activeCommandIndex}
            setCommandSuggestions={setCommandSuggestions}
            inputRef={inputRef}
            submitPoll={submitPoll}
            sendMiniGame={sendMiniGame}
            sendVoiceNote={sendVoiceNote}
            isWhiteboardOpen={isWhiteboardOpen}
            setIsWhiteboardOpen={(nextOpen) => {
              setIsWhiteboardOpen(nextOpen);
              if (!nextOpen) {
                setRemoteWhiteboardStrokes([]);
              }
            }}
            sendWhiteboard={sendWhiteboard}
            remoteWhiteboardStrokes={remoteWhiteboardStrokes}
            syncWhiteboardStroke={syncWhiteboardStroke}
            isConnected={isConnected}
            secretMode={secretMode}
            setSecretMode={setSecretMode}
            handleTypingInput={handleTypingInput}
            setActiveCommandIndex={setActiveCommandIndex}
            sendMessage={sendMessage}
          />
        </div>

        <div className={`chat-details-shell ${isAssistantOpen ? "is-drawer-open" : ""}`}>
        <AssistantRail
          activeChatUser={activeChatUser}
          getAvatarColor={getAvatarColor}
          getInitials={getInitials}
          moodThemeEnabled={moodThemeEnabled}
          moodResult={moodResult}
          summaryState={summaryState}
          refreshSummary={refreshSummary}
          toTime={toTime}
          smartReplies={smartReplies}
          friendshipInsight={friendshipInsight}
          friendshipStatsMap={friendshipStats}
          messages={messages}
          savedTasks={partnerTasks}
          achievements={achievements}
          achievementDefinitions={ACHIEVEMENT_DEFINITIONS}
          unlockedAchievementCount={unlockedAchievementCount}
          onToggleTask={handleToggleAiTask}
          onRemoveTask={handleRemoveAiTask}
          onSelectSearchResult={handleSelectSearchResult}
        />

          <div className="chat-header">
            <div className="header-left">
              <div className="avatar-container">
                <div
                  className="avatar"
                  style={{
                    backgroundColor: getAvatarColor(
                      activeChatUser?.username || activeChatUser?.email || "Chat"
                    ),
                  }}
                >
                  <span>
                    {activeChatUser
                      ? getInitials(activeChatUser.username || activeChatUser.email)
                      : "?"}
                  </span>
                </div>
                {activeChatUser && activeChatOnline && <div className="online-indicator" />}
              </div>

              <div className="header-info">
                <h2>{activeChatUser?.username || activeChatUser?.email || "Select User"}</h2>

                {/* ✅ KEEP XP BADGE */}
                <XpBadge xpState={xpState} levelInfo={levelInfo} />

                <p className="status-text">
                  {!activeChatUser ? "Select a contact" : activeChatOnline ? "Online" : "Offline"}
                </p>

                {activeChatUser && typingState?.label ? (
                  <p className="typing-emotion-indicator">{typingState.label}</p>
                ) : null}
              </div>
            </div>

            <div className="header-actions">
              <button
                className="icon-button"
                onClick={() => {
                  clearSession();
                  socketRef.current?.disconnect();
                  window.location.href = "/login";
                }}
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              <button
                className="icon-button"
                onClick={() => (window.location.href = "/settings")}
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          {safetyWarning ? (
            <div className={`safety-warning-banner ${safetyWarning.level}`}>
              <div>
                <strong>{safetyWarning.title}</strong>
                <p>Be careful before sharing sensitive data or sending payments.</p>
                <button
                  className="safety-why-btn"
                  onClick={() => setShowSafetyWhy((prev) => !prev)}
                >
                  {showSafetyWhy ? "Hide why" : "Why this warning?"}
                </button>

                {showSafetyWhy ? (
                  <ul>
                    {safetyWarning.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <button className="safety-dismiss-btn" onClick={() => setSafetyWarning(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          {/* ✅ KEEP FRIENDSHIP PANEL */}
          {activeChatUser ? <FriendshipPanel friendshipInsight={friendshipInsight} /> : null}

          <div className="messages-container">
            <div className="messages-wrapper">
              {!activeChatUser ? (
                <div className="empty-state">
                  <div className="empty-icon">👤</div>
                  <h3>Select a user to chat</h3>
                  <p>Choose a contact from the sidebar to start messaging</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No messages yet</h3>
                  <p>Start the conversation with {activeChatUser.username || activeChatUser.email}!</p>
                </div>
              ) : (
                messages.map((messageData, i) => {
                  const own = isOwnMessage(messageData);
                  const grouped = shouldGroupMessages(messages, i);
                  const showAvatar = !own && shouldShowAvatar(messages, i);
                  const senderName = messageData.from || messageData.sender || "Anonymous";
                  const assistant =
                    messageData.type === "assistant" || senderName === "assistant";
                  const isSecret = messageData.type === "secret";
                  const canReveal = own || unlockedSecrets[messageData.localId];

                  return (
                    <div
                      key={messageData.localId || i}
                      className={`message-wrapper ${own ? "own" : "other"} ${
                        grouped ? "grouped" : ""
                      }`}
                    >
                      {showAvatar && !own ? (
                        <div
                          className="message-avatar"
                          style={{ backgroundColor: getAvatarColor(senderName) }}
                        >
                          {assistant ? <Bot size={14} /> : getInitials(senderName)}
                        </div>
                      ) : null}

                      {!showAvatar && !own ? <div className="avatar-spacer" /> : null}

                      <div className="message-content">
                        {!own && !grouped ? (
                          <div className="message-sender">{senderName}</div>
                        ) : null}

                        <div
                          className={`message-bubble ${own ? "sent" : "received"} ${
                            assistant ? "assistant-bubble" : ""
                          } ${reactionPulseId === messageData.localId ? "reaction-pulse" : ""}`}
                        >
                          {isSecret && !canReveal ? (
                            <div className="secret-preview-card">
                              <div className="secret-title">
                                <Lock size={14} /> Secret message
                              </div>
                              <p>Hidden preview. Unlock required.</p>
                              <button
                                className="secret-unlock-btn"
                                onClick={() => unlockSecret(messageData)}
                              >
                                Unlock
                              </button>
                            </div>
                          ) : (
                            <div className="message-text">
                              {messageData.type === "poll" && messageData.poll ? (
                                <PollMessage
                                  message={messageData}
                                  currentUserId={userId}
                                  onVote={votePoll}
                                />
                              ) : messageData.type === "mini_game" && messageData.miniGame ? (
                                <MiniGameMessage
                                  message={messageData}
                                  currentUserId={userId}
                                  onAttempt={submitMiniGameAttempt}
                                />
                              ) : isSecret ? (
                                revealSecretBody(messageData) ? (
                                  messageData.message
                                ) : (
                                  "Secret viewed once"
                                )
                              ) : (
                                messageData.message
                              )}
                            </div>
                          )}

                          <div className="message-footer">
                            <span className="message-time">{toTime(messageData.timestamp)}</span>
                            {own ? (
                              <span className="message-status">
                                <CheckCheck size={14} />
                              </span>
                            ) : null}
                          </div>

                          {!assistant ? (
                            <>
                              <div className="message-reactions">
                                {QUICK_REACTION_EMOJIS.map((emoji) => {
                                  const count = Array.isArray(messageData.reactions?.[emoji])
                                    ? messageData.reactions[emoji].length
                                    : 0;
                                  const mine =
                                    Array.isArray(messageData.reactions?.[emoji]) &&
                                    messageData.reactions[emoji].includes(String(userId));

                                  return (
                                    <button
                                      key={emoji}
                                      className={`reaction-chip ${mine ? "mine" : ""}`}
                                      onClick={() => applyReaction(messageData, emoji)}
                                    >
                                      <span>{emoji}</span>
                                      {count > 0 ? <small>{count}</small> : null}
                                    </button>
                                  );
                                })}
                              </div>

                              {getMessageIntentChips(messageData).length > 0 ? (
                                <div className="intent-action-chips">
                                  {getMessageIntentChips(messageData).map((intent) => (
                                    <button
                                      key={intent.key}
                                      className="intent-chip"
                                      onClick={() =>
                                        dismissIntentChip(messageData.localId, intent.key)
                                      }
                                    >
                                      {intent.label} ✕
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              {activeChatUser && !text.trim() && smartReplies.length > 0 ? (
                <div className="smart-reply-row">
                  <div className="smart-reply-title">
                    <Sparkles size={14} /> Quick replies
                  </div>
                  <div className="smart-reply-cards">
                    {smartReplies.slice(0, 5).map((reply) => (
                      <button
                        key={reply}
                        className="smart-reply-card"
                        onClick={() => setText(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {text.trim() && !text.trim().startsWith("/") ? (
                <div className="tone-preview-panel">
                  <div className="tone-preview-header">
                    <span>Auto tone converter</span>
                    <select value={toneMode} onChange={(e) => setToneMode(e.target.value)}>
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="concise">Concise</option>
                    </select>
                  </div>

                  <div className="tone-preview-grid">
                    <div>
                      <small>Original draft</small>
                      <p>{text}</p>
                    </div>
                    <div>
                      <small>Converted preview</small>
                      <p>{outgoingTonePreview.rewritten}</p>
                    </div>
                  </div>

                  <div className="tone-preview-actions">
                    <button onClick={() => setText(outgoingTonePreview.rewritten || text)}>
                      Use converted
                    </button>
                    <span>{outgoingTonePreview.reason}</span>
                  </div>
                </div>
              ) : null}

              {commandSuggestions.length > 0 ? (
                <div className="command-menu">
                  {commandSuggestions.map((cmd, index) => (
                    <button
                      key={cmd.name}
                      className={`command-item ${index === activeCommandIndex ? "active" : ""}`}
                      onClick={() => {
                        setText(`${cmd.name} `);
                        setCommandSuggestions([]);
                        inputRef.current?.focus();
                      }}
                    >
                      <span>{cmd.name}</span>
                      <small>{cmd.description}</small>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* ✅ KEEP GAMIFICATION COMPOSER */}
              <InteractiveComposer
                onSendPoll={submitPoll}
                onSendMiniGame={sendMiniGame}
                disabled={!activeChatUser || !isConnected}
              />

              <div className="message-input-wrapper">
                <button
                  className={`secret-mode-toggle ${secretMode ? "active" : ""}`}
                  onClick={() => setSecretMode((prev) => !prev)}
                  title="Secret mode"
                >
                  <Lock size={16} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    handleTypingInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (
                      commandSuggestions.length > 0 &&
                      (e.key === "ArrowDown" || e.key === "ArrowUp")
                    ) {
                      e.preventDefault();
                      setActiveCommandIndex((prev) => {
                        if (e.key === "ArrowDown") {
                          return (prev + 1) % commandSuggestions.length;
                        }
                        return prev === 0 ? commandSuggestions.length - 1 : prev - 1;
                      });
                      return;
                    }

                    if (commandSuggestions.length > 0 && e.key === "Tab") {
                      e.preventDefault();
                      const selected = commandSuggestions[activeCommandIndex];
                      if (selected) {
                        setText(`${selected.name} `);
                        setCommandSuggestions([]);
                      }
                      return;
                    }

                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    !activeChatUser
                      ? "Select a user to chat"
                      : isConnected
                      ? secretMode
                        ? "Send secret message"
                        : "Type a message or /command"
                      : "Connecting..."
                  }
                  disabled={!isConnected || !activeChatUser}
                  className="message-input"
                />

                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || !isConnected || !activeChatUser}
                  className="send-button"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="chat-details">
          <div className="details-user-card">
            <div
              className="details-avatar"
              style={{
                backgroundColor: getAvatarColor(
                  activeChatUser?.username || activeChatUser?.email || "User"
                ),
              }}
            >
              {getInitials(activeChatUser?.username || activeChatUser?.email || "U")}
            </div>

            <h3>{activeChatUser?.username || "No chat selected"}</h3>
            <p>{activeChatUser?.email || "Select a contact to view details"}</p>

            {moodThemeEnabled ? (
              <p className="chat-mood-chip">
                Mood: {moodResult.mood} · {Math.round(moodResult.confidence * 100)}%
              </p>
            ) : null}
          </div>

          <div className="details-section summary-panel">
            <div className="summary-header-row">
              <div className="details-section-header">Conversation Summary</div>
              <button
                className="summary-refresh"
                onClick={() => refreshSummary(true)}
                disabled={summaryState.loading}
              >
                <RefreshCw size={14} className={summaryState.loading ? "spinning" : ""} />
                Refresh
              </button>
            </div>

            <p className="summary-text">{summaryState.summary}</p>
            <p className="summary-meta">
              Source: {summaryState.source}
              {summaryState.updatedAt ? ` · ${toTime(summaryState.updatedAt)}` : ""}
            </p>
          </div>

          <button className="details-cta">View All</button>
        </aside>
      </div>
    </div>
    </div>
  );
}