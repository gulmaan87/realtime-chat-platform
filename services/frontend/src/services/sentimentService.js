const MOOD_KEYWORDS = {
  happy: ["happy", "awesome", "great", "amazing", "yay", "fun", "nice", "lol", "haha", "love it"],
  sad: ["sad", "down", "upset", "sorry", "miss", "alone", "tired", "bad day", "depressed"],
  angry: ["angry", "mad", "hate", "annoyed", "stupid", "wtf", "damn", "furious", "idiot"],
  romantic: ["love", "dear", "sweet", "babe", "darling", "xoxo", "cute", "miss you", "❤️"],
};

const EMOJI_WEIGHTS = {
  happy: ["😀", "😄", "😁", "😊", "🎉", "✨", "😎"],
  sad: ["😢", "😭", "🥺", "💔", "😞", "☹️"],
  angry: ["😡", "🤬", "😠", "💢"],
  romantic: ["❤️", "💕", "😍", "😘", "💖", "💘"],
};

const MOOD_TYPES = ["happy", "sad", "angry", "romantic", "neutral"];

function normalizeMessageText(message) {
  if (!message) return "";
  if (typeof message === "string") return message.toLowerCase();
  return String(message.message || message.text || "").toLowerCase();
}

function punctuationIntensity(text) {
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  return exclamationCount * 1.3 + questionCount * 0.6 + capsWords * 1.8;
}

export function analyzeConversationMood(messages, options = {}) {
  const rollingWindow = Math.max(6, options.rollingWindow || 18);
  const recent = messages.slice(-rollingWindow);

  const score = {
    happy: 0,
    sad: 0,
    angry: 0,
    romantic: 0,
    neutral: 0.5,
  };

  recent.forEach((entry) => {
    const text = normalizeMessageText(entry);
    if (!text) return;

    Object.entries(MOOD_KEYWORDS).forEach(([mood, keywords]) => {
      keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          score[mood] += 1.5;
        }
      });
    });

    Object.entries(EMOJI_WEIGHTS).forEach(([mood, emojis]) => {
      emojis.forEach((emoji) => {
        if (text.includes(emoji)) {
          score[mood] += 2;
        }
      });
    });

    const intensity = punctuationIntensity(text);
    if (intensity >= 4.5) {
      score.angry += 0.8;
      score.happy += 0.3;
    }
  });

  const dominant = MOOD_TYPES.reduce((acc, mood) => {
    if ((score[mood] || 0) > (score[acc] || 0)) {
      return mood;
    }
    return acc;
  }, "neutral");

  return {
    mood: dominant,
    score,
    confidence: Number(((score[dominant] || 0) / Math.max(1, recent.length)).toFixed(2)),
  };
}
