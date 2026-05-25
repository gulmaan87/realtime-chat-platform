import { useState } from "react";

function TimelineAvatar({ activeChatUser, getInitials, senderName, isAi }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = activeChatUser?.profilePicUrl && activeChatUser.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${activeChatUser.profilePicUrl}` : "";

  if (isAi) {
    return (
      <div className="msg-avatar ai">🤖</div>
    );
  }

  if (picUrl && !failed) {
    return (
      <div className="msg-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={picUrl}
          alt={senderName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="msg-avatar">
      {getInitials(senderName)}
    </div>
  );
}

export default function MessageTimeline({
  messages,
  userId,
  isOwnMessage,
  getInitials,
  toTime,
  messagesEndRef,
  activeChatUser,
}) {
  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const own = isOwnMessage(msg);
        const senderName = msg.from || "User";
        const isAi = msg.type === 'assistant' || msg.fromUserId === 'ai-copilot' || activeChatUser?.type === 'ai';

        return (
          <div key={msg.localId || i} className={`message-wrapper ${own ? "own" : ""}`}>
            {!own && (
              <TimelineAvatar
                activeChatUser={activeChatUser}
                getInitials={getInitials}
                senderName={senderName}
                isAi={isAi}
              />
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
