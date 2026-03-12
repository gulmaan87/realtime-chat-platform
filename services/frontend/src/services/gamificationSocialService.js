const XP_STORAGE_KEY = "gamification:xpState";
const FRIENDSHIP_STORAGE_KEY = "gamification:friendshipStats";
const XP_COOLDOWN_MS = 18_000;
const XP_PER_MESSAGE = 12;
const MAX_XP_PER_DAY = 600;

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function deriveLevel(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safeXp / 120) + 1;
  const base = (level - 1) * 120;
  const progress = safeXp - base;
  return { level, progress, nextLevelAt: 120 };
}

export function getStoredXpState() {
  const parsed = safeJsonParse(localStorage.getItem(XP_STORAGE_KEY), null);
  if (!parsed || typeof parsed !== "object") {
    return { xp: 0, lastEarnAt: 0, dayStamp: new Date().toDateString(), earnedToday: 0 };
  }

  return {
    xp: Math.max(0, Number(parsed.xp) || 0),
    lastEarnAt: Number(parsed.lastEarnAt) || 0,
    dayStamp: parsed.dayStamp || new Date().toDateString(),
    earnedToday: Math.max(0, Number(parsed.earnedToday) || 0),
  };
}

export function awardMessageXp() {
  const now = Date.now();
  const dayStamp = new Date(now).toDateString();
  const state = getStoredXpState();
  const isNewDay = state.dayStamp !== dayStamp;

  const resetState = isNewDay ? { ...state, dayStamp, earnedToday: 0 } : state;

  if (now - resetState.lastEarnAt < XP_COOLDOWN_MS || resetState.earnedToday >= MAX_XP_PER_DAY) {
    return { ...resetState, leveledUp: false, awardedXp: 0 };
  }

  const next = {
    ...resetState,
    xp: resetState.xp + XP_PER_MESSAGE,
    lastEarnAt: now,
    earnedToday: resetState.earnedToday + XP_PER_MESSAGE,
  };

  localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(next));

  const prevLevel = deriveLevel(resetState.xp).level;
  const nextLevel = deriveLevel(next.xp).level;
  return { ...next, leveledUp: nextLevel > prevLevel, awardedXp: XP_PER_MESSAGE };
}

export function loadFriendshipStats() {
  const parsed = safeJsonParse(localStorage.getItem(FRIENDSHIP_STORAGE_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function updateFriendshipInteraction({ partnerId, at = Date.now() }) {
  if (!partnerId) return loadFriendshipStats();
  const stats = loadFriendshipStats();
  const day = new Date(at).toDateString();
  const current = stats[partnerId] || { streakDays: 0, lastDay: null, interactions: 0 };

  let streakDays = current.streakDays || 0;
  if (!current.lastDay) {
    streakDays = 1;
  } else if (current.lastDay !== day) {
    const lastDayAt = new Date(current.lastDay).getTime();
    const diffDays = Math.round((new Date(day).getTime() - lastDayAt) / 86_400_000);
    if (diffDays === 1) streakDays += 1;
    else if (diffDays > 1) streakDays = 1;
  }

  stats[partnerId] = {
    streakDays,
    lastDay: day,
    interactions: (current.interactions || 0) + 1,
    updatedAt: at,
  };

  localStorage.setItem(FRIENDSHIP_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function buildPollMessage({ userId, chatPartnerId, question, options }) {
  const timestamp = Date.now();
  return {
    localId: `poll-${userId}-${chatPartnerId}-${timestamp}`,
    type: "poll",
    message: question,
    timestamp,
    poll: {
      id: `poll-${timestamp}`,
      question,
      options: options.map((label, index) => ({ id: `opt-${index}`, label, votes: [] })),
      closed: false,
    },
    reactions: {},
  };
}

export function buildMiniGameMessage({ userId, chatPartnerId }) {
  const timestamp = Date.now();
  const answer = String(Math.floor(Math.random() * 5) + 1);
  return {
    localId: `game-${userId}-${chatPartnerId}-${timestamp}`,
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
    },
    reactions: {},
  };
}

export function applyPollVote(message, { optionId, voterId }) {
  if (!message?.poll || !optionId || !voterId) return message;

  const options = (message.poll.options || []).map((option) => {
    const existingVotes = Array.isArray(option.votes) ? option.votes.filter((entry) => String(entry) !== String(voterId)) : [];
    if (option.id !== optionId) {
      return { ...option, votes: existingVotes };
    }
    return { ...option, votes: [...existingVotes, String(voterId)] };
  });

  return { ...message, poll: { ...message.poll, options } };
}

export function applyMiniGameAttempt(message, { playerId, choice }) {
  if (!message?.miniGame || !playerId || !choice) return message;
  return {
    ...message,
    miniGame: {
      ...message.miniGame,
      attempts: {
        ...(message.miniGame.attempts || {}),
        [String(playerId)]: String(choice),
      },
    },
  };
}
