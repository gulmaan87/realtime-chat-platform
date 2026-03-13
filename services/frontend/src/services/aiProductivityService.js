import { getSearchableMessageText } from "./voiceCollaborationService";

function cleanWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

const TASKS_STORAGE_KEY = "ai-productivity:tasks";

function safeStorageGet(key) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function splitSentences(text) {
  return cleanWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ensureTerminalPunctuation(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function softenCommands(text) {
  return text
    .replace(/\bneed this now\b/gi, "would appreciate this soon")
    .replace(/\bsend it\b/gi, "please send it")
    .replace(/\bcome fast\b/gi, "come as soon as you can")
    .replace(/\bdo this\b/gi, "please take care of this");
}

const TONE_RULES = {
  professional: (text) =>
    ensureTerminalPunctuation(
      softenCommands(
        cleanWhitespace(text)
          .replace(/\bhey\b/gi, "Hello")
          .replace(/\bhi\b/gi, "Hello")
          .replace(/\bok\b/gi, "Understood")
          .replace(/\bthanks\b/gi, "Thank you")
          .replace(/\bgonna\b/gi, "going to")
          .replace(/\bwanna\b/gi, "want to")
      )
    ),
  friendly: (text) => {
    const normalized = cleanWhitespace(text);
    const withWarmth = normalized
      .replace(/\bhello\b/gi, "Hey")
      .replace(/\bunderstood\b/gi, "Got it")
      .replace(/\bthank you\b/gi, "Thanks");
    return /[!?]$/.test(withWarmth) ? withWarmth : `${withWarmth}!`;
  },
  concise: (text) => {
    const firstSentence = splitSentences(text)[0] || cleanWhitespace(text);
    return ensureTerminalPunctuation(firstSentence);
  },
};

export function generateTonePreview({ draft = "", tone = "professional" }) {
  const normalized = cleanWhitespace(draft);
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

export function extractScheduleHint(text) {
  const match = text.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+([\d:apm\s]+))?/i
  );

  if (!match) return "";

  const day = match[1];
  const time = cleanWhitespace(match[2] || "");
  return time ? `${day} at ${time}` : day;
}

export function extractLocationQuery(text = "") {
  const normalized = cleanWhitespace(text);
  if (!normalized) return "";

  const addressMatch = normalized.match(
    /\b(?:at|near|in)\s+([A-Za-z0-9][A-Za-z0-9\s,#.-]{3,60})/i
  );

  if (addressMatch?.[1]) {
    return cleanWhitespace(addressMatch[1]);
  }

  const fallback = normalized
    .replace(/\b(where|location|address|map|pin)\b/gi, "")
    .trim();

  return fallback.slice(0, 80);
}

export function detectIntentActions(message = "") {
  const text = String(message || "").toLowerCase();
  if (!text) return [];

  const intents = [];
  const scheduleHint = extractScheduleHint(message);

  if (/(meet|meeting|schedule|tomorrow|today at|call at|remind me|follow up)/.test(text)) {
    intents.push({
      key: "schedule",
      label: "Add reminder",
      detail: scheduleHint || "Scheduling language detected",
    });
  }
  if (/(pay|invoice|account number|bank|transfer|upi|wire)/.test(text)) {
    intents.push({
      key: "payment",
      label: "Verify payment request",
      detail: "Financial request detected",
    });
  }
  if (/(location|address|where|map|pin)/.test(text)) {
    intents.push({
      key: "location",
      label: "Open maps",
      detail: "Location details mentioned",
    });
  }
  if (/(document|file|pdf|attachment|resume|proposal)/.test(text)) {
    intents.push({
      key: "files",
      label: "Request attachment",
      detail: "Attachment-related follow-up",
    });
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

function normalizeMessages(messages) {
  return (messages || [])
    .filter(Boolean)
    .map((entry, index) => ({
      id: String(entry.localId || entry.clientMessageId || `msg-${index}`),
      text: cleanWhitespace(getSearchableMessageText(entry)),
      timestamp: Number(entry.timestamp || 0),
      sender: String(entry.from || entry.sender || entry.fromUserId || "unknown"),
    }))
    .filter((item) => item.text);
}

export function extractActionItems(messages = []) {
  const normalized = normalizeMessages(messages).slice(-40);
  const taskPatterns = [
    /\b(todo|follow up|follow-up|send|review|check|call|schedule|meeting|deadline|remember|remind)\b/i,
    /\b(can you|please|need to|should|don't forget|let's)\b/i,
  ];

  return normalized
    .filter((item) => taskPatterns.some((pattern) => pattern.test(item.text)))
    .map((item) => ({
      id: item.id,
      text: item.text,
      sender: item.sender,
      when: extractScheduleHint(item.text),
    }))
    .slice(0, 5);
}

function scoreSearchResult(text, queryTokens) {
  let score = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) score += token.length > 4 ? 3 : 2;
    if (text.startsWith(token)) score += 1;
  }
  return score;
}

export function semanticSearchMessages(messages = [], query = "", limit = 5) {
  const normalizedQuery = cleanWhitespace(query).toLowerCase();
  if (!normalizedQuery) return [];

  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 1);
  if (queryTokens.length === 0) return [];

  const normalized = normalizeMessages(messages);

  return normalized
    .map((item) => {
      const haystack = item.text.toLowerCase();
      const score = scoreSearchResult(haystack, queryTokens);
      return {
        ...item,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.timestamp - a.timestamp;
    })
    .slice(0, limit);
}

export function loadAiTasks() {
  const parsed = safeJsonParse(safeStorageGet(TASKS_STORAGE_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveAiTasks(tasksByPartner) {
  safeStorageSet(TASKS_STORAGE_KEY, JSON.stringify(tasksByPartner));
}

export function addAiTask({ partnerId, text, source = "manual", metadata = {} }) {
  if (!partnerId || !cleanWhitespace(text)) return loadAiTasks();

  const tasks = loadAiTasks();
  const key = String(partnerId);
  const nextTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: cleanWhitespace(text),
    source,
    done: false,
    createdAt: Date.now(),
    metadata,
  };

  tasks[key] = [nextTask, ...(Array.isArray(tasks[key]) ? tasks[key] : [])].slice(0, 20);
  saveAiTasks(tasks);
  return tasks;
}

export function toggleAiTask({ partnerId, taskId }) {
  if (!partnerId || !taskId) return loadAiTasks();

  const tasks = loadAiTasks();
  const key = String(partnerId);
  tasks[key] = (Array.isArray(tasks[key]) ? tasks[key] : []).map((task) =>
    task.id === taskId ? { ...task, done: !task.done, updatedAt: Date.now() } : task
  );
  saveAiTasks(tasks);
  return tasks;
}

export function removeAiTask({ partnerId, taskId }) {
  if (!partnerId || !taskId) return loadAiTasks();

  const tasks = loadAiTasks();
  const key = String(partnerId);
  tasks[key] = (Array.isArray(tasks[key]) ? tasks[key] : []).filter((task) => task.id !== taskId);
  saveAiTasks(tasks);
  return tasks;
}
