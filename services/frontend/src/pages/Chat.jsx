import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Users,
  MessageCircle,
  Cpu,
  Hash
} from "lucide-react";
import ContactList from "../components/ContactList";
import ChatHeader from "../components/chat/ChatHeader";
import MessageTimeline from "../components/chat/MessageTimeline";
import MessageComposer from "../components/chat/MessageComposer";
import AssistantRail from "../components/chat/AssistantRail";
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { clearSession, getSession, getUserId } from "../services/session";
import { SEEDED_CONTACTS, SEEDED_MESSAGES, SEEDED_ASSISTANT_DATA } from "../utils/seedData";
import "../App.css";

function normalizeMessage(entry, fallbackIndex = 0) {
  const timestamp = Number(entry?.timestamp || Date.now());
  return {
    ...entry,
    localId: entry?.localId || `msg-${timestamp}-${fallbackIndex}`,
    message: typeof entry === "string" ? entry : entry.message,
    timestamp,
  };
}

function toTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ activeChatUser, setActiveChatUser }) {
  const [messages, setMessages] = useState(SEEDED_MESSAGES);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({ "user-1": true, "ai-copilot": true });
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { token, user } = getSession();
  const userId = getUserId(user) || "me";
  const userName = user?.username || "Alex Developer";

  useEffect(() => {
    if (!userId || !token) return;
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register");
      setIsConnected(true);
    });

    socket.on("private_message", (msg) => {
      setMessages((prev) => [...prev, normalizeMessage(msg)]);
    });

    socket.on("presence_update", ({ userId: pUserId, status }) => {
      setOnlineStatuses((prev) => ({ ...prev, [String(pUserId)]: status === "online" }));
    });

    socket.connect();
    return () => socket.disconnect();
  }, [token, userId]);

  useEffect(() => {
    if (!activeChatUser) return;
    fetchChatHistory(userId, activeChatUser.id || activeChatUser._id).then(data => {
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((m, i) => normalizeMessage(m, i)));
      } else {
        setMessages(SEEDED_MESSAGES);
      }
    }).catch(() => {
      setMessages(SEEDED_MESSAGES);
    });
  }, [activeChatUser, userId]);

  const sendMessage = useCallback(() => {
    if (!text.trim() || !activeChatUser) return;
    const payload = {
      toUserId: activeChatUser.id || activeChatUser._id,
      message: text.trim(),
      timestamp: Date.now(),
    };
    socketRef.current?.emit("private_message", payload);
    setMessages((prev) => [...prev, { ...payload, fromUserId: userId, self: true, from: userName, localId: `sent-${Date.now()}` }]);
    setText("");
  }, [activeChatUser, text, userId, userName]);

  const getInitials = (name = "") => name.slice(0, 2).toUpperCase();

  return (
    <div className="chat-app">
      <div className="chat-container">
        
        {/* Left Utility Rail */}
        <aside className="app-rail">
          <div className="rail-top">
            <div className="profile-launcher">
              {getInitials(userName)}
            </div>
            <button className="rail-button active" title="Chats"><MessageCircle size={22} /></button>
            <button className="rail-button" title="Friends"><Users size={22} /></button>
            <button className="rail-button" title="Groups"><Hash size={22} /></button>
            <button className="rail-button" title="AI Dojo"><Cpu size={22} /></button>
          </div>
          <div className="rail-bottom">
            <button className="rail-button" title="Settings" onClick={() => window.location.href="/settings"}><SettingsIcon size={22} /></button>
            <button className="rail-button" title="Logout" onClick={() => { clearSession(); window.location.href="/login"; }}><ArrowLeft size={22} /></button>
          </div>
        </aside>

        {/* Smart Inbox */}
        <div className="contact-list-sidebar">
          <ContactList
            onSelect={setActiveChatUser}
            activeChatUser={activeChatUser}
            contacts={SEEDED_CONTACTS}
            onlineStatuses={onlineStatuses}
          />
        </div>

        {/* Main Chat Panel */}
        <div className="chat-main">
          {activeChatUser ? (
            <>
              <ChatHeader
                activeChatUser={activeChatUser}
                activeChatOnline={onlineStatuses[activeChatUser.id || activeChatUser._id]}
                getInitials={getInitials}
              />
              {activeChatUser.streak && (
                <div className="streak-strip">
                  <div className="streak-info">
                    <span className="streak-item">🔥 <strong>{activeChatUser.streak} day streak</strong></span>
                    <span className="streak-item">✨ <strong>+12 XP today</strong></span>
                    <span className="streak-item">Tier: <strong>{activeChatUser.tier}</strong></span>
                  </div>
                  <span className="streak-cta">Keep momentum</span>
                </div>
              )}
              <MessageTimeline
                messages={messages}
                userId={userId}
                isOwnMessage={(m) => m.self || String(m.fromUserId) === String(userId)}
                getInitials={getInitials}
                toTime={toTime}
                messagesEndRef={messagesEndRef}
              />
              <MessageComposer
                text={text}
                setText={setText}
                sendMessage={sendMessage}
                inputRef={inputRef}
              />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <MessageCircle size={32} />
              </div>
              <h2 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Welcome to LevelUp Chat</h2>
              <p>Choose a chat, group, or AI assistant to begin.</p>
            </div>
          )}
        </div>

        {/* AI Assistant Rail */}
        {activeChatUser && (
          <AssistantRail 
            activeChatUser={activeChatUser} 
            seededData={SEEDED_ASSISTANT_DATA}
          />
        )}
      </div>
    </div>
  );
}
