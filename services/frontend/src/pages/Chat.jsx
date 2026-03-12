import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, CheckCheck, LogOut, Settings, Lock, Sparkles, Bot, RefreshCw } from "lucide-react";
import ContactList from "../components/ContactList";
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { clearSession, getSession, getUserId } from "../services/session";
import { analyzeConversationMood } from "../services/sentimentService";
import { buildTypingMetadata, classifyTypingEmotion } from "../services/typingEmotionService";
import { buildSmartReplies } from "../services/smartReplyService";
import { getConversationSummary } from "../services/aiSummaryService";
import { executeAssistantCommand, getCommandSuggestions } from "../services/assistantCommandService";
import { detectIntentActions, detectScamSignals, generateTonePreview } from "../services/aiProductivityService";
import "../App.css";

const MOOD_THEME_TOGGLE_KEY = "feature:moodThemeEnabled";
const TYPING_EMOTION_TOGGLE_KEY = "feature:typingEmotionEnabled";
const REACTION_SOUND_TOGGLE_KEY = "feature:reactionSoundEnabled";
const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮"];

function playReactionSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

  return {
    ...entry,
    localId: String(entry?.localId || entry?.clientMessageId || `${fromId}-${toId}-${timestamp}-${fallbackIndex}`),
    type: entry?.type || "text",
    reactions: entry?.reactions && typeof entry.reactions === "object" ? entry.reactions : {},
  };
}

function toTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const [summaryState, setSummaryState] = useState({ loading: false, summary: "No summary yet.", source: "none", updatedAt: null });
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [toneMode, setToneMode] = useState("professional");
  const [dismissedIntentChips, setDismissedIntentChips] = useState({});
  const [safetyWarning, setSafetyWarning] = useState(null);
  const [showSafetyWhy, setShowSafetyWhy] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingMetricsRef = useRef({ lastValue: "", lastTimestamp: 0 });
  const typingEmitCooldownRef = useRef(0);
  const typingStopTimerRef = useRef(null);
  const socketRef = useRef(null);

  const { token, user } = getSession();
  const userName = user?.username || user?.email || "User";
  const userId = getUserId(user);
  const chatPartnerId = useMemo(() => activeChatUser?.id || activeChatUser?._id || null, [activeChatUser]);
  const activeChatOnline = chatPartnerId ? Boolean(onlineStatuses[String(chatPartnerId)]) : false;
  const roomId = useMemo(() => {
    if (!chatPartnerId || !userId) return "";
    return [String(chatPartnerId), String(userId)].sort().join(":");
  }, [chatPartnerId, userId]);

  const moodThemeEnabled = localStorage.getItem(MOOD_THEME_TOGGLE_KEY) !== "false";
  const typingEmotionEnabled = localStorage.getItem(TYPING_EMOTION_TOGGLE_KEY) !== "false";
  const reactionSoundEnabled = localStorage.getItem(REACTION_SOUND_TOGGLE_KEY) !== "false";

  const moodResult = useMemo(
    () => (moodThemeEnabled ? analyzeConversationMood(messages) : { mood: "neutral", confidence: 0 }),
    [messages, moodThemeEnabled],
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

  const handleSelectChatUser = useCallback((nextUser) => {
    setSafetyWarning(null);
    setShowSafetyWhy(false);
    setDismissedIntentChips({});
    setActiveChatUser(nextUser);
  }, [setActiveChatUser]);

  useEffect(() => {
    const timer = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (!typingMetricsRef.current.lastTimestamp) {
      typingMetricsRef.current.lastTimestamp = Date.now();
    }
  }, []);

  const refreshSummary = useCallback(async (forceRefresh = false) => {
    if (!roomId || messages.length === 0) {
      setSummaryState((prev) => ({ ...prev, summary: "No summary yet." }));
      return;
    }

    setSummaryState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await getConversationSummary({ roomId, messages, activeChatUser, forceRefresh });
      setSummaryState({
        loading: false,
        summary: result.summary || "No summary generated.",
        source: result.source,
        updatedAt: result.updatedAt,
      });
    } catch {
      setSummaryState((prev) => ({ ...prev, loading: false, summary: "Unable to summarize conversation right now." }));
    }
  }, [activeChatUser, messages, roomId]);

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

    socket.on("secret_unlock", ({ messageId, userId: unlockerId }) => {
      if (!messageId || !unlockerId) return;
      if (String(unlockerId) === String(userId)) {
        setUnlockedSecrets((prev) => ({ ...prev, [messageId]: true }));
      }
    });

    socket.on("presence_update", ({ userId: presenceUserId, status }) => {
      if (!presenceUserId) return;
      setOnlineStatuses((prev) => ({ ...prev, [String(presenceUserId)]: status === "online" }));
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
      const label = !typingEmotionEnabled ? "typing…" : classifyTypingEmotion(payload.metadata || {}).label;
      setTypingState({ label, expiresAt: Date.now() + 2200 });
    });

    socket.on("typing_stop", ({ fromUserId }) => {
      if (String(fromUserId) === String(chatPartnerId)) {
        setTypingState(null);
      }
    });

    socket.on("disconnect", () => setIsConnected(false));
    socket.connect();

    return () => {
      ["connect", "private_message", "message_reaction", "secret_unlock", "presence_update", "presence_snapshot", "typing_metadata", "typing_stop", "disconnect"].forEach((eventName) => socket.off(eventName));
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
        const normalized = (data.messages || []).map((entry, i) => normalizeMessage(entry, i));
        setMessages(normalized);
        setSmartReplies(buildSmartReplies({ messages: normalized, activeChatUser }));
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

  const isOwnMessage = useCallback((messageData) => {
    const senderId = messageData.fromUserId || messageData.senderId || messageData.from;
    return messageData.self === true || String(senderId) === String(userId) || messageData.from === userName;
  }, [userId, userName]);

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !isConnected || !chatPartnerId) return;

    if (text.trim().startsWith("/")) {
      const result = await executeAssistantCommand({ input: text.trim(), roomId, messages, activeChatUser });
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
      secret: secretMode ? {
        challenge: String(Math.floor(Math.random() * 9000) + 1000),
        hint: "Enter the 4-digit unlock code",
        oneTime: true,
      } : undefined,
      reactions: {},
    };

    socketRef.current?.emit("private_message", payload);
    setMessages((prev) => [...prev, { ...payload, self: true }]);
    socketRef.current?.emit("typing_stop", { toUserId: chatPartnerId });
    setText("");
    setSecretMode(false);
    setCommandSuggestions([]);
    inputRef.current?.focus();
  }, [activeChatUser, chatPartnerId, isConnected, messages, roomId, secretMode, text, userId, userName, outgoingTonePreview]);

  const applyReaction = useCallback((message, emoji) => {
    const messageId = message.localId;
    const mine = Array.isArray(message.reactions?.[emoji]) && message.reactions[emoji].includes(String(userId));
    const action = mine ? "remove" : "add";

    setMessages((prev) => prev.map((entry) => {
      if (entry.localId !== messageId) return entry;
      const reactions = { ...(entry.reactions || {}) };
      const set = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);
      if (action === "remove") set.delete(String(userId));
      else set.add(String(userId));
      reactions[emoji] = [...set];
      return { ...entry, reactions };
    }));

    socketRef.current?.emit("message_reaction", { toUserId: chatPartnerId, messageId, emoji, action });

    setReactionPulseId(messageId);
    setTimeout(() => setReactionPulseId(null), 250);
    if (reactionSoundEnabled) {
      try { playReactionSound(); } catch { /* ignore */ }
    }
  }, [chatPartnerId, reactionSoundEnabled, userId]);

  const unlockSecret = useCallback((message) => {
    const code = window.prompt(message?.secret?.hint || "Enter unlock code");
    if (!code) return;
    if (String(code).trim() !== String(message.secret?.challenge || "")) {
      alert("Incorrect code.");
      return;
    }

    setUnlockedSecrets((prev) => ({ ...prev, [message.localId]: true }));
    socketRef.current?.emit("secret_unlock", { toUserId: chatPartnerId, messageId: message.localId });
  }, [chatPartnerId]);

  const revealSecretBody = useCallback((message) => {
    if (!message?.secret?.oneTime) return true;
    if (secretViewed[message.localId]) return false;
    setSecretViewed((prev) => ({ ...prev, [message.localId]: true }));
    return true;
  }, [secretViewed]);

  const handleTypingInput = useCallback((value) => {
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
  }, [chatPartnerId]);

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
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
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

  return (
    <div className={`chat-app ${moodThemeEnabled ? `mood-${moodResult.mood}` : "mood-neutral"}`}>
      {moodThemeEnabled && ["romantic", "happy"].includes(moodResult.mood) ? <div className="mood-particles" aria-hidden="true" /> : null}
      <div className="chat-container">
        <aside className="app-rail">
          <div className="rail-top">
            <button className="rail-button active" aria-label="Chats">💬</button>
            <button className="rail-button" aria-label="Contacts">👥</button>
            <button className="rail-button" aria-label="Files">📁</button>
          </div>
          <div className="rail-bottom">
            <button className="rail-button" onClick={() => window.location.href = "/settings"} aria-label="Settings">⚙️</button>
            <button className="rail-button" onClick={() => { clearSession(); socketRef.current?.disconnect(); window.location.href = "/login"; }} aria-label="Logout">↩</button>
          </div>
        </aside>

        <div className="contact-list-sidebar">
          <ContactList onSelect={handleSelectChatUser} activeChatUser={activeChatUser} onContactsLoaded={handleContactsLoaded} onlineStatuses={onlineStatuses} />
        </div>

        <div className="chat-main">
          <div className="chat-header">
            <div className="header-left">
              <div className="avatar-container">
                <div className="avatar" style={{ backgroundColor: getAvatarColor(activeChatUser?.username || activeChatUser?.email || "Chat") }}>
                  <span>{activeChatUser ? getInitials(activeChatUser.username || activeChatUser.email) : "?"}</span>
                </div>
                {activeChatUser && activeChatOnline && <div className="online-indicator" />}
              </div>
              <div className="header-info">
                <h2>{activeChatUser?.username || activeChatUser?.email || "Select User"}</h2>
                <p className="status-text">{!activeChatUser ? "Select a contact" : activeChatOnline ? "Online" : "Offline"}</p>
                {activeChatUser && typingState?.label ? <p className="typing-emotion-indicator">{typingState.label}</p> : null}
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button" onClick={() => { clearSession(); socketRef.current?.disconnect(); window.location.href = "/login"; }} title="Logout"><LogOut size={20} /></button>
              <button className="icon-button" onClick={() => window.location.href = "/settings"}><Settings size={20} /></button>
            </div>
          </div>

          {safetyWarning ? (
            <div className={`safety-warning-banner ${safetyWarning.level}`}>
              <div>
                <strong>{safetyWarning.title}</strong>
                <p>Be careful before sharing sensitive data or sending payments.</p>
                <button className="safety-why-btn" onClick={() => setShowSafetyWhy((prev) => !prev)}>
                  {showSafetyWhy ? "Hide why" : "Why this warning?"}
                </button>
                {showSafetyWhy ? (
                  <ul>
                    {safetyWarning.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                ) : null}
              </div>
              <button className="safety-dismiss-btn" onClick={() => setSafetyWarning(null)}>Dismiss</button>
            </div>
          ) : null}

          <div className="messages-container">
            <div className="messages-wrapper">
              {!activeChatUser ? (
                <div className="empty-state"><div className="empty-icon">👤</div><h3>Select a user to chat</h3><p>Choose a contact from the sidebar to start messaging</p></div>
              ) : messages.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">💬</div><h3>No messages yet</h3><p>Start the conversation with {activeChatUser.username || activeChatUser.email}!</p></div>
              ) : (
                messages.map((messageData, i) => {
                  const own = isOwnMessage(messageData);
                  const grouped = shouldGroupMessages(messages, i);
                  const showAvatar = !own && shouldShowAvatar(messages, i);
                  const senderName = messageData.from || messageData.sender || "Anonymous";
                  const assistant = messageData.type === "assistant" || senderName === "assistant";
                  const isSecret = messageData.type === "secret";
                  const canReveal = own || unlockedSecrets[messageData.localId];

                  return (
                    <div key={messageData.localId || i} className={`message-wrapper ${own ? "own" : "other"} ${grouped ? "grouped" : ""}`}>
                      {showAvatar && !own ? <div className="message-avatar" style={{ backgroundColor: getAvatarColor(senderName) }}>{assistant ? <Bot size={14} /> : getInitials(senderName)}</div> : null}
                      {!showAvatar && !own ? <div className="avatar-spacer" /> : null}

                      <div className="message-content">
                        {!own && !grouped ? <div className="message-sender">{senderName}</div> : null}
                        <div className={`message-bubble ${own ? "sent" : "received"} ${assistant ? "assistant-bubble" : ""} ${reactionPulseId === messageData.localId ? "reaction-pulse" : ""}`}>
                          {isSecret && !canReveal ? (
                            <div className="secret-preview-card">
                              <div className="secret-title"><Lock size={14} /> Secret message</div>
                              <p>Hidden preview. Unlock required.</p>
                              <button className="secret-unlock-btn" onClick={() => unlockSecret(messageData)}>Unlock</button>
                            </div>
                          ) : (
                            <div className="message-text">
                              {isSecret ? (revealSecretBody(messageData) ? messageData.message : "Secret viewed once") : messageData.message}
                            </div>
                          )}

                          <div className="message-footer">
                            <span className="message-time">{toTime(messageData.timestamp)}</span>
                            {own ? <span className="message-status"><CheckCheck size={14} /></span> : null}
                          </div>

                          {!assistant ? (
                            <>
                            <div className="message-reactions">
                              {QUICK_REACTION_EMOJIS.map((emoji) => {
                                const count = Array.isArray(messageData.reactions?.[emoji]) ? messageData.reactions[emoji].length : 0;
                                const mine = Array.isArray(messageData.reactions?.[emoji]) && messageData.reactions[emoji].includes(String(userId));
                                return (
                                  <button key={emoji} className={`reaction-chip ${mine ? "mine" : ""}`} onClick={() => applyReaction(messageData, emoji)}>
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
                                    onClick={() => dismissIntentChip(messageData.localId, intent.key)}
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
                  <div className="smart-reply-title"><Sparkles size={14} /> Quick replies</div>
                  <div className="smart-reply-cards">
                    {smartReplies.slice(0, 5).map((reply) => (
                      <button key={reply} className="smart-reply-card" onClick={() => setText(reply)}>{reply}</button>
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
                    <button onClick={() => setText(outgoingTonePreview.rewritten || text)}>Use converted</button>
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

              <div className="message-input-wrapper">
                <button className={`secret-mode-toggle ${secretMode ? "active" : ""}`} onClick={() => setSecretMode((prev) => !prev)} title="Secret mode"><Lock size={16} /></button>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    handleTypingInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (commandSuggestions.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                      e.preventDefault();
                      setActiveCommandIndex((prev) => {
                        if (e.key === "ArrowDown") return (prev + 1) % commandSuggestions.length;
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
                  placeholder={!activeChatUser ? "Select a user to chat" : isConnected ? (secretMode ? "Send secret message" : "Type a message or /command") : "Connecting..."}
                  disabled={!isConnected || !activeChatUser}
                  className="message-input"
                />
                <button onClick={sendMessage} disabled={!text.trim() || !isConnected || !activeChatUser} className="send-button"><Send size={20} /></button>
              </div>
            </div>
          </div>
        </div>

        <aside className="chat-details">
          <div className="details-user-card">
            <div className="details-avatar" style={{ backgroundColor: getAvatarColor(activeChatUser?.username || activeChatUser?.email || "User") }}>{getInitials(activeChatUser?.username || activeChatUser?.email || "U")}</div>
            <h3>{activeChatUser?.username || "No chat selected"}</h3>
            <p>{activeChatUser?.email || "Select a contact to view details"}</p>
            {moodThemeEnabled ? <p className="chat-mood-chip">Mood: {moodResult.mood} · {Math.round(moodResult.confidence * 100)}%</p> : null}
          </div>

          <div className="details-section summary-panel">
            <div className="summary-header-row">
              <div className="details-section-header">Conversation Summary</div>
              <button className="summary-refresh" onClick={() => refreshSummary(true)} disabled={summaryState.loading}>
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
  );
}
