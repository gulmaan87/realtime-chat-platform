import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCheck,
  Clock,
  Edit2,
  Lock,
  MessageCircle,
  Reply,
  Trash2,
  User,
} from "lucide-react";
import PollMessage from "./PollMessage";
import MiniGameMessage from "./MiniGameMessage";
import VoiceNoteMessage from "./VoiceNoteMessage";
import WhiteboardMessage from "./WhiteboardMessage";

const QUICK_REACTION_EMOJIS = [
  "\u{1F44D}",
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F525}",
  "\u{1F62E}",
];

function SecretMessageBody({ message, hasBeenViewed, onReveal }) {
  useEffect(() => {
    if (!hasBeenViewed) onReveal(message);
  }, [hasBeenViewed, message, onReveal]);

  return hasBeenViewed ? "Secret viewed once" : message.message;
}

export default function MessageTimeline({
  messages,
  userId,
  isOwnMessage,
  getAvatarColor,
  getInitials,
  toTime,
  messagesEndRef,
  onEdit,
  onDelete,
  onReply,
  unlockedSecrets = {},
  revealSecretBody = () => {},
  hasViewedSecretBody = () => false,
  unlockSecret = () => {},
  votePoll,
  submitMiniGameAttempt,
  applyReaction,
}) {
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const own = isOwnMessage(msg);
        const senderName = msg.from || "User";
        const isSecret = msg.type === "secret";
        const canReveal = own || unlockedSecrets[msg.localId];
        const isPending = msg.status === "pending";

        return (
          <div
            key={msg.localId || i}
            className={`message-wrapper ${own ? "own" : ""}`}
            onMouseEnter={() => setHoveredMessageId(msg.localId)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            {!own && (
              <div className="message-avatar" style={{ backgroundColor: getAvatarColor(senderName) }}>
                {getInitials(senderName)}
              </div>
            )}
            <div className="message-content">
              <div className="message-bubble-row" style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: own ? "row-reverse" : "row" }}>
                <div className={`message-bubble ${own ? "sent" : "received"} ${msg.isDeleted ? "deleted" : ""}`}>
                  {msg.isDeleted ? (
                    <div className="message-text" style={{ fontStyle: "italic", opacity: 0.6 }}>This message was deleted</div>
                  ) : isSecret && !canReveal ? (
                    <div className="secret-lock-ui" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => unlockSecret(msg)}>
                      <Lock size={14} /> <span>Secret message (Click to unlock)</span>
                    </div>
                  ) : (
                    <div className="message-text">
                      {msg.type === "poll" ? (
                        <PollMessage message={msg} currentUserId={userId} onVote={votePoll} />
                      ) : msg.type === "mini_game" ? (
                        <MiniGameMessage message={msg} currentUserId={userId} onAttempt={submitMiniGameAttempt} />
                      ) : msg.type === "voice_note" ? (
                        <VoiceNoteMessage message={msg} />
                      ) : msg.type === "whiteboard" ? (
                        <WhiteboardMessage message={msg} />
                      ) : isSecret ? (
                        <SecretMessageBody message={msg} hasBeenViewed={hasViewedSecretBody(msg)} onReveal={revealSecretBody} />
                      ) : (
                        msg.message
                      )}
                    </div>
                  )}

                  <div className="message-footer">
                    <span className="message-time">{toTime(msg.timestamp)}</span>
                    {own && (
                      <span className="message-status">
                        {isPending ? <Clock size={12} /> : <CheckCheck size={14} />}
                      </span>
                    )}
                  </div>
                </div>

                {hoveredMessageId === msg.localId && !msg.isDeleted && (
                  <div className="message-actions-inline" style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => onReply(msg)}><Reply size={14} /></button>
                    {own && <button onClick={() => onEdit(msg)}><Edit2 size={14} /></button>}
                    {own && <button onClick={() => onDelete(msg)}><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>

              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="message-reactions-row" style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <div key={emoji} className="reaction-pill" style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "8px" }}>
                      {emoji} {users.length}
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
