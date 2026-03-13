import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Palette, PenLine, Send, Trash2, X } from "lucide-react";
import {
  buildWhiteboardSyncPayload,
  createWhiteboardStroke,
  normalizeWhiteboardPoint,
} from "../../services/whiteboardCollaborationService";

const COLORS = ["#22d3ee", "#8b5cf6", "#f472b6", "#f59e0b", "#f8fafc"];

function drawStroke(context, stroke) {
  if (!context || !stroke?.points?.length) return;

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();

  stroke.points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  context.stroke();
}

function redrawCanvas(canvas, strokes) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#08101d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => drawStroke(context, stroke));
}

export default function WhiteboardComposer({
  disabled,
  isOpen,
  onClose,
  onSendWhiteboard,
  remoteStrokes = [],
  onSyncStroke,
}) {
  const [strokes, setStrokes] = useState([]);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [activeWidth, setActiveWidth] = useState(3);
  const boardId = useId();
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const syncFrameRef = useRef(0);

  const collaborativeStrokes = useMemo(() => {
    const next = [...strokes];

    remoteStrokes.forEach((entry) => {
      if (!entry?.stroke || entry.boardId !== `board-live-${boardId}`) return;

      const existingIndex = next.findIndex((stroke) => stroke.id === entry.stroke.id);
      if (existingIndex >= 0) {
        next[existingIndex] = entry.stroke;
      } else {
        next.push(entry.stroke);
      }
    });

    return next;
  }, [boardId, remoteStrokes, strokes]);

  useEffect(() => {
    if (!isOpen) return;
    redrawCanvas(canvasRef.current, collaborativeStrokes);
  }, [collaborativeStrokes, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(220, Math.floor(rect.height));
      redrawCanvas(canvas, collaborativeStrokes);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [collaborativeStrokes, isOpen]);

  const canSend = useMemo(() => collaborativeStrokes.length > 0, [collaborativeStrokes.length]);

  const flushSync = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas || !stroke) return;

    onSyncStroke?.(
      buildWhiteboardSyncPayload({
        boardId: `board-live-${boardId}`,
        stroke,
        width: canvas.width,
        height: canvas.height,
      })
    );
  };

  const queueSync = (stroke) => {
    if (syncFrameRef.current) cancelAnimationFrame(syncFrameRef.current);
    syncFrameRef.current = requestAnimationFrame(() => {
      flushSync(stroke);
      syncFrameRef.current = 0;
    });
  };

  const startStroke = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const firstPoint = normalizeWhiteboardPoint({ x: clientX, y: clientY, rect });
    const stroke = createWhiteboardStroke({
      color: activeColor,
      width: activeWidth,
      points: [firstPoint],
    });

    currentStrokeRef.current = stroke;
    setStrokes((prev) => [...prev, stroke]);
    queueSync(stroke);
  };

  const moveStroke = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const currentStroke = currentStrokeRef.current;
    if (!canvas || !currentStroke) return;

    const rect = canvas.getBoundingClientRect();
    const point = normalizeWhiteboardPoint({ x: clientX, y: clientY, rect });
    const nextStroke = {
      ...currentStroke,
      points: [...currentStroke.points, point],
    };

    currentStrokeRef.current = nextStroke;
    setStrokes((prev) =>
      prev.map((stroke) => (stroke.id === nextStroke.id ? nextStroke : stroke))
    );
    queueSync(nextStroke);
  };

  const endStroke = () => {
    if (!currentStrokeRef.current) return;
    flushSync(currentStrokeRef.current);
    currentStrokeRef.current = null;
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    startStroke(event.clientX, event.clientY);
  };

  const handlePointerMove = (event) => {
    if (!currentStrokeRef.current) return;
    event.preventDefault();
    moveStroke(event.clientX, event.clientY);
  };

  const handleClear = () => {
    setStrokes([]);
    currentStrokeRef.current = null;
    redrawCanvas(canvasRef.current, []);
  };

  const handleClose = () => {
    handleClear();
    onClose?.();
  };

  const handleSend = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canSend) return;

    await onSendWhiteboard?.({
      snapshotDataUrl: canvas.toDataURL("image/png"),
      strokes: collaborativeStrokes,
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="whiteboard-modal" role="dialog" aria-modal="true" aria-label="Whiteboard">
      <button
        type="button"
        className="whiteboard-backdrop"
        aria-label="Close whiteboard"
        onClick={handleClose}
      />

      <div className="whiteboard-panel">
        <div className="whiteboard-panel__header">
          <div>
            <p className="interactive-composer-panel__eyebrow">Shared whiteboard</p>
            <h3>Sketch something in chat</h3>
          </div>
          <button type="button" className="icon-button" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="whiteboard-toolbar">
          <div className="whiteboard-toolbar__group">
            <div className="interactive-card__badge">
              <PenLine size={14} />
              <span>Touch ready</span>
            </div>
            <div className="interactive-card__badge">
              <Palette size={14} />
              <span>Live sync</span>
            </div>
          </div>

          <div className="whiteboard-toolbar__group">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`whiteboard-color ${activeColor === color ? "active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setActiveColor(color)}
              />
            ))}

            <input
              type="range"
              min="2"
              max="10"
              value={activeWidth}
              onChange={(event) => setActiveWidth(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="whiteboard-canvas-shell">
          <canvas
            ref={canvasRef}
            className="whiteboard-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
        </div>

        <div className="interactive-actions">
          <button type="button" onClick={handleClear} disabled={disabled || !canSend}>
            <Trash2 size={14} />
            Clear
          </button>
          <button type="button" onClick={handleSend} disabled={disabled || !canSend}>
            <Send size={14} />
            Share sketch
          </button>
        </div>
      </div>
    </div>
  );
}
