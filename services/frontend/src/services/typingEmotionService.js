export function classifyTypingEmotion(meta = {}) {
  const {
    charsPerSecond = 0,
    avgPauseMs = 0,
    backspaceRatio = 0,
    punctuationBurst = 0,
    capsRatio = 0,
  } = meta;

  let confidence = 0;
  let label = "typing…";

  if (charsPerSecond > 6.5 && punctuationBurst > 0.25) {
    label = "typing excitedly";
    confidence = 0.78;
  } else if (charsPerSecond > 5.5 && (capsRatio > 0.28 || punctuationBurst > 0.4)) {
    label = "typing aggressively";
    confidence = 0.81;
  } else if (avgPauseMs > 780 && backspaceRatio > 0.14) {
    label = "typing carefully";
    confidence = 0.76;
  } else if (charsPerSecond < 2.2 && avgPauseMs > 800) {
    label = "typing slowly";
    confidence = 0.73;
  } else if (charsPerSecond >= 2.2 && charsPerSecond <= 6.5) {
    label = "typing normally";
    confidence = 0.62;
  }

  if (confidence < 0.6) {
    return { label: "typing…", confidence };
  }

  return { label, confidence };
}

export function buildTypingMetadata(payload = {}) {
  const {
    charDelta = 0,
    intervalMs = 1,
    backspaceDelta = 0,
    pauseMs = 0,
    punctuationDelta = 0,
    capsDelta = 0,
    alphaDelta = 1,
  } = payload;

  const charsPerSecond = (charDelta * 1000) / Math.max(intervalMs, 1);
  const backspaceRatio = backspaceDelta / Math.max(charDelta + backspaceDelta, 1);
  const punctuationBurst = punctuationDelta / Math.max(charDelta, 1);
  const capsRatio = capsDelta / Math.max(alphaDelta, 1);

  return {
    charsPerSecond: Number(charsPerSecond.toFixed(2)),
    avgPauseMs: Number(Math.max(0, pauseMs).toFixed(0)),
    backspaceRatio: Number(backspaceRatio.toFixed(2)),
    punctuationBurst: Number(punctuationBurst.toFixed(2)),
    capsRatio: Number(capsRatio.toFixed(2)),
  };
}
