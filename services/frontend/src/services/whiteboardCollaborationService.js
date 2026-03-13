function clampPoint(value, max) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(max, numeric));
}

export function createWhiteboardStroke({
  strokeId,
  color = "#22d3ee",
  width = 3,
  points = [],
}) {
  return {
    id: strokeId || `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    color,
    width,
    points: Array.isArray(points) ? points : [],
  };
}

export function normalizeWhiteboardPoint({ x, y, rect }) {
  return {
    x: clampPoint(x - rect.left, rect.width),
    y: clampPoint(y - rect.top, rect.height),
  };
}

export function buildWhiteboardSyncPayload({
  boardId,
  stroke,
  width,
  height,
}) {
  return {
    boardId,
    stroke,
    width,
    height,
    timestamp: Date.now(),
  };
}

export function buildWhiteboardMessage({
  userId,
  chatPartnerId,
  userName,
  snapshotDataUrl,
  strokes = [],
}) {
  const timestamp = Date.now();

  return {
    localId: `whiteboard-${String(userId)}-${String(chatPartnerId)}-${timestamp}`,
    type: "whiteboard",
    message: "Shared a whiteboard sketch",
    timestamp,
    from: userName,
    fromUserId: userId,
    to: chatPartnerId,
    toUserId: chatPartnerId,
    whiteboard: {
      id: `board-${timestamp}`,
      snapshotDataUrl,
      strokes,
    },
    reactions: {},
  };
}
