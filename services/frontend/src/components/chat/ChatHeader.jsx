import { LogOut, Menu, PanelRight, Settings } from "lucide-react";
import XpBadge from "./XpBadge";

export default function ChatHeader({
  activeChatUser,
  activeChatOnline,
  typingState,
  xpState,
  levelInfo,
  getAvatarColor,
  getInitials,
  onLogout,
  onSettings,
  onOpenSidebar,
  onOpenAssistant,
}) {
  return (
    <div className="chat-header">
      <div className="chat-header__mobile-actions">
        <button
          className="icon-button chat-mobile-trigger"
          onClick={onOpenSidebar}
          title="Open conversations"
          aria-label="Open conversations"
          type="button"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="header-left">
        <div className="avatar-container">
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

        <div className="header-info">
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
          className="icon-button chat-mobile-trigger"
          onClick={onOpenAssistant}
          title="Open assistant"
          aria-label="Open assistant"
          type="button"
        >
          <PanelRight size={20} />
        </button>
        <button className="icon-button" onClick={onLogout} title="Logout">
          <LogOut size={20} />
        </button>
        <button className="icon-button" onClick={onSettings} title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
