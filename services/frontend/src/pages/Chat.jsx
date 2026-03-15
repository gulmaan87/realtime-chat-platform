import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  MessageCircle, Users, Hash, Cpu, Settings as SettingsIcon, LogOut, 
  Search, Plus, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, Mic, Sparkles, RefreshCw
} from "lucide-react";
import { INITIAL_CONVERSATIONS } from '../utils/seedData';
import { createSocket } from "../services/socket";
import { fetchChatHistory } from "../services/api";
import { getSession, getUserId, clearSession } from "../services/session";
import "../App.css";

// --- Sub-Components (Maintained from redesign) ---

const UtilityRail = ({ onLogout, userName }) => (
  <aside className="app-rail">
    <div className="rail-top">
      <div className="profile-launcher" title="Your Profile">
        {userName.slice(0, 2).toUpperCase()}
      </div>
      <button className="rail-button active" title="Chats"><MessageCircle size={22} /></button>
      <button className="rail-button" title="Friends"><Users size={22} /></button>
      <button className="rail-button" title="Groups"><Hash size={22} /></button>
      <button className="rail-button" title="AI Dojo"><Cpu size={22} /></button>
    </div>
    <div className="rail-bottom">
      <button className="rail-button" title="Settings"><SettingsIcon size={22} /></button>
      <button className="rail-button" title="Logout" onClick={onLogout}><LogOut size={22} /></button>
    </div>
  </aside>
);

const ConversationList = ({ conversations, activeId, onSelect, searchQuery, setSearchQuery, filter, setFilter, onlineStatuses }) => (
  <div className="contact-list-sidebar">
    <div className="inbox-header">
      <div className="inbox-title-row">
        <h2>Messages</h2>
        <button className="new-chat-btn"><Plus size={18} /></button>
      </div>
      <div className="search-bar">
        <Search size={16} color="var(--text-muted)" />
        <input 
          placeholder="Search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="filter-tabs">
        {["all", "dm", "group", "ai", "unread"].map(t => (
          <button 
            key={t} 
            className={`filter-tab ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
    <div className="contact-items">
      {conversations.map(c => {
        const isOnline = onlineStatuses[String(c.id)] || c.status === 'online';
        return (
          <div 
            key={c.id} 
            className={`contact-item ${activeId === c.id ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="contact-avatar-wrapper" style={{ position: 'relative' }}>
              <div className={`contact-avatar ${c.type === 'ai' ? 'ai' : ''}`} style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--glass-highlight)', display: 'grid', placeItems: 'center' }}>
                {c.avatar || c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
            </div>
            <div className="contact-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="contact-info-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h4>
                <span className="contact-time" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.lastActive}</span>
              </div>
              <div className="contact-info-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.messages[c.messages.length - 1]?.text || "No messages yet"}
                </p>
                {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ChatPanel = ({ chat, onSendMessage, isTyping, onlineStatuses, onTypingStart, onTypingStop }) => {
  const [val, setVal] = useState("");
  const scrollRef = useRef(null);
  const isOnline = onlineStatuses[String(chat.id)] || chat.status === 'online';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    onSendMessage(val);
    setVal("");
    onTypingStop();
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") {
      onTypingStart();
    }
  };

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="contact-avatar" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--glass-highlight)', display: 'grid', placeItems: 'center' }}>
            {chat.avatar || chat.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>{chat.name}</h2>
            <p style={{ fontSize: '0.8rem', color: isOnline ? 'var(--status-online)' : 'var(--text-muted)' }}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-action-btn"><Phone size={18} /></button>
          <button className="header-action-btn"><Video size={18} /></button>
          <button className="header-action-btn"><Search size={18} /></button>
          <button className="header-action-btn"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      <div className="streak-strip">
        <div className="streak-info">
          <span className="streak-item">🔥 <strong>{chat.streak || 0} day streak</strong></span>
          <span className="streak-item">✨ <strong>+12 XP today</strong></span>
          <span className="streak-item">Tier: <strong>{chat.tier || "Neutral"}</strong></span>
        </div>
        <span className="streak-cta" style={{ color: 'var(--accent-secondary)', fontWeight: 600, cursor: 'pointer' }}>Keep momentum</span>
      </div>

      <div className="messages-container" ref={scrollRef}>
        {chat.messages.map(m => (
          <div key={m.id} className={`msg-wrapper ${m.senderId === 'me' ? 'own' : ''}`}>
            <div className="msg-bubble">
              {m.text}
              <div className="message-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.7rem', opacity: 0.5 }}>
                <span className="msg-time">{m.timestamp}</span>
                {m.senderId === 'me' && (
                  <span style={{ color: m.status === 'read' ? 'var(--accent-secondary)' : 'inherit' }}>
                    {m.status === 'read' ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="typing-indicator" style={{ display: 'flex', gap: 4, padding: '10px 16px', background: 'var(--glass-surface)', borderRadius: 20, width: 'fit-content' }}>
            <span className="spinning"><RefreshCw size={14} /></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{chat.name} is typing...</span>
          </div>
        )}
      </div>

      <footer className="input-container">
        <form className="smart-composer" onSubmit={handleSend}>
          <button type="button" className="composer-action"><Paperclip size={20} /></button>
          <button type="button" className="composer-action"><Mic size={20} /></button>
          <input 
            className="composer-input" 
            placeholder={`Message ${chat.name}...`} 
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onTypingStop}
          />
          <button type="button" className="composer-action"><Smile size={20} /></button>
          <button type="button" className="composer-action" style={{ color: 'var(--accent-secondary)' }}><Sparkles size={20} /></button>
          <button type="submit" className="send-btn" disabled={!val.trim()}><Send size={20} /></button>
        </form>
      </footer>
    </main>
  );
};

const AssistantRail = ({ chat }) => {
  const [tab, setTab] = useState("summary");

  return (
    <div className="chat-details-shell">
      <div className="assistant-identity">
        <div className="assistant-avatar" style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'grid', placeItems: 'center', margin: '0 auto 12px', fontSize: '1.5rem' }}>🤖</div>
        <h3>Copilot</h3>
        <p>Analyzing {chat.name}</p>
      </div>
      <div className="assistant-tabs">
        {["summary", "actions", "insights"].map(t => (
          <button key={t} className={`ast-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>
      <div className="assistant-content" style={{ padding: 24, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {tab === "summary" && (
          <div className="insight-card">
            <div className="insight-header"><Sparkles size={16} /> Summary</div>
            <div className="insight-body">{chat.summary || "No summary available."}</div>
          </div>
        )}
        {tab === "actions" && (
          <div className="actions-list" style={{ display: 'grid', gap: 12 }}>
            <div className="insight-header"><Zap size={16} /> Suggested Actions</div>
            {(chat.actions || []).map((a, i) => (
              <div key={i} className="task-item" style={{ background: 'var(--glass-surface)', padding: 12, borderRadius: 12, border: '1px solid var(--glass-border)' }}>{a}</div>
            ))}
          </div>
        )}
        {tab === "insights" && (
          <div className="insights-grid" style={{ display: 'grid', gap: 16 }}>
            <div className="insight-header"><RefreshCw size={16} /> Insights</div>
            <div><strong>Mood:</strong> {chat.insights?.mood || "Neutral"}</div>
            <div><strong>Health:</strong> {chat.insights?.health || "Stable"}</div>
            <div><strong>Cadence:</strong> {chat.insights?.cadence || "Varies"}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Page Logic (Real-time Integration) ---

export default function Chat() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState(INITIAL_CONVERSATIONS[1].id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);

  const { token, user } = getSession();
  const userId = getUserId(user) || "me";
  const userName = user?.username || "Alex Developer";

  // --- Real-time Socket Setup ---
  useEffect(() => {
    if (!userId || !token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket Gateway");
      socket.emit("register");
    });

    socket.on("private_message", (msg) => {
      const partnerId = String(msg.fromUserId);
      const normalizedMsg = {
        id: Date.now() + Math.random(),
        senderId: partnerId,
        text: msg.message,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "read"
      };

      setConversations(prev => {
        const updated = prev.map(c => {
          if (String(c.id) === partnerId) {
            return {
              ...c,
              messages: [...c.messages, normalizedMsg],
              lastActive: "Just now",
              unreadCount: activeId === c.id ? 0 : c.unreadCount + 1
            };
          }
          return c;
        });
        // Sort by recency
        return [...updated].sort((a, b) => (String(a.id) === partnerId ? -1 : 1));
      });
    });

    socket.on("message_read", ({ messageId }) => {
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: c.messages.map(m => m.id === messageId ? { ...m, status: "read" } : m)
      })));
    });

    socket.on("typing_start", ({ fromUserId: typingUserId }) => {
      if (String(typingUserId) === String(chatPartnerId)) {
        setIsTyping(true);
      }
    });

    socket.on("typing_stop", ({ fromUserId: typingUserId }) => {
      if (String(typingUserId) === String(chatPartnerId)) {
        setIsTyping(false);
      }
    });

    socket.on("presence_update", ({ userId: pUserId, status }) => {
      setOnlineStatuses(prev => ({ ...prev, [String(pUserId)]: status === "online" }));
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [token, userId, activeId]);

  // --- Derived State ---
  const activeChat = useMemo(() => 
    conversations.find(c => c.id === activeId) || conversations[0]
  , [conversations, activeId]);

  const filtered = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(query.toLowerCase());
      const matchFilter = filter === "all" || (filter === "unread" && c.unreadCount > 0) || c.type === filter;
      return matchSearch && matchFilter;
    });
  }, [conversations, query, filter]);

  // --- Handlers ---
  const handleSelect = async (id) => {
    setActiveId(id);
    
    // 1. Reset unread
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));

    // 2. Mark latest message as read in socket
    const targetChat = conversations.find(c => c.id === id);
    if (targetChat && targetChat.messages.length > 0) {
      const lastMsg = targetChat.messages[targetChat.messages.length - 1];
      if (lastMsg.senderId !== "me") {
        socketRef.current?.emit("message_read", {
          toUserId: id,
          messageId: lastMsg.id
        });
      }
    }

    // 3. Fetch real history from backend
    try {
      const data = await fetchChatHistory(userId, id);
      if (data.messages && data.messages.length > 0) {
        const history = data.messages.map(m => ({
          id: m.localId || Math.random(),
          senderId: m.fromUserId === userId ? "me" : m.fromUserId,
          text: m.message,
          timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: m.status || "read"
        }));
        setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: history } : c));
      }
    } catch (err) {
      console.warn("Failed to fetch history, keeping mock data.", err);
    }
  };

  const handleTypingStart = () => {
    socketRef.current?.emit("typing_start", { toUserId: activeId });
  };

  const handleTypingStop = () => {
    socketRef.current?.emit("typing_stop", { toUserId: activeId });
  };

  const handleSend = (text) => {
    const now = Date.now();
    const timestamp = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Emit to socket server
    socketRef.current?.emit("private_message", {
      toUserId: activeId,
      message: text,
      timestamp: now
    });

    // 2. Update local UI immediately
    const msg = { id: now, senderId: "me", text, timestamp, status: "sent" };
    setConversations(prev => {
      const updated = prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, msg], lastActive: "Just now" } : c);
      return updated.sort((a, b) => (a.id === activeId ? -1 : 1));
    });
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <div className="chat-app">
      <div className="chat-container">
        <UtilityRail onLogout={handleLogout} userName={userName} />
        <ConversationList 
          conversations={filtered} 
          activeId={activeId} 
          onSelect={handleSelect}
          searchQuery={query}
          setSearchQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          onlineStatuses={onlineStatuses}
        />
        <ChatPanel 
          chat={activeChat} 
          onSendMessage={handleSend} 
          isTyping={isTyping} 
          onlineStatuses={onlineStatuses}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
        <AssistantRail chat={activeChat} />
      </div>
    </div>
  );
}
