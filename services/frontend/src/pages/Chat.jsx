import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { clearSession, getSession, getUserId } from "../services/session";
import ContactList from "../components/ContactList";
import { Send, CheckCheck, LogOut, Settings } from "lucide-react";
import { analyzeConversationMood } from "../services/sentimentService";
import { buildTypingMetadata, classifyTypingEmotion } from "../services/typingEmotionService";
import "../App.css";

const MOOD_THEME_TOGGLE_KEY = "feature:moodThemeEnabled";
const TYPING_EMOTION_TOGGLE_KEY = "feature:typingEmotionEnabled";

export default function Chat({ activeChatUser, setActiveChatUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [typingState, setTypingState] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingMetricsRef = useRef({
    lastValue: "",
    lastTimestamp: 0,
    backspaceCount: 0,
    punctuationCount: 0,
    capsCount: 0,
    alphaCount: 0,
  });
  const typingEmitCooldownRef = useRef(0);
  const typingStopTimerRef = useRef(null);

  const { token, user } = getSession();
  const userName = user?.username || user?.email || "User";
  const userId = getUserId(user);
  const socketRef = useRef(null);
  const chatPartnerId = useMemo(() => activeChatUser?.id || activeChatUser?._id || null, [activeChatUser]);
  const activeChatOnline = chatPartnerId ? Boolean(onlineStatuses[String(chatPartnerId)]) : false;

  const moodThemeEnabled = localStorage.getItem(MOOD_THEME_TOGGLE_KEY) !== "false";
  const typingEmotionEnabled = localStorage.getItem(TYPING_EMOTION_TOGGLE_KEY) !== "false";

  const moodResult = useMemo(() => {
    if (!moodThemeEnabled) {
      return { mood: "neutral", confidence: 0 };
    }
    return analyzeConversationMood(messages);
  }, [messages, moodThemeEnabled]);

  const sharedMedia = [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=300&h=300&fit=crop",
  ];

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!typingMetricsRef.current.lastTimestamp) {
      typingMetricsRef.current.lastTimestamp = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!userId || !token) return;

    const currentSocket = createSocket(token);
    socketRef.current = currentSocket;

    currentSocket.on("connect", () => {
      currentSocket.emit("register");
      setIsConnected(true);
    });

    currentSocket.on("private_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    currentSocket.on("presence_update", ({ userId: presenceUserId, status }) => {
      if (!presenceUserId) return;
      setOnlineStatuses((prev) => ({ ...prev, [String(presenceUserId)]: status === "online" }));
    });

    currentSocket.on("presence_snapshot", (snapshot) => {
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

    currentSocket.on("typing_metadata", (payload) => {
      if (!payload || String(payload.fromUserId) !== String(chatPartnerId)) return;
      if (!typingEmotionEnabled) {
        setTypingState({ label: "typing…", expiresAt: Date.now() + 2200 });
        return;
      }

      const result = classifyTypingEmotion(payload.metadata || {});
      setTypingState({ label: result.label, expiresAt: Date.now() + 2200 });
    });

    currentSocket.on("typing_stop", ({ fromUserId }) => {
      if (String(fromUserId) === String(chatPartnerId)) {
        setTypingState(null);
      }
    });

    currentSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    currentSocket.connect();

    return () => {
      currentSocket.off("connect");
      currentSocket.off("private_message");
      currentSocket.off("presence_update");
      currentSocket.off("presence_snapshot");
      currentSocket.off("typing_metadata");
      currentSocket.off("typing_stop");
      currentSocket.off("disconnect");
      currentSocket.disconnect();
      if (socketRef.current === currentSocket) {
        socketRef.current = null;
      }
    };
  }, [token, userId, userName, chatPartnerId, typingEmotionEnabled]);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!chatPartnerId) {
        setMessages([]);
        return;
      }

      try {
        const data = await fetchChatHistory(userId, chatPartnerId);
        if (isMounted) {
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [chatPartnerId, userId]);

  useEffect(() => {
    if (!typingState) return;
    const timeout = setTimeout(() => {
      if (typingState.expiresAt <= Date.now()) {
        setTypingState(null);
      }
    }, 2400);

    return () => clearTimeout(timeout);
  }, [typingState]);

  function sendMessage() {
    if (!text.trim() || !isConnected) return;
    if (!chatPartnerId) {
      alert("Please select a user to chat with");
      return;
    }

    const messageData = {
      from: userName,
      fromUserId: userId,
      toUserId: chatPartnerId,
      to: chatPartnerId,
      message: text.trim(),
      timestamp: Date.now(),
    };

    socketRef.current?.emit("private_message", messageData);

    setMessages((prev) => [
      ...prev,
      {
        ...messageData,
        self: true,
      },
    ]);

    socketRef.current?.emit("typing_stop", { toUserId: chatPartnerId });
    setText("");
    inputRef.current?.focus();
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleLogout() {
    clearSession();
    socketRef.current?.disconnect();
    window.location.href = "/login";
  }

  function formatFullTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function shouldShowAvatar(messageList, index) {
    if (index === 0) return true;
    const current = messageList[index];
    const previous = messageList[index - 1];

    if (typeof current === "string" || typeof previous === "string") return true;

    const currentSender = current.from || current.sender || current.message;
    const previousSender = previous.from || previous.sender || previous.message;

    return currentSender !== previousSender;
  }

  function shouldGroupMessages(messageList, index) {
    if (index === 0) return false;
    const current = messageList[index];
    const previous = messageList[index - 1];

    if (typeof current === "string" || typeof previous === "string") return false;

    const currentSender = current.from || current.sender || current.message;
    const previousSender = previous.from || previous.sender || previous.message;
    const currentTimestamp = Number(current.timestamp || 0);
    const previousTimestamp = Number(previous.timestamp || 0);
    const timeDiff = currentTimestamp - previousTimestamp;

    return currentSender === previousSender && Math.abs(timeDiff) < 300000;
  }

  function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = [
      "#0084ff", "#ff6b6b", "#4ecdc4", "#45b7d1",
      "#f9ca24", "#6c5ce7", "#a29bfe", "#fd79a8",
      "#00b894", "#e17055", "#0984e3", "#00cec9",
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  const handleContactsLoaded = useCallback((contactIds) => {
    if (!Array.isArray(contactIds) || contactIds.length === 0) return;
    socketRef.current?.emit("request_presence", { userIds: contactIds });
  }, []);

  const isOwnMessage = (messageData) => {
    const senderId = messageData.fromUserId || messageData.senderId || messageData.from;
    return messageData.self === true || senderId === userId || messageData.from === userName;
  };

  const handleTypingInput = (value) => {
    const now = Date.now();
    const previous = typingMetricsRef.current;
    const prevLength = previous.lastValue.length;
    const currentLength = value.length;
    const removed = Math.max(0, prevLength - currentLength);
    const added = Math.max(0, currentLength - prevLength);
    const interval = now - previous.lastTimestamp;

    const newTextChunk = added > 0 ? value.slice(-added) : "";
    const punctuationDelta = (newTextChunk.match(/[!?.,;:]/g) || []).length;
    const upperAlphaDelta = (newTextChunk.match(/[A-Z]/g) || []).length;
    const alphaDelta = (newTextChunk.match(/[A-Za-z]/g) || []).length;

    previous.backspaceCount += removed;
    previous.punctuationCount += punctuationDelta;
    previous.capsCount += upperAlphaDelta;
    previous.alphaCount += alphaDelta;
    previous.lastValue = value;
    previous.lastTimestamp = now;

    if (!chatPartnerId || !socketRef.current) return;

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("typing_stop", { toUserId: chatPartnerId });
    }, 1600);

    if (now - typingEmitCooldownRef.current < 750) return;
    typingEmitCooldownRef.current = now;

    const metadata = buildTypingMetadata({
      charDelta: added,
      intervalMs: interval,
      backspaceDelta: removed,
      pauseMs: interval,
      punctuationDelta,
      capsDelta: upperAlphaDelta,
      alphaDelta,
    });

    socketRef.current.emit("typing_metadata", {
      toUserId: chatPartnerId,
      metadata,
    });
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
            <button className="rail-button" onClick={handleLogout} aria-label="Logout">↩</button>
          </div>
        </aside>

        <div className="contact-list-sidebar">
          <ContactList onSelect={setActiveChatUser} activeChatUser={activeChatUser} onContactsLoaded={handleContactsLoaded} onlineStatuses={onlineStatuses} />
        </div>

        <div className="chat-main">
          <div className="chat-header">
            <div className="header-left">
              <div className="avatar-container">
                <div
                  className="avatar"
                  style={{ backgroundColor: getAvatarColor(activeChatUser?.username || activeChatUser?.email || "Chat") }}
                >
                  <span>{activeChatUser ? getInitials(activeChatUser.username || activeChatUser.email) : "?"}</span>
                </div>
                {activeChatUser && activeChatOnline && <div className="online-indicator"></div>}
              </div>
              <div className="header-info">
                <h2>{activeChatUser?.username || activeChatUser?.email || "Select User"}</h2>
                <p className="status-text">
                  {!activeChatUser ? "Select a contact" : activeChatOnline ? "Online" : "Offline"}
                </p>
                {activeChatUser && typingState?.label ? <p className="typing-emotion-indicator">{typingState.label}</p> : null}
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button" onClick={handleLogout} title="Logout">
                <LogOut size={20} />
              </button>
              <button className="icon-button" onClick={() => window.location.href = "/settings"}>
                <Settings size={20} />
              </button>
            </div>
          </div>

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
                messages.map((m, i) => {
                  const messageData = typeof m === "string"
                    ? { message: m, timestamp: 0 }
                    : m;

                  const own = isOwnMessage(messageData);
                  const showAvatar = !own && shouldShowAvatar(messages, i);
                  const grouped = shouldGroupMessages(messages, i);
                  const senderName = messageData.from || messageData.sender || "Anonymous";

                  return (
                    <div
                      key={i}
                      className={`message-wrapper ${own ? "own" : "other"} ${grouped ? "grouped" : ""}`}
                    >
                      {showAvatar && !own && (
                        <div
                          className="message-avatar"
                          style={{ backgroundColor: getAvatarColor(senderName) }}
                        >
                          {getInitials(senderName)}
                        </div>
                      )}
                      {!showAvatar && !own && <div className="avatar-spacer"></div>}

                      <div className="message-content">
                        {!own && !grouped && (
                          <div className="message-sender">{senderName}</div>
                        )}
                        <div className={`message-bubble ${own ? "sent" : "received"}`}>
                          <div className="message-text">
                            {messageData.message || m}
                          </div>
                          <div className="message-footer">
                            <span className="message-time">
                              {formatFullTime(messageData.timestamp)}
                            </span>
                            {own && (
                              <span className="message-status">
                                <CheckCheck size={14} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef}></div>
            </div>
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <div className="message-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    handleTypingInput(e.target.value);
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder={!activeChatUser ? "Select a user to chat" : isConnected ? "Type a message" : "Connecting..."}
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
            <div className="details-avatar" style={{ backgroundColor: getAvatarColor(activeChatUser?.username || activeChatUser?.email || "User") }}>
              {getInitials(activeChatUser?.username || activeChatUser?.email || "U")}
            </div>
            <h3>{activeChatUser?.username || "No chat selected"}</h3>
            <p>{activeChatUser?.email || "Select a contact to view details"}</p>
            {moodThemeEnabled ? (
              <p className="chat-mood-chip">Mood: {moodResult.mood} · {Math.round(moodResult.confidence * 100)}%</p>
            ) : null}
          </div>

          <div className="details-section">
            <div className="details-section-header">Shared Media</div>
            <div className="details-media-grid">
              {sharedMedia.map((src, idx) => (
                <img key={idx} src={src} alt={`Shared media ${idx + 1}`} />
              ))}
            </div>
          </div>

          <button className="details-cta">View All</button>
        </aside>
      </div>
    </div>
  );
}
