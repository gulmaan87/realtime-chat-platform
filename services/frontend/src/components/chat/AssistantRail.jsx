import { Mail, Calendar, User, BarChart3, Clock3, ShieldCheck } from "lucide-react";

export default function AssistantRail({ activeChatUser, conversationMeta, lastActiveLabel }) {
  if (!activeChatUser) {
    return (
      <div className="chat-details-shell">
        <div className="details-empty-state">
          <strong>Conversation brief</strong>
          <p>Select a contact to inspect momentum, profile details, and shared context.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-details-shell">
      <div className="details-profile-card">
        <div className="profile-large-avatar">
          {activeChatUser.username?.slice(0, 2).toUpperCase() || "LU"}
        </div>
        <h3 className="profile-name">{activeChatUser.username}</h3>
        <p className="profile-role">{activeChatUser.status || "Available for conversation"}</p>
      </div>

      <div className="details-stat-grid">
        <div className="details-stat-card">
          <BarChart3 size={16} />
          <strong>{conversationMeta.totalMessages}</strong>
          <span>Messages loaded</span>
        </div>
        <div className="details-stat-card">
          <Clock3 size={16} />
          <strong>{lastActiveLabel}</strong>
          <span>Last activity</span>
        </div>
      </div>

      <div className="info-section">
        <div className="info-item">
          <Mail size={18} className="info-icon" />
          <div className="info-content">
            <label>Email</label>
            <p>{activeChatUser.email || "No email available"}</p>
          </div>
        </div>
        <div className="info-item">
          <Calendar size={18} className="info-icon" />
          <div className="info-content">
            <label>Thread mood</label>
            <p>{conversationMeta.moodLabel}</p>
          </div>
        </div>
        <div className="info-item">
          <User size={18} className="info-icon" />
          <div className="info-content">
            <label>Response pattern</label>
            <p>{conversationMeta.responseLabel}</p>
          </div>
        </div>
      </div>

      <div className="assistant-insight-card">
        <div className="assistant-insight-card__header">
          <ShieldCheck size={16} />
          <span>Conversation insight</span>
        </div>
        <strong>{conversationMeta.insightTitle}</strong>
        <p>{conversationMeta.insightBody}</p>
      </div>
    </div>
  );
}
