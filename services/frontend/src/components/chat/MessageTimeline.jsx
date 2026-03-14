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
    if (!hasBeenViewed) {
      onReveal(message);
    }
  }, [hasBeenViewed, message, onReveal]);

  return hasBeenViewed ? "Secret viewed once" : message.message;
}

export default function MessageTimeline({
  activeChatUser,
  messages,
  userId,
  isOwnMessage,
  shouldGroupMessages,
  shouldShowAvatar,
  getAvatarColor,
  getInitials,
  unlockedSecrets,
  reactionPulseId,
  highlightedMessageId,
  unlockSecret,
  hasViewedSecretBody,
  revealSecretBody,
  votePoll,
  submitMiniGameAttempt,
  toTime,
  applyReaction,
  getMessageIntentChips,
  onIntentAction,
  messagesEndRef,
  onReply,
  onEdit,
  onDelete,
}) {
  const messageRefs = useRef({});
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const target = messageRefs.current[highlightedMessageId];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedMessageId]);

  return (
    <div className="messages-container">
      <div className="messages-wrapper">
        {!activeChatUser ? (
          <div className="empty-state">
            <div className="empty-icon">
              <User size={28} />
            </div>
            <h3>Select a user to chat</h3>
            <p>Choose a contact from the sidebar to start messaging</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MessageCircle size={28} />
            </div>
            <h3>No messages yet</h3>
            <p>Start the conversation with {activeChatUser.username || activeChatUser.email}!</p>
          </div>
        ) : (
          messages.map((messageData, i) => {
            const own = isOwnMessage(messageData);
            const grouped = shouldGroupMessages(messages, i);
            const showAvatar = !own && shouldShowAvatar(messages, i);
            const senderName = messageData.from || messageData.sender || "Anonymous";
            const assistant =
              messageData.type === "assistant" || senderName === "assistant";
            const isSecret = messageData.type === "secret";
            const canReveal = own || unlockedSecrets[messageData.localId];
            const isHighlighted = highlightedMessageId === messageData.localId;
            const isPending = messageData.status === "pending";
            const replyMsg = messageData.replyTo ? messages.find(m => m.localId === messageData.replyTo) : null;

            return (
              <div
                key={messageData.localId || i}
                ref={(node) => {
                  if (messageData.localId) {
                    messageRefs.current[messageData.localId] = node;
                  }
                }}
                className={`message-wrapper ${own ? "own" : "other"} ${
                  grouped ? "grouped" : ""
                } ${isHighlighted ? "search-highlight" : ""}`}
                onMouseEnter={() => setHoveredMessageId(messageData.localId)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {showAvatar && !own ? (
                  <div
                    className="message-avatar"
                    style={{ backgroundColor: getAvatarColor(senderName) }}
                  >
                    {assistant ? <Bot size={14} /> : getInitials(senderName)}
                  </div>
                ) : null}

                {!showAvatar && !own ? <div className="avatar-spacer" /> : null}

                <div className="message-content">
                  {!own && !grouped ? (
                    <div className="message-sender">{senderName}</div>
                  ) : null}

                  <div className="message-bubble-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: own ? "row-reverse" : "row" }}>
                    <div
                      className={`message-bubble ${own ? "sent" : "received"} ${
                        assistant ? "assistant-bubble" : ""
                      } ${reactionPulseId === messageData.localId ? "reaction-pulse" : ""} ${messageData.isDeleted ? "deleted" : ""}`}
                    >
                      {replyMsg && !messageData.isDeleted && (
                        <div className="message-reply-preview" onClick={() => {
                          const target = messageRefs.current[replyMsg.localId];
                          target?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}>
                          <small><strong>{replyMsg.from || "User"}</strong>: {replyMsg.message?.substring(0, 40)}{replyMsg.message?.length > 40 ? "..." : ""}</small>
                        </div>
                      )}
                      {messageData.isDeleted ? (
                        <div className="message-text deleted-text" style={{ fontStyle: "italic", opacity: 0.6 }}>
                          This message was deleted
                        </div>
                      ) : isSecret && !canReveal ? (
                        <div className="secret-preview-card secret-preview-card--premium">
                          <div className="secret-title">
                            <Lock size={14} /> Secret message
                          </div>
                          <p>Hidden preview. Unlock required.</p>
                          <div className="secret-preview-mask" aria-hidden="true" />
                          <button
                            type="button"
                            className="secret-unlock-btn"
                            onClick={() => unlockSecret(messageData)}
                          >
                            Unlock
                          </button>
                        </div>
                      ) : (
                        <div className="message-text">
                          {messageData.type === "poll" && messageData.poll ? (
                            <PollMessage
                              message={messageData}
                              currentUserId={userId}
                              onVote={votePoll}
                            />
                          ) : messageData.type === "mini_game" && messageData.miniGame ? (
                            <MiniGameMessage
                              message={messageData}
                              currentUserId={userId}
                              onAttempt={submitMiniGameAttempt}
                            />
                          ) : messageData.type === "voice_note" && messageData.voiceNote ? (
                            <VoiceNoteMessage message={messageData} />
                          ) : messageData.type === "whiteboard" && messageData.whiteboard ? (
                            <WhiteboardMessage message={messageData} />
                          ) : isSecret ? (
                            <SecretMessageBody
                              message={messageData}
                              hasBeenViewed={hasViewedSecretBody(messageData)}
                              onReveal={revealSecretBody}
                            />
                          ) : (
                            messageData.message
                          )}
                        </div>
                      )}

                      <div className="message-footer">
                        {messageData.isEdited && !messageData.isDeleted && (
                          <span className="message-edited" style={{ fontSize: "10px", opacity: 0.7, marginRight: "4px" }}>(edited)</span>
                        )}
                        <span className="message-time">{toTime(messageData.timestamp)}</span>
                        {own ? (
                          <span className="message-status">
                            {isPending ? <Clock size={12} /> : <CheckCheck size={14} />}
                          </span>
                        ) : null}
                      </div>

                      {!assistant && !messageData.isDeleted ? (
                        <>
                          <div className="message-reactions">
                            {QUICK_REACTION_EMOJIS.map((emoji) => {
                              const count = Array.isArray(messageData.reactions?.[emoji])
                                ? messageData.reactions[emoji].length
                                : 0;
                              const mine =
                                Array.isArray(messageData.reactions?.[emoji]) &&
                                messageData.reactions[emoji].includes(String(userId));

                              if (count === 0 && hoveredMessageId !== messageData.localId) return null;

                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={`reaction-chip ${mine ? "mine" : ""}`}
                                  onClick={() => applyReaction(messageData, emoji)}
                                >
                                  <span aria-label="Reaction">{emoji}</span>
                                  {count > 0 ? <small>{count}</small> : null}
                                </button>
                              );
                            })}
                          </div>

                          {getMessageIntentChips(messageData).length > 0 ? (
                            <div className="intent-action-chips">
                              {getMessageIntentChips(messageData).map((intent) => (
                                <button
                                  key={intent.key}
                                  type="button"
                                  className="intent-chip"
                                  onClick={() => onIntentAction(messageData, intent)}
                                >
                                  {intent.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    {!messageData.isDeleted && hoveredMessageId === messageData.localId && (
                      <div className="message-actions" style={{ display: "flex", gap: "4px", opacity: 0.7 }}>
                        <button type="button" onClick={() => onReply(messageData)} title="Reply" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                          <Reply size={14} />
                        </button>
                        {own && messageData.type === "text" && (
                          <button type="button" onClick={() => onEdit(messageData)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                            <Edit2 size={14} />
                          </button>
                        )}
                        {own && (
                          <button type="button" onClick={() => onDelete(messageData)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
