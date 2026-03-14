import { Menu, PanelRight } from "lucide-react";
import XpBadge from "./XpBadge";

export default function ChatHeader({
  activeChatUser,
  activeChatOnline,
  typingState,
  xpState,
  levelInfo,
  getAvatarColor,
  getInitials,
  onToggleFriendship,
  onOpenSidebar,
  onOpenAssistant,
  isSidebarOpen,
  isAssistantOpen,
}) {
  return (
    <div className="chat-header">
      <div className="header-left" onClick={onToggleFriendship}>
        <div className="avatar-container">
          <div
            className="avatar header-avatar"
            style={{
              backgroundColor: getAvatarColor(
                activeChatUser?.username || activeChatUser?.email || "Chat"
              ),
            }}
          >
            <span>
              {activeChatUser
                ? getInitials(activeChatUser.username || activeChatUser.email)
                : "?"}
            </span>
          </div>
          {activeChatUser && activeChatOnline ? <div className="online-indicator" /> : null}
        </div>

        <div className="header-info">
          <h2>{activeChatUser?.username || activeChatUser?.email || "Select User"}</h2>
          {activeChatUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-text">{activeChatOnline ? "Online" : "Offline"}</span>
              <XpBadge xpState={xpState} levelInfo={levelInfo} />
            </div>
          )}
          {activeChatUser && typingState?.label ? (
            <p className="typing-emotion-indicator">{typingState.label}</p>
          ) : null}
        </div>
      </div>

      <div className="header-actions">
        <button
          className={`rail-button ${isSidebarOpen ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onOpenSidebar(); }}
          title="Toggle conversations"
        >
          <Menu size={20} />
        </button>
        <button
          className={`rail-button ${isAssistantOpen ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onOpenAssistant(); }}
          title="Toggle assistant"
        >
          <PanelRight size={20} />
        </button>
      </div>
    </div>
  );
}
