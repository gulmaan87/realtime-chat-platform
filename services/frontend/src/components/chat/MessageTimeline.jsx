import { useState } from "react";

function TimelineAvatar({ activeChatUser, getAvatarColor, getInitials, senderName }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = activeChatUser?.profilePicUrl && activeChatUser.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${activeChatUser.profilePicUrl}` : "";

  if (picUrl && !failed) {
    return (
      <div className="avatar" style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden" }}>
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
    <div className="avatar" style={{ backgroundColor: getAvatarColor(senderName), width: "36px", height: "36px", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
      {getInitials(senderName)}
    </div>
  );
}

export default function MessageTimeline({
  messages,
  userId,
  isOwnMessage,
  getAvatarColor,
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

        return (
          <div key={msg.localId || i} className={`message-wrapper ${own ? "own" : ""}`}>
            {!own && (
              <TimelineAvatar
                activeChatUser={activeChatUser}
                getAvatarColor={getAvatarColor}
                getInitials={getInitials}
                senderName={senderName}
              />
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
