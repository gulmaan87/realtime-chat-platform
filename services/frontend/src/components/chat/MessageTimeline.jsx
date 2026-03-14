export default function MessageTimeline({
  messages,
  userId,
  isOwnMessage,
  getAvatarColor,
  getInitials,
  toTime,
  messagesEndRef,
}) {
  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const own = isOwnMessage(msg);
        const senderName = msg.from || "User";

        return (
          <div key={msg.localId || i} className={`message-wrapper ${own ? "own" : ""}`}>
            {!own && (
              <div className="avatar" style={{ backgroundColor: getAvatarColor(senderName), width: "36px", height: "36px", fontSize: "0.8rem" }}>
                {getInitials(senderName)}
              </div>
            )}
            <div className="message-content">
              <div className="message-bubble">
                {msg.message}
              </div>
              <span className="message-time">{toTime(msg.timestamp)}</span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
