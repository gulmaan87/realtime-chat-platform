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
}) {
  return (
    <div className="chat-header">
      <div className="header-left">
        <button
          className="icon-button sidebar-toggle-btn"
          onClick={onOpenSidebar}
          title="Toggle conversations"
          aria-label="Toggle conversations"
          type="button"
        >
          <Menu size={20} />
        </button>

        <div className="avatar-container" onClick={onToggleFriendship} style={{ cursor: "pointer" }}>
          <div
            className="avatar"
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

        <div className="header-info" onClick={onToggleFriendship} style={{ cursor: "pointer" }}>
          <h2>{activeChatUser?.username || activeChatUser?.email || "Select User"}</h2>
          <XpBadge xpState={xpState} levelInfo={levelInfo} />
          <p className="status-text">
            {!activeChatUser ? "Select a contact" : activeChatOnline ? "Online" : "Offline"}
          </p>
          {activeChatUser && typingState?.label ? (
            <p className="typing-emotion-indicator">{typingState.label}</p>
          ) : null}
        </div>
      </div>

      <div className="header-actions">
        <button
          className="icon-button assistant-toggle-btn"
          onClick={onOpenAssistant}
          title="Toggle assistant"
          aria-label="Toggle assistant"
          type="button"
        >
          <PanelRight size={20} />
        </button>
      </div>
    </div>
  );
}
