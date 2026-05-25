import { Paperclip, Smile, Send, Mic, Sparkles } from "lucide-react";

export default function MessageComposer({
  text,
  setText,
  sendMessage,
  inputRef,
}) {
  return (
    <div className="input-container">
      <div className="smart-composer">
        <button className="composer-action" title="Attach file">
          <Paperclip size={18} />
        </button>
        <button className="composer-action" title="Voice note">
          <Mic size={18} />
        </button>
        <button className="composer-action" title="AI Assist">
          <Sparkles size={18} color="var(--accent-secondary)" />
        </button>
        
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type your message or use /command..."
          className="composer-input"
        />
        
        <button className="composer-action" title="Insert Emoji">
          <Smile size={18} />
        </button>
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="send-btn"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
