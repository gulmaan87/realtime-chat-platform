import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Users,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import ContactList from "../components/ContactList";
import ChatHeader from "../components/chat/ChatHeader";
import MessageTimeline from "../components/chat/MessageTimeline";
import MessageComposer from "../components/chat/MessageComposer";
import AssistantRail from "../components/chat/AssistantRail";
import FriendshipPanel from "../components/chat/FriendshipPanel";
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

function safeStorageGet(key, fallback = "true") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [showFriendshipPanel, setShowFriendshipPanel] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [remoteWhiteboardStrokes, setRemoteWhiteboardStrokes] = useState([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [gamificationToast, setGamificationToast] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [xpState, setXpState] = useState(() => getStoredXpState());
  
  const { token, user } = getSession();
  const userName = user?.username || user?.email || "User";
  const userId = getUserId(user);

  const [achievements, setAchievements] = useState(() => loadAchievements());
  const [aiTasks, setAiTasks] = useState(() => loadAiTasks());
  const [friendshipStats, setFriendshipStats] = useState(() =>
    loadFriendshipStats()
  );
  
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const q = localStorage.getItem(`offline_queue_${userId}`);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [scheduledFor, setScheduledFor] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const typingMetricsRef = useRef({ lastValue: "", lastTimestamp: 0 });
  const typingEmitCooldownRef = useRef(0);
  const typingStopTimerRef = useRef(null);

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
  const typingEmotionEnabled = safeStorageGet(TYPING_EMOTION_TOGGLE_KEY, "true") !== "false";
  const reactionSoundEnabled = safeStorageGet(REACTION_SOUND_TOGGLE_KEY, "true") !== "false";

  const levelInfo = useMemo(() => deriveLevel(xpState.xp), [xpState]);
  const friendshipInsight = chatPartnerId ? friendshipStats[String(chatPartnerId)] : null;
  const partnerTasks = chatPartnerId ? aiTasks[String(chatPartnerId)] || [] : [];
  const unlockedAchievementCount = Object.keys(achievements).length;

  const moodResult = useMemo(
    () => moodThemeEnabled ? analyzeConversationMood(messages) : { mood: "neutral", confidence: 0 },
    [messages, moodThemeEnabled]
  );

  const outgoingTonePreview = useMemo(() => {
    if (!text.trim() || text.trim().startsWith("/")) return { rewritten: "", reason: "" };
    return generateTonePreview({ draft: text, tone: toneMode });
  }, [text, toneMode]);

  useEffect(() => {
    localStorage.setItem(`offline_queue_${userId}`, JSON.stringify(offlineQueue));
  }, [offlineQueue, userId]);

  useEffect(() => {
    if (isConnected && offlineQueue.length > 0 && socketRef.current) {
      offlineQueue.forEach(payload => socketRef.current.emit("private_message", payload));
      setOfflineQueue([]);
    }
  }, [isConnected, offlineQueue]);

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
          if (scam) { setSafetyWarning({ ...scam, messageId: normalized.localId }); setShowSafetyWhy(false); }
        }
        return next;
      });
    });

    socket.on("message_reaction", ({ messageId, emoji, userId: reactorUserId, action }) => {
      setMessages((prev) => prev.map((entry) => {
        if (entry.localId !== messageId) return entry;
        const reactions = { ...(entry.reactions || {}) };
        const set = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);
        if (action === "remove") set.delete(String(reactorUserId));
        else set.add(String(reactorUserId));
        reactions[emoji] = [...set];
        return { ...entry, reactions };
      }));
    });

    socket.on("presence_update", ({ userId: pUserId, status }) => {
      setOnlineStatuses((prev) => ({ ...prev, [String(pUserId)]: status === "online" }));
    });

    socket.connect();
    return () => socket.disconnect();
  }, [token, userId, chatPartnerId]);

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !chatPartnerId) return;

    if (text.trim().startsWith("/")) {
      const result = await executeAssistantCommand({ input: text.trim(), roomId, messages, activeChatUser });
      setMessages((prev) => [...prev, { localId: `asst-${Date.now()}`, from: "assistant", to: userId, message: result.text, type: "assistant", timestamp: Date.now() }]);
      setText("");
      return;
    }

    const payload = {
      localId: `${userId}-${chatPartnerId}-${Date.now()}`,
      from: userName,
      fromUserId: userId,
      toUserId: chatPartnerId,
      message: outgoingTonePreview.rewritten || text.trim(),
      timestamp: Date.now(),
      type: secretMode ? "secret" : "text",
      replyTo: replyingTo ? replyingTo.localId : null,
    };

    if (isConnected) socketRef.current?.emit("private_message", payload);
    else setOfflineQueue(prev => [...prev, { ...payload, status: "pending" }]);

    setMessages((prev) => [...prev, { ...payload, self: true }]);
    setText("");
    setReplyingTo(null);
    setSecretMode(false);
  }, [text, chatPartnerId, isConnected, userId, userName, outgoingTonePreview, secretMode, replyingTo]);

  const handleEdit = (msg) => { setEditingMessage(msg); setText(msg.message); inputRef.current?.focus(); };
  const handleDelete = (msg) => { if(window.confirm("Delete?")) { socketRef.current?.emit("delete_message", { toUserId: chatPartnerId, messageId: msg.localId }); } };
  const handleReply = (msg) => { setReplyingTo(msg); inputRef.current?.focus(); };

  return (
    <div className="chat-app">
      <div className="chat-container sidebar-open assistant-open">
        <aside className="app-rail">
          <div className="rail-top">
            <div className="rail-top-logo">
              <img src={`https://ui-avatars.com/api/?name=${userName}&background=6b4ead&color=fff`} alt="Logo" />
            </div>
            <button className="rail-button active"><MessageCircle size={24} /></button>
            <button className="rail-button"><Users size={24} /></button>
            <button className="rail-button" onClick={() => window.location.href="/settings"}><SettingsIcon size={24} /></button>
          </div>
          <div className="rail-bottom">
            <button className="rail-button" onClick={() => { clearSession(); window.location.href="/login"; }}><ArrowLeft size={24} /></button>
          </div>
        </aside>

        <div className="contact-list-sidebar">
          <ContactList
            onSelect={setActiveChatUser}
            activeChatUser={activeChatUser}
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
            getAvatarColor={(n) => "#6b4ead"}
            getInitials={(n) => n.slice(0,2).toUpperCase()}
            onToggleFriendship={() => setShowFriendshipPanel(!showFriendshipPanel)}
          />

          {showFriendshipPanel && (
            <div className="friendship-overlay">
              <FriendshipPanel friendshipInsight={friendshipInsight} />
            </div>
          )}

          <MessageTimeline
            messages={messages}
            userId={userId}
            isOwnMessage={(m) => m.self || String(m.fromUserId) === String(userId)}
            getAvatarColor={() => "#6b4ead"}
            getInitials={(n) => n.slice(0,2).toUpperCase()}
            toTime={toTime}
            messagesEndRef={messagesEndRef}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            unlockedSecrets={unlockedSecrets}
          />

          <MessageComposer
            text={text}
            setText={setText}
            sendMessage={sendMessage}
            inputRef={inputRef}
            smartReplies={smartReplies}
            outgoingTonePreview={outgoingTonePreview}
            isConnected={isConnected}
            secretMode={secretMode}
            setSecretMode={setSecretMode}
            replyingTo={replyingTo}
            cancelReply={() => setReplyingTo(null)}
            commandSuggestions={commandSuggestions}
            activeCommandIndex={activeCommandIndex}
          />
        </div>

        <AssistantRail
          activeChatUser={activeChatUser}
          messages={messages}
          summaryState={summaryState}
          refreshSummary={getConversationSummary}
          savedTasks={partnerTasks}
          achievements={achievements}
          friendshipStatsMap={friendshipStats}
        />
      </div>
    </div>
  );
}
