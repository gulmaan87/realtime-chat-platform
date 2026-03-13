import { useEffect, useRef } from "react";
import {
  Bot,
  CheckCheck,
  Lock,
  MessageCircle,
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
}) {
  const messageRefs = useRef({});

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

                  <div
                    className={`message-bubble ${own ? "sent" : "received"} ${
                      assistant ? "assistant-bubble" : ""
                    } ${reactionPulseId === messageData.localId ? "reaction-pulse" : ""}`}
                  >
                    {isSecret && !canReveal ? (
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
                      <span className="message-time">{toTime(messageData.timestamp)}</span>
                      {own ? (
                        <span className="message-status">
                          <CheckCheck size={14} />
                        </span>
                      ) : null}
                    </div>

                    {!assistant ? (
                      <>
                        <div className="message-reactions">
                          {QUICK_REACTION_EMOJIS.map((emoji) => {
                            const count = Array.isArray(messageData.reactions?.[emoji])
                              ? messageData.reactions[emoji].length
                              : 0;
                            const mine =
                              Array.isArray(messageData.reactions?.[emoji]) &&
                              messageData.reactions[emoji].includes(String(userId));

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
