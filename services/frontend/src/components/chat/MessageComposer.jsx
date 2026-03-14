import { Paperclip, Smile, Send } from "lucide-react";

export default function MessageComposer({
  text,
  setText,
  sendMessage,
  inputRef,
}) {
  return (
    <div className="input-container">
      <div className="message-input-wrapper">
        <button className="icon-button" style={{ color: "#999" }}>
          <Paperclip size={20} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Type your message here..."
          className="message-input"
        />
        <button className="icon-button" style={{ color: "#999" }}>
          <Smile size={20} />
        </button>
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="send-button"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
