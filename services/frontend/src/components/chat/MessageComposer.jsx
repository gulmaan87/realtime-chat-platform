import { Lock, PenSquare, Send, Sparkles } from "lucide-react";
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
}) {
  return (
    <div className="input-container">
      <div className="input-wrapper">
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
            disabled={!activeChatUser || !isConnected}
            triggerClassName="utility-trigger"
          />
          <VoiceNoteComposer
            onSendVoiceNote={sendVoiceNote}
            disabled={!activeChatUser || !isConnected}
          />
          <button
            type="button"
            className="voice-note-trigger utility-trigger"
            disabled={!activeChatUser || !isConnected}
            onClick={() => setIsWhiteboardOpen(true)}
            title="Whiteboard"
            aria-label="Whiteboard"
          >
            <PenSquare size={16} />
          </button>
        </div>

        <WhiteboardComposer
          disabled={!activeChatUser || !isConnected}
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
                : "Connecting..."
            }
            disabled={!isConnected || !activeChatUser}
            className="message-input"
          />

          <button
            onClick={sendMessage}
            disabled={!text.trim() || !isConnected || !activeChatUser}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
