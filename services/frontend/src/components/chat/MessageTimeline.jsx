export default function MessageTimeline({
  messages,
  userId,
  isOwnMessage,
  getInitials,
  toTime,
  messagesEndRef,
}) {
  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const own = isOwnMessage(msg);
        const senderName = msg.from || "User";
        const isAi = msg.type === 'assistant' || msg.fromUserId === 'ai-copilot';

        return (
          <div key={msg.localId || i} className={`message-wrapper ${own ? "own" : ""}`}>
            {!own && (
              <div className={`msg-avatar ${isAi ? 'ai' : ''}`}>
                {isAi ? '🤖' : getInitials(senderName)}
              </div>
            )}
            <div className="msg-content">
              <div className="msg-header">
                {!own && <span className="msg-author">{senderName}</span>}
                <span className="msg-time">{toTime(msg.timestamp) || "Just now"}</span>
              </div>
              <div className="msg-bubble">
                {msg.message}
              </div>
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="msg-reactions">
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <div key={emoji} className="msg-reaction">
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
