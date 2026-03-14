import { UserPlus, Phone, Video, Info } from "lucide-react";

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
        <div className="avatar" style={{ backgroundColor: getAvatarColor(activeChatUser.username), width: "40px", height: "40px" }}>
          {getInitials(activeChatUser.username)}
        </div>
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
