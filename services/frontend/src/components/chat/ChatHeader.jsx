import { Phone, Video, Search, Pin, MoreHorizontal } from "lucide-react";

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
          <div className={`contact-avatar ${activeChatUser.type === 'ai' ? 'ai' : ''}`}>
            {activeChatUser.type === 'ai' ? '🤖' : getInitials(activeChatUser.username)}
          </div>
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
