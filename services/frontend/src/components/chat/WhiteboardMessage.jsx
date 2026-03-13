import { Brush, Expand } from "lucide-react";

export default function WhiteboardMessage({ message }) {
  const snapshot = message?.whiteboard?.snapshotDataUrl || "";
  const strokeCount = Array.isArray(message?.whiteboard?.strokes)
    ? message.whiteboard.strokes.length
    : 0;

  return (
    <div className="whiteboard-message-card">
      <div className="whiteboard-message-card__header">
        <div className="interactive-card__badge">
          <Brush size={14} />
          <span>Shared whiteboard</span>
        </div>
        <strong>{strokeCount} strokes</strong>
      </div>

      {snapshot ? (
        <div className="whiteboard-message-card__preview">
          <img src={snapshot} alt="Shared whiteboard sketch" />
        </div>
      ) : null}

      <div className="whiteboard-message-card__footer">
        <span>Touch-friendly sketch shared in chat</span>
        <div className="whiteboard-message-card__hint">
          <Expand size={14} />
          <span>Preview snapshot</span>
        </div>
      </div>
    </div>
  );
}
