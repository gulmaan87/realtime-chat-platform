import { Clock, Lock, PenSquare, Send, Sparkles, X, Paperclip, Smile } from "lucide-react";
import InteractiveComposer from "./InteractiveComposer";
import VoiceNoteComposer from "./VoiceNoteComposer";
import WhiteboardComposer from "./WhiteboardComposer";

export default function MessageComposer({
  activeChatUser,
  text,
  smartReplies = [],
  setText,
  outgoingTonePreview = {},
  isConnected,
  secretMode,
  setSecretMode,
  sendMessage,
  replyingTo,
  cancelReply,
  editingMessage,
  cancelEdit,
  scheduledFor,
  setScheduledFor,
  submitPoll,
  sendMiniGame,
  sendVoiceNote,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  sendWhiteboard,
  remoteWhiteboardStrokes,
  syncWhiteboardStroke,
  inputRef,
}) {
  return (
    <div className="input-container">
      {replyingTo && (
        <div className="composer-reply-preview" style={{ padding: "8px", background: "rgba(0,0,0,0.05)", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
          <div><small>Replying to <strong>{replyingTo.from}</strong></small><p style={{ margin: 0, fontSize: "0.8rem" }}>{replyingTo.message}</p></div>
          <button onClick={cancelReply}><X size={14} /></button>
        </div>
      )}

      <div className="composer-utility-bar">
        <InteractiveComposer onSendPoll={submitPoll} onSendMiniGame={sendMiniGame} disabled={!activeChatUser} />
        <VoiceNoteComposer onSendVoiceNote={sendVoiceNote} disabled={!activeChatUser} />
        <button className="rail-button" onClick={() => setIsWhiteboardOpen(true)} title="Whiteboard"><PenSquare size={20} /></button>
        
        {smartReplies.length > 0 && !text.trim() && (
          <div className="smart-reply-cards" style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
            {smartReplies.slice(0, 3).map(reply => (
              <button key={reply} className="smart-reply-card" onClick={() => setText(reply)} style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "8px", border: "1px solid #ddd" }}>{reply}</button>
            ))}
          </div>
        )}
      </div>

      <WhiteboardComposer
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        onSendWhiteboard={sendWhiteboard}
        remoteStrokes={remoteWhiteboardStrokes}
        onSyncStroke={syncWhiteboardStroke}
      />

      <div className="message-input-wrapper">
        <button className="icon-button" style={{ color: secretMode ? "var(--accent-primary)" : "#999" }} onClick={() => setSecretMode(!secretMode)}>
          <Lock size={20} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder={secretMode ? "Send secret message..." : "Type your message here..."}
          className="message-input"
        />
        <button className="send-button" onClick={sendMessage} disabled={!text.trim()}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
