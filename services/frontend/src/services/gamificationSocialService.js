const XP_STORAGE_KEY = "gamification:xpState";
const FRIENDSHIP_STORAGE_KEY = "gamification:friendshipStats";

const XP_COOLDOWN_MS = 18_000;
const XP_PER_MESSAGE = 12;
const MAX_XP_PER_DAY = 600;
const LEVEL_XP_STEP = 120;

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
    // ignore storage write errors
  }
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function deriveLevel(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safeXp / LEVEL_XP_STEP) + 1;
  const base = (level - 1) * LEVEL_XP_STEP;
  const progress = safeXp - base;

  return {
    level,
    xp: safeXp,
    progress,
    nextLevelAt: LEVEL_XP_STEP,
    progressPercent: Math.min(100, Math.round((progress / LEVEL_XP_STEP) * 100)),
  };
}

export function getStoredXpState() {
  const parsed = safeJsonParse(safeStorageGet(XP_STORAGE_KEY), null);
  const today = new Date().toDateString();

  // Backward compatibility with old schema: { xp }
  if (parsed && typeof parsed === "object" && "xp" in parsed && !("lastEarnAt" in parsed)) {
    return {
      xp: Math.max(0, Number(parsed.xp) || 0),
      lastEarnAt: 0,
      dayStamp: today,
      earnedToday: 0,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      xp: 0,
      lastEarnAt: 0,
      dayStamp: today,
      earnedToday: 0,
    };
  }

  return {
    xp: Math.max(0, Number(parsed.xp) || 0),
    lastEarnAt: Math.max(0, Number(parsed.lastEarnAt) || 0),
    dayStamp: parsed.dayStamp || today,
    earnedToday: Math.max(0, Number(parsed.earnedToday) || 0),
  };
}

export function awardMessageXp() {
  const now = Date.now();
  const dayStamp = new Date(now).toDateString();
  const state = getStoredXpState();
  const isNewDay = state.dayStamp !== dayStamp;

  const resetState = isNewDay
    ? { ...state, dayStamp, earnedToday: 0 }
    : state;

  if (
    now - resetState.lastEarnAt < XP_COOLDOWN_MS ||
    resetState.earnedToday >= MAX_XP_PER_DAY
  ) {
    return {
      ...resetState,
      leveledUp: false,
      awardedXp: 0,
    };
  }

  const awardedXp = Math.min(
    XP_PER_MESSAGE,
    Math.max(0, MAX_XP_PER_DAY - resetState.earnedToday)
  );

  const next = {
    ...resetState,
    xp: resetState.xp + awardedXp,
    lastEarnAt: now,
    earnedToday: resetState.earnedToday + awardedXp,
  };

  safeStorageSet(XP_STORAGE_KEY, JSON.stringify(next));

  const prevLevel = deriveLevel(resetState.xp).level;
  const nextLevel = deriveLevel(next.xp).level;

  return {
    ...next,
    leveledUp: nextLevel > prevLevel,
    awardedXp,
  };
}

export function loadFriendshipStats() {
  const parsed = safeJsonParse(safeStorageGet(FRIENDSHIP_STORAGE_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function updateFriendshipInteraction({ partnerId, at = Date.now() }) {
  if (!partnerId) return loadFriendshipStats();

  const key = String(partnerId);
  const stats = loadFriendshipStats();
  const day = new Date(at).toDateString();

  const current = stats[key] || {
    streakDays: 0,
    lastDay: null,
    interactions: 0,
    updatedAt: null,
  };

  let streakDays = current.streakDays || 0;

  if (!current.lastDay) {
    streakDays = 1;
  } else if (current.lastDay !== day) {
    const lastDayAt = new Date(current.lastDay).getTime();
    const currentDayAt = new Date(day).getTime();
    const diffDays = Math.round((currentDayAt - lastDayAt) / 86_400_000);

    if (diffDays === 1) {
      streakDays += 1;
    } else if (diffDays > 1) {
      streakDays = 1;
    }
  } else {
    streakDays = Math.max(1, streakDays);
  }

  stats[key] = {
    streakDays,
    lastDay: day,
    interactions: (current.interactions || 0) + 1,
    updatedAt: at,
  };

  safeStorageSet(FRIENDSHIP_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function buildPollMessage({ userId, chatPartnerId, question, options }) {
  const timestamp = Date.now();

  const cleanedOptions = Array.isArray(options)
    ? options
        .map((opt) => String(opt || "").trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    localId: `poll-${String(userId)}-${String(chatPartnerId)}-${timestamp}`,
    type: "poll",
    message: String(question || "").trim(),
    timestamp,
    poll: {
      id: `poll-${timestamp}`,
      question: String(question || "").trim(),
      options: cleanedOptions.map((label, index) => ({
        id: `opt-${index}`,
        label,
        votes: [],
      })),
      closed: false,
    },
    reactions: {},
  };
}

export function applyPollVote(message, { optionId, voterId }) {
  if (!message?.poll || !optionId || !voterId) return message;
  if (message.poll.closed) return message;

  const normalizedVoterId = String(voterId);

  const options = (message.poll.options || []).map((option) => {
    const existingVotes = Array.isArray(option.votes)
      ? option.votes.filter((entry) => String(entry) !== normalizedVoterId)
      : [];

    if (option.id !== optionId) {
      return {
        ...option,
        votes: existingVotes,
      };
    }

    return {
      ...option,
      votes: [...existingVotes, normalizedVoterId],
    };
  });

  return {
    ...message,
    poll: {
      ...message.poll,
      options,
    },
  };
}

export function closePoll(message) {
  if (!message?.poll) return message;

  return {
    ...message,
    poll: {
      ...message.poll,
      closed: true,
    },
  };
}

export function buildMiniGameMessage({ userId, chatPartnerId }) {
  const timestamp = Date.now();
  const answer = String(Math.floor(Math.random() * 5) + 1);

  return {
    localId: `game-${String(userId)}-${String(chatPartnerId)}-${timestamp}`,
    type: "mini_game",
    message: "🎯 Guess the number (1-5)",
    timestamp,
    miniGame: {
      id: `guess-${timestamp}`,
      type: "guess_number",
      prompt: "Pick one number. Closest hit wins bragging rights.",
      answer,
      choices: ["1", "2", "3", "4", "5"],
      attempts: {},
      winnerId: null,
      resolvedAt: null,
    },
    reactions: {},
  };
}

export function applyMiniGameAttempt(message, { playerId, choice }) {
  if (!message?.miniGame || !playerId || !choice) return message;

  const normalizedPlayerId = String(playerId);
  const normalizedChoice = String(choice);

  // Ignore invalid choices
  if (!Array.isArray(message.miniGame.choices) || !message.miniGame.choices.includes(normalizedChoice)) {
    return message;
  }

  // Prevent changes after resolution
  if (message.miniGame.winnerId) {
    return message;
  }

  return {
    ...message,
    miniGame: {
      ...message.miniGame,
      attempts: {
        ...(message.miniGame.attempts || {}),
        [normalizedPlayerId]: normalizedChoice,
      },
    },
  };
}

export function resolveMiniGameWinner(message) {
  if (!message?.miniGame) return message;

  const answer = Number(message.miniGame.answer);
  const attempts = message.miniGame.attempts || {};
  const entries = Object.entries(attempts);

  if (!Number.isFinite(answer) || entries.length === 0) {
    return message;
  }

  let bestPlayerId = null;
  let bestDiff = Infinity;

  for (const [playerId, rawChoice] of entries) {
    const choice = Number(rawChoice);
    if (!Number.isFinite(choice)) continue;

    const diff = Math.abs(choice - answer);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestPlayerId = playerId;
    }
  }

  if (!bestPlayerId) return message;

  return {
    ...message,
    miniGame: {
      ...message.miniGame,
      winnerId: bestPlayerId,
      resolvedAt: Date.now(),
    },
  };
}

export function getFriendshipTier(friendshipInsight) {
  const interactions = Number(friendshipInsight?.interactions || 0);
  const streakDays = Number(friendshipInsight?.streakDays || 0);

  const score = interactions + streakDays * 5;

  if (score >= 120) return "Legendary";
  if (score >= 70) return "Besties";
  if (score >= 35) return "Close";
  if (score >= 10) return "Warm";
  return "New";
}