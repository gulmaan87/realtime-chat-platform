import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Users,
  MessageCircle,
} from "lucide-react";
import ContactList from "../components/ContactList";
import ChatHeader from "../components/chat/ChatHeader";
import MessageTimeline from "../components/chat/MessageTimeline";
import MessageComposer from "../components/chat/MessageComposer";
import AssistantRail from "../components/chat/AssistantRail";
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { getSession, getUserId } from "../services/session";
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
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { token, user } = getSession();
  const userId = getUserId(user);

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
      setMessages((data.messages || []).map((m, i) => normalizeMessage(m, i)));
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
    setMessages((prev) => [...prev, { ...payload, fromUserId: userId, self: true }]);
    setText("");
  }, [activeChatUser, text, userId]);

  const getInitials = (name = "") => name.slice(0, 2).toUpperCase();
  const getAvatarColor = (name = "") => "#6b4ead";

  return (
    <div className="chat-app">
      <div className="chat-container">
        <aside className="app-rail">
          <div className="rail-top">
            <div className="rail-top-logo">
              <img src="https://ui-avatars.com/api/?name=Chat&background=6b4ead&color=fff" alt="Logo" />
            </div>
            <button className="rail-button active"><MessageCircle size={24} /></button>
            <button className="rail-button"><Users size={24} /></button>
            <button className="rail-button"><SettingsIcon size={24} /></button>
          </div>
          <div className="rail-bottom">
            <button className="rail-button"><ArrowLeft size={24} /></button>
          </div>
        </aside>

        <div className="contact-list-sidebar">
          <ContactList
            onSelect={setActiveChatUser}
            activeChatUser={activeChatUser}
            contacts={activeChatUser ? [activeChatUser] : []} // In real app, this is fetched contacts
            onlineStatuses={onlineStatuses}
          />
        </div>

        <div className="chat-main">
          <ChatHeader
            activeChatUser={activeChatUser}
            activeChatOnline={activeChatUser ? onlineStatuses[activeChatUser.id || activeChatUser._id] : false}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
          />
          <MessageTimeline
            messages={messages}
            userId={userId}
            isOwnMessage={(m) => m.self || String(m.fromUserId) === String(userId)}
            getAvatarColor={getAvatarColor}
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
        </div>

        <AssistantRail activeChatUser={activeChatUser} />
      </div>
    </div>
  );
}
