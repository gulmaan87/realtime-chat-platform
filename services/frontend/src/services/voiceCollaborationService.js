function cleanWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function detectVoiceEmotionTag({ transcript = "", averageLevel = 0 }) {
  const normalized = cleanWhitespace(transcript).toLowerCase();

  const urgentScore =
    countMatches(normalized, /\b(urgent|asap|now|immediately|quickly|hurry)\b/g) +
    (averageLevel > 0.65 ? 1 : 0);
  const warmScore = countMatches(
    normalized,
    /\b(thanks|thank you|love|appreciate|excited|great|awesome)\b/g
  );
  const calmScore =
    countMatches(normalized, /\b(okay|alright|fine|noted|later|tomorrow|whenever)\b/g) +
    (averageLevel < 0.28 ? 1 : 0);

  if (urgentScore >= 2) return "Urgent";
  if (warmScore >= 2) return "Warm";
  if (calmScore >= 2) return "Calm";
  if (averageLevel > 0.48) return "Energetic";
  return "Neutral";
}

export function createWaveformSnapshot(levels = []) {
  if (!Array.isArray(levels) || levels.length === 0) return [];

  const safeLevels = levels.map((value) =>
    Math.max(0, Math.min(1, Number(value) || 0))
  );
  const bucketCount = 20;
  const bucketSize = Math.max(1, Math.ceil(safeLevels.length / bucketCount));
  const waveform = [];

  for (let index = 0; index < safeLevels.length; index += bucketSize) {
    const segment = safeLevels.slice(index, index + bucketSize);
    const average =
      segment.reduce((sum, value) => sum + value, 0) / Math.max(1, segment.length);
    waveform.push(Number(average.toFixed(3)));
  }

  return waveform.slice(0, bucketCount);
}

export function getVoiceTranscriptPreview(transcript = "") {
  const normalized = cleanWhitespace(transcript);
  if (!normalized) return "Voice note";
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 69)}...`;
}

export function getSearchableMessageText(message = {}) {
  const transcript = cleanWhitespace(message?.voiceNote?.transcript || "");
  const baseText = cleanWhitespace(message?.message || message?.text || "");
  return transcript || baseText;
}

export async function blobToDataUrl(blob) {
  if (!blob) return "";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
