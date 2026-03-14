import { Clock, Lock, PenSquare, Send, Sparkles, X } from "lucide-react";
import InteractiveComposer from "./InteractiveComposer";
import VoiceNoteComposer from "./VoiceNoteComposer";
import WhiteboardComposer from "./WhiteboardComposer";

export default function MessageComposer({
  activeChatUser,
  text,
  smartReplies,
  setText,
  outgoingTonePreview,
  toneMode,
  setToneMode,
  commandSuggestions,
  activeCommandIndex,
  setCommandSuggestions,
  inputRef,
  submitPoll,
  sendMiniGame,
  sendVoiceNote,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  sendWhiteboard,
  remoteWhiteboardStrokes,
  syncWhiteboardStroke,
  isConnected,
  secretMode,
  setSecretMode,
  handleTypingInput,
  setActiveCommandIndex,
  sendMessage,
  replyingTo,
  cancelReply,
  editingMessage,
  cancelEdit,
  scheduledFor,
  setScheduledFor,
}) {
  return (
    <div className="input-container">
      <div className="input-wrapper">
        {replyingTo && (
          <div className="composer-reply-preview" style={{ padding: "8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <small>Replying to <strong>{replyingTo.from || "User"}</strong></small>
              <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>{replyingTo.message?.substring(0, 50)}</p>
            </div>
            <button onClick={cancelReply} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button>
          </div>
        )}
        {editingMessage && (
          <div className="composer-edit-preview" style={{ padding: "8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <small>Editing message</small>
              <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>{editingMessage.message?.substring(0, 50)}</p>
            </div>
            <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button>
          </div>
        )}

        {activeChatUser && !text.trim() && smartReplies.length > 0 ? (
          <div className="smart-reply-row">
            <div className="smart-reply-title">
              <Sparkles size={14} /> Quick replies
            </div>
            <div className="smart-reply-cards">
              {smartReplies.slice(0, 5).map((reply) => (
                <button
                  key={reply}
                  className="smart-reply-card"
                  onClick={() => setText(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {text.trim() && !text.trim().startsWith("/") ? (
          <div className="tone-preview-panel tone-preview-panel--premium">
            <div className="tone-preview-header">
              <div>
                <p className="tone-preview-eyebrow">Tone helper</p>
                <span>Auto tone converter</span>
              </div>
              <select value={toneMode} onChange={(e) => setToneMode(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
              </select>
            </div>

            <div className="tone-preview-grid">
              <div>
                <small>Original draft</small>
                <p>{text}</p>
              </div>
              <div>
                <small>Converted preview</small>
                <p>{outgoingTonePreview.rewritten}</p>
              </div>
            </div>

            <div className="tone-preview-actions">
              <button onClick={() => setText(outgoingTonePreview.rewritten || text)}>
                Use converted
              </button>
              <span>{outgoingTonePreview.reason}</span>
            </div>
          </div>
        ) : null}

        {commandSuggestions.length > 0 ? (
          <div className="command-menu">
            {commandSuggestions.map((cmd, index) => (
              <button
                key={cmd.name}
                className={`command-item ${index === activeCommandIndex ? "active" : ""}`}
                onClick={() => {
                  setText(`${cmd.name} `);
                  setCommandSuggestions([]);
                  inputRef.current?.focus();
                }}
              >
                <span>{cmd.name}</span>
                <small>{cmd.description}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="composer-utility-bar">
          <InteractiveComposer
            onSendPoll={submitPoll}
            onSendMiniGame={sendMiniGame}
            disabled={!activeChatUser}
            triggerClassName="utility-trigger"
          />
          <VoiceNoteComposer
            onSendVoiceNote={sendVoiceNote}
            disabled={!activeChatUser}
          />
          <button
            type="button"
            className="voice-note-trigger utility-trigger"
            disabled={!activeChatUser}
            onClick={() => setIsWhiteboardOpen(true)}
            title="Whiteboard"
            aria-label="Whiteboard"
          >
            <PenSquare size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
            <input 
              type="datetime-local" 
              value={scheduledFor || ""} 
              onChange={(e) => setScheduledFor(e.target.value)} 
              style={{ fontSize: "12px", padding: "4px", borderRadius: "4px", border: "1px solid #ccc", background: "var(--input-bg)" }}
              title="Schedule message"
            />
            <Clock size={16} style={{ opacity: 0.6 }} />
          </div>
        </div>

        <WhiteboardComposer
          disabled={!activeChatUser}
          isOpen={isWhiteboardOpen}
          onClose={() => setIsWhiteboardOpen(false)}
          onSendWhiteboard={sendWhiteboard}
          remoteStrokes={remoteWhiteboardStrokes}
          onSyncStroke={syncWhiteboardStroke}
        />

        <div className="message-input-wrapper">
          <button
            className={`secret-mode-toggle ${secretMode ? "active" : ""}`}
            onClick={() => setSecretMode((prev) => !prev)}
            title="Secret mode"
          >
            <Lock size={16} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTypingInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (
                commandSuggestions.length > 0 &&
                (e.key === "ArrowDown" || e.key === "ArrowUp")
              ) {
                e.preventDefault();
                setActiveCommandIndex((prev) => {
                  if (e.key === "ArrowDown") {
                    return (prev + 1) % commandSuggestions.length;
                  }
                  return prev === 0 ? commandSuggestions.length - 1 : prev - 1;
                });
                return;
              }

              if (commandSuggestions.length > 0 && e.key === "Tab") {
                e.preventDefault();
                const selected = commandSuggestions[activeCommandIndex];
                if (selected) {
                  setText(`${selected.name} `);
                  setCommandSuggestions([]);
                }
                return;
              }

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              !activeChatUser
                ? "Select a user to chat"
                : isConnected
                ? secretMode
                  ? "Send secret message"
                  : "Type a message or /command"
                : "Offline - Message will be queued"
            }
            disabled={!activeChatUser}
            className="message-input"
          />

          <button
            onClick={sendMessage}
            disabled={!text.trim() || !activeChatUser}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
