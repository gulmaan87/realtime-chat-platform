import { useEffect, useState, useRef } from "react";
import { socket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { Send, MoreVertical, Phone, Video, Search, CheckCheck, LogOut } from "lucide-react";
import "../App.css";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [targetId, setTargetId] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user.username || user.email || "User";

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userName) return;

    socket.connect();

    socket.once("connect", () => {
      console.log("Connected as:", userName);
      socket.emit("register", { userId: userName });
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on("private_message", (msg) => {
      console.log("Received private message:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("private_message");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [userName]);

  useEffect(() => {
    if (targetId) {
      loadHistory();
    }
  }, [targetId]);

  async function loadHistory() {
    if (!targetId) return;
    setIsLoading(true);
    try {
      const data = await fetchChatHistory(targetId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function sendMessage() {
    if (!text.trim() || !isConnected) return;
    if (!targetId) {
      alert("Please enter target user ID");
      return;
    }

    const messageData = {
      from: userName,
      to: targetId,
      message: text.trim(),
      timestamp: Date.now(),
    };

    socket.emit("private_message", messageData);

    // Optimistic UI update (sender side)
    setMessages((prev) => [
      ...prev,
      {
        ...messageData,
        self: true,
      },
    ]);

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socket.disconnect();
    window.location.href = "/login";
  }

  function formatFullTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function shouldShowAvatar(messages, index) {
    if (index === 0) return true;
    const current = messages[index];
    const previous = messages[index - 1];

    if (typeof current === "string" || typeof previous === "string") return true;

    const currentSender = current.from || current.sender || current.message;
    const previousSender = previous.from || previous.sender || previous.message;

    return currentSender !== previousSender;
  }

  function shouldGroupMessages(messages, index) {
    if (index === 0) return false;
    const current = messages[index];
    const previous = messages[index - 1];

    if (typeof current === "string" || typeof previous === "string") return false;

    const currentSender = current.from || current.sender || current.message;
    const previousSender = previous.from || previous.sender || previous.message;
    const timeDiff = (current.timestamp || Date.now()) - (previous.timestamp || Date.now());

    return currentSender === previousSender && Math.abs(timeDiff) < 300000; // 5 minutes
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
      "#00b894", "#e17055", "#0984e3", "#00cec9"
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  const isOwnMessage = (messageData) => {
    return messageData.from === userName || messageData.self === true || (!messageData.from && !messageData.sender);
  };

  return (
    <div className="chat-app">
      {/* Chat Container */}
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <div className="avatar-container">
              <div
                className="avatar"
                style={{ backgroundColor: getAvatarColor(targetId || "Chat") }}
              >
                <span>{targetId ? getInitials(targetId) : "?"}</span>
              </div>
              {isConnected && <div className="online-indicator"></div>}
            </div>
            <div className="header-info">
              <h2>{targetId || "Select User"}</h2>
              <p className="status-text">
                {isConnected ? "Online" : "Connecting..."}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-button" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
            <button className="icon-button">
              <Video size={20} />
            </button>
            <button className="icon-button">
              <Phone size={20} />
            </button>
            <button className="icon-button">
              <Search size={20} />
            </button>
            <button className="icon-button">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* User Identity Section */}
        <div className="user-identity-section">
          <div className="identity-input-group">
            <label>Your User ID:</label>
            <input
              type="text"
              placeholder="Your User ID (e.g. user1)"
              value={userName}
              disabled
              className="identity-input"
            />
          </div>
          <div className="identity-input-group">
            <label>Send To User ID:</label>
            <input
              type="text"
              placeholder="Target User ID (e.g. user2)"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="identity-input"
            />
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          <div className="messages-wrapper">
            {!targetId ? (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Select a user to chat</h3>
                <p>Enter a target user ID above to start messaging</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation with {targetId}!</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const messageData = typeof m === "string"
                  ? { message: m, timestamp: Date.now() }
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

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <div className="message-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={!targetId ? "Enter target user ID first" : isConnected ? "Type a message" : "Connecting..."}
                disabled={!isConnected || !targetId}
                className="message-input"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || !isConnected || !targetId}
                className="send-button"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

