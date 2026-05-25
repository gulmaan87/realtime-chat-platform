import { useState } from "react";
import { Phone, Video, Search, Pin, MoreHorizontal } from "lucide-react";

function HeaderAvatar({ contact, getInitials }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = contact?.profilePicUrl && contact.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${contact.profilePicUrl}` : "";

  if (contact?.type === 'ai') {
    return (
      <div className="contact-avatar ai">🤖</div>
    );
  }

  if (picUrl && !failed) {
    return (
      <div className="contact-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={picUrl}
          alt={contact.username}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="contact-avatar">
      {getInitials(contact?.username || "")}
    </div>
  );
}

export default function ChatHeader({
  activeChatUser,
  activeChatOnline,
  getInitials,
}) {
  if (!activeChatUser) return null;

  return (
    <div className="chat-header">
      <div className="header-user-info">
        <div className="contact-avatar-wrapper">
          <HeaderAvatar contact={activeChatUser} getInitials={getInitials} />
          <div className={`status-dot ${activeChatOnline || activeChatUser.status === 'online' ? "online" : "offline"}`} />
        </div>
        <div>
          <h2>{activeChatUser.username}</h2>
          <div className="header-user-status">
            <span style={{ 
              display: "inline-block", 
              width: "8px", height: "8px", 
              borderRadius: "50%", 
              background: activeChatOnline || activeChatUser.status === 'online' ? "var(--status-online)" : "var(--status-offline)" 
            }} />
            {activeChatUser.type === 'group' 
              ? "3 Members Online" 
              : activeChatOnline || activeChatUser.status === 'online' 
                ? "Online" 
                : "Offline"}
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button className="header-action-btn" title="Start voice call"><Phone size={18} /></button>
        <button className="header-action-btn" title="Start video call"><Video size={18} /></button>
        <button className="header-action-btn" title="Search in chat"><Search size={18} /></button>
        <button className="header-action-btn" title="Pinned messages"><Pin size={18} /></button>
        <button className="header-action-btn" title="More options"><MoreHorizontal size={18} /></button>
      </div>
    </div>
  );
}
