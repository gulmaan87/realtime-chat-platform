import { Sparkles } from "lucide-react";

export default function MessageTimeline({
  messages,
  isOwnMessage,
  getAvatarColor,
  getInitials,
  toTime,
  messagesEndRef,
  emptyTitle,
  emptyDescription,
}) {
  if (!messages.length) {
    return (
      <div className="messages-container messages-container--empty">
        <div className="messages-empty-state">
          <div className="messages-empty-state__icon">
            <Sparkles size={18} />
          </div>
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const own = isOwnMessage(msg);
        const senderName = msg.from || msg.username || "User";

        return (
          <div key={msg.localId || i} className={`message-wrapper ${own ? "own" : ""}`}>
            {!own && (
              <div
                className="avatar message-avatar"
                style={{ backgroundColor: getAvatarColor(senderName) }}
              >
                {getInitials(senderName)}
              </div>
            )}

            <div className="message-content">
              {!own && <span className="message-sender">{senderName}</span>}
              <div className="message-bubble">{msg.message}</div>
              <div className="message-meta">
                <span className="message-time">{toTime(msg.timestamp)}</span>
                {own ? <span className="message-status">Delivered</span> : null}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
