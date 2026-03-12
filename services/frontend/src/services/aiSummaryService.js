const SUMMARY_CACHE_PREFIX = "summary-cache:";

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function normalizeMessages(messages) {
  return (messages || [])
    .filter(Boolean)
    .map((entry) => ({
      text: String(entry.message || entry.text || ""),
      from: String(entry.from || entry.fromUserId || "unknown"),
      timestamp: Number(entry.timestamp || 0),
      self: Boolean(entry.self),
    }))
    .filter((item) => item.text.trim().length > 0);
}

function compressForSummary(messages) {
  const normalized = normalizeMessages(messages);
  if (normalized.length <= 120) return normalized;

  const last80 = normalized.slice(-80);
  const head = normalized.slice(0, 40);
  const stride = Math.max(1, Math.floor((normalized.length - 120) / 20));
  const sampledMiddle = [];
  for (let i = 40; i < normalized.length - 80; i += stride) {
    sampledMiddle.push(normalized[i]);
    if (sampledMiddle.length >= 20) break;
  }

  return [...head, ...sampledMiddle, ...last80];
}

function heuristicSummary(messages, activeChatUser) {
  const condensed = compressForSummary(messages);
  const combined = condensed.map((m) => m.text.toLowerCase()).join(" ");

  const topicBuckets = [
    { key: "planning", terms: ["meeting", "schedule", "time", "tomorrow", "today"] },
    { key: "location", terms: ["where", "location", "address", "there", "arrive"] },
    { key: "emotion", terms: ["love", "happy", "sad", "angry", "miss", "sorry"] },
    { key: "work", terms: ["task", "project", "deadline", "update", "review"] },
  ];

  const detectedTopics = topicBuckets
    .filter((bucket) => bucket.terms.some((term) => combined.includes(term)))
    .map((bucket) => bucket.key);

  const recent = condensed.slice(-8).map((m) => m.text);
  const highlights = recent.slice(0, 4);

  const participantName = activeChatUser?.username || activeChatUser?.email || "contact";
  const lines = [
    `Conversation with ${participantName} spans ${condensed.length} key messages.`,
    detectedTopics.length > 0 ? `Main topics: ${detectedTopics.join(", ")}.` : "Main topics: general chat and updates.",
    highlights.length > 0 ? `Recent highlights: ${highlights.join(" | ")}` : "Recent highlights: no major updates yet.",
  ];

  return {
    source: "heuristic",
    summary: lines.join(" "),
    updatedAt: Date.now(),
  };
}

async function providerSummary(messages, context = {}) {
  const apiUrl = import.meta.env.VITE_AI_SUMMARY_URL;
  const apiKey = import.meta.env.VITE_AI_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("No AI provider configured");
  }

  const payload = {
    task: "conversation_summary",
    context,
    messages: compressForSummary(messages).map((item) => ({
      role: item.self ? "me" : "contact",
      content: item.text,
      timestamp: item.timestamp,
    })),
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`AI summary failed (${res.status})`);
  }

  const data = await res.json();
  return {
    source: "provider",
    summary: String(data.summary || data.output || ""),
    updatedAt: Date.now(),
  };
}

export async function getConversationSummary({ roomId, messages, activeChatUser, forceRefresh = false }) {
  const normalized = normalizeMessages(messages);
  const digest = stableHash(`${roomId}:${normalized.length}:${normalized.at(-1)?.timestamp || 0}`);
  const cacheKey = `${SUMMARY_CACHE_PREFIX}${roomId}`;

  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.digest === digest && cached?.summary) {
          return { ...cached, cacheHit: true };
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  let result;
  try {
    result = await providerSummary(normalized, {
      roomId,
      participant: activeChatUser?.username || activeChatUser?.email || "contact",
    });
  } catch {
    result = heuristicSummary(normalized, activeChatUser);
  }

  const value = { ...result, digest, cacheHit: false };
  try {
    localStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // ignore cache write errors
  }
  return value;
}
