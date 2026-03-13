const TONE_RULES = {
  professional: (text) => text
    .replace(/\bhey\b/gi, "Hello")
    .replace(/\bok\b/gi, "Understood")
    .replace(/\bthanks\b/gi, "Thank you")
    .replace(/\bgonna\b/gi, "going to"),
  friendly: (text) => `${text}${text.endsWith("!") ? "" : " 🙂"}`,
  concise: (text) => text.split(/[.!?]/).filter(Boolean)[0]?.trim() ? `${text.split(/[.!?]/).filter(Boolean)[0].trim()}.` : text,
};

export function generateTonePreview({ draft = "", tone = "professional" }) {
  const normalized = String(draft || "").trim();
  if (!normalized) {
    return { rewritten: "", reason: "Draft is empty." };
  }

  const rule = TONE_RULES[tone] || TONE_RULES.professional;
  const rewritten = rule(normalized);

  return {
    rewritten,
    reason: `Tone adjusted to ${tone} for clarity and readability.`,
  };
}

export function detectIntentActions(message = "") {
  const text = String(message || "").toLowerCase();
  if (!text) return [];

  const intents = [];

  if (/(meet|meeting|schedule|tomorrow|today at|call at)/.test(text)) {
    intents.push({ key: "schedule", label: "Add reminder" });
  }
  if (/(pay|invoice|account number|bank|transfer|upi|wire)/.test(text)) {
    intents.push({ key: "payment", label: "Verify payment request" });
  }
  if (/(location|address|where|map|pin)/.test(text)) {
    intents.push({ key: "location", label: "Open maps" });
  }
  if (/(document|file|pdf|attachment|resume|proposal)/.test(text)) {
    intents.push({ key: "files", label: "Request attachment" });
  }

  return intents.slice(0, 3);
}

export function detectScamSignals(message = "") {
  const text = String(message || "").toLowerCase();
  if (!text) return null;

  const triggers = [
    { test: /(urgent|immediately|right now|asap)/, reason: "Urgency pressure language" },
    { test: /(otp|one time password|verification code)/, reason: "Request for sensitive auth code" },
    { test: /(bank account|account number|card number|cvv|pin)/, reason: "Request for financial credentials" },
    { test: /(send money|wire transfer|gift card|crypto)/, reason: "Unverified transfer request" },
    { test: /(click this link|reset password|login here|suspicious link)/, reason: "Phishing-style link instruction" },
  ];

  const matched = triggers.filter((item) => item.test.test(text)).map((item) => item.reason);
  if (matched.length === 0) return null;

  return {
    level: matched.length >= 2 ? "high" : "medium",
    reasons: matched,
    title: matched.length >= 2 ? "Potential scam risk detected" : "Suspicious message pattern detected",
  };
}
