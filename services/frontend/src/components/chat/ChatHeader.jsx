import { useState } from "react";
import { UserPlus, Phone, Video, Info } from "lucide-react";

function HeaderAvatar({ contact, getAvatarColor, getInitials }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = contact?.profilePicUrl && contact.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${contact.profilePicUrl}` : "";

  if (picUrl && !failed) {
    return (
      <div className="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden" }}>
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
    <div className="avatar" style={{ backgroundColor: getAvatarColor(contact.username), width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
      {getInitials(contact.username)}
    </div>
  );
}

export default function ChatHeader({
  activeChatUser,
  activeChatOnline,
  getAvatarColor,
  getInitials,
}) {
  if (!activeChatUser) return <div className="chat-header">Select a conversation</div>;

  return (
    <div className="chat-header">
      <div className="header-left">
        <HeaderAvatar contact={activeChatUser} getAvatarColor={getAvatarColor} getInitials={getInitials} />
        <div className="header-info">
          <h2>{activeChatUser.username}</h2>
          <span style={{ color: activeChatOnline ? "var(--accent-success)" : "var(--text-muted)", fontSize: "0.8rem" }}>
            {activeChatOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button><UserPlus size={20} /></button>
        <button><Phone size={20} /></button>
        <button><Video size={20} /></button>
        <button><Info size={20} /></button>
      </div>
    </div>
  );
}
