import { Paperclip, Smile, Send, Zap } from "lucide-react";

export default function MessageComposer({
  text,
  setText,
  sendMessage,
  inputRef,
  draftLabel,
  quickReplies = [],
  onApplyQuickReply,
}) {
  return (
    <div className="input-container">
      {quickReplies.length ? (
        <div className="quick-replies">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              className="quick-reply-chip"
              onClick={() => onApplyQuickReply?.(reply)}
            >
              <Zap size={14} />
              {reply}
            </button>
          ))}
        </div>
      ) : null}

      <div className="message-input-wrapper">
        <button className="icon-button" type="button" title="Attach file">
          <Paperclip size={18} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Type a message, idea, or update"
          className="message-input"
          aria-label="Message input"
        />
        <button className="icon-button" type="button" title="Emoji picker">
          <Smile size={18} />
        </button>
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="send-button"
          type="button"
        >
          <Send size={18} />
          Send
        </button>
      </div>

      <div className="composer-footer">
        <span>{draftLabel}</span>
        <span>{text.trim().length ? `${text.trim().length}/500` : "Press Enter to send"}</span>
      </div>
    </div>
  );
}
