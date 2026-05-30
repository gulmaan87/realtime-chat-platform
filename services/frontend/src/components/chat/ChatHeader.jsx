import { Menu, UserPlus, Phone, Video, Info, Settings } from "lucide-react";

export default function ChatHeader({
  activeChatUser,
  activeChatOnline,
  getAvatarColor,
  getInitials,
  onToggleSidebar,
  onToggleDetails,
  onOpenSettings,
  statusLabel,
  onStartAudioCall,
  onStartVideoCall,
}) {
  if (!activeChatUser) {
    return (
      <div className="chat-header chat-header--empty">
        <div>
          <h2>Choose a conversation</h2>
          <span>Your recent threads and suggested contacts will appear here.</span>
        </div>
        <button type="button" className="header-utility-button mobile-only" onClick={onToggleSidebar}>
          <Menu size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="chat-header">
      <div className="header-left">
        <button type="button" className="header-utility-button mobile-only" onClick={onToggleSidebar}>
          <Menu size={18} />
        </button>

        <div className="avatar header-avatar" style={{ backgroundColor: getAvatarColor(activeChatUser.username) }}>
          {getInitials(activeChatUser.username)}
        </div>

        <div className="header-info">
          <h2>{activeChatUser.username}</h2>
          <span className={activeChatOnline ? "status-positive" : ""}>
            {statusLabel || (activeChatOnline ? "Online now" : "Quiet right now")}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button type="button" className="header-utility-button" title="Add contact">
          <UserPlus size={18} />
        </button>
        <button type="button" className="header-utility-button" title="Voice call" onClick={onStartAudioCall}>
          <Phone size={18} />
        </button>
        <button type="button" className="header-utility-button" title="Video call" onClick={onStartVideoCall}>
          <Video size={18} />
        </button>
        <button type="button" className="header-utility-button" title="Conversation details" onClick={onToggleDetails}>
          <Info size={18} />
        </button>
        <button type="button" className="header-utility-button" title="Open settings" onClick={onOpenSettings}>
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
