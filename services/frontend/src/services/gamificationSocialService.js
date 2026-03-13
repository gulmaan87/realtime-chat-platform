const XP_STORAGE_KEY = "gamification:xpState";
const FRIENDSHIP_STORAGE_KEY = "gamification:friendshipStats";
const ACHIEVEMENTS_STORAGE_KEY = "gamification:achievements";

const XP_COOLDOWN_MS = 18_000;
const XP_PER_MESSAGE = 12;
const MAX_XP_PER_DAY = 600;
const LEVEL_XP_STEP = 120;

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_message",
    label: "First Ping",
    description: "Send your first message.",
    rewardLabel: "Starter Flair",
    rewardDescription: "Unlocks your first milestone badge in the assistant rail.",
  },
  {
    id: "level_5",
    label: "Level 5",
    description: "Reach Level 5.",
    rewardLabel: "Momentum Boost",
    rewardDescription: "Highlights you as an active chatter in your reward vault.",
  },
  {
    id: "level_10",
    label: "Level 10",
    description: "Reach Level 10.",
    rewardLabel: "Elite Status",
    rewardDescription: "Unlocks an elite progression reward tier.",
  },
  {
    id: "streak_3",
    label: "3-Day Streak",
    description: "Keep a conversation streak for 3 days.",
    rewardLabel: "Streak Shield",
    rewardDescription: "Marks you as consistent across the social dashboard.",
  },
  {
    id: "streak_7",
    label: "7-Day Streak",
    description: "Keep a conversation streak for 7 days.",
    rewardLabel: "Comeback Pass",
    rewardDescription: "Unlocks a premium streak reward for long-running chats.",
  },
  {
    id: "poll_creator",
    label: "Poll Starter",
    description: "Create your first poll.",
    rewardLabel: "Host Badge",
    rewardDescription: "Unlocks a social host reward for interactive chats.",
  },
  {
    id: "game_master",
    label: "Game Master",
    description: "Launch your first mini-game.",
    rewardLabel: "Arcade Token",
    rewardDescription: "Adds a mini-game milestone reward to your collection.",
  },
  {
    id: "reactor",
    label: "Reactor",
    description: "Add your first reaction.",
    rewardLabel: "Expressive Pack",
    rewardDescription: "Unlocks your first lightweight social reward.",
  },
];

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

export function loadAchievements() {
  const parsed = safeJsonParse(safeStorageGet(ACHIEVEMENTS_STORAGE_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function persistAchievements(achievements) {
  safeStorageSet(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievements));
  return achievements;
}

function unlockAchievement(achievements, id) {
  if (!id || achievements[id]) {
    return false;
  }

  achievements[id] = {
    unlockedAt: Date.now(),
  };

  return true;
}

export function evaluateAchievements({
  achievements = loadAchievements(),
  xp = 0,
  friendshipInsight = null,
  createdPoll = false,
  createdMiniGame = false,
  reactionAdded = false,
  sentMessage = false,
} = {}) {
  const nextAchievements = { ...achievements };
  const newlyUnlocked = [];
  const currentLevel = deriveLevel(xp).level;
  const streakDays = Number(friendshipInsight?.streakDays || 0);

  const tryUnlock = (id) => {
    if (unlockAchievement(nextAchievements, id)) {
      newlyUnlocked.push(id);
    }
  };

  if (sentMessage) tryUnlock("first_message");
  if (currentLevel >= 5) tryUnlock("level_5");
  if (currentLevel >= 10) tryUnlock("level_10");
  if (streakDays >= 3) tryUnlock("streak_3");
  if (streakDays >= 7) tryUnlock("streak_7");
  if (createdPoll) tryUnlock("poll_creator");
  if (createdMiniGame) tryUnlock("game_master");
  if (reactionAdded) tryUnlock("reactor");

  if (newlyUnlocked.length === 0) {
    return {
      achievements,
      newlyUnlocked,
    };
  }

  return {
    achievements: persistAchievements(nextAchievements),
    newlyUnlocked,
  };
}

export function getAchievementMeta(id) {
  return ACHIEVEMENT_DEFINITIONS.find((achievement) => achievement.id === id) || null;
}

export function getUnlockedRewards(achievements = {}) {
  return ACHIEVEMENT_DEFINITIONS.filter((achievement) => achievements[achievement.id]).map(
    (achievement) => ({
      id: achievement.id,
      label: achievement.rewardLabel,
      description: achievement.rewardDescription,
      unlockedAt: achievements[achievement.id]?.unlockedAt || 0,
      achievementLabel: achievement.label,
    })
  );
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
  if (message.poll.closed) return message;

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
  if (message.miniGame.winnerId) return message;

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

export function getStreakNudge(friendshipInsight, contactName = "this contact") {
  if (!friendshipInsight) {
    return {
      tone: "warmup",
      title: "Start a streak",
      description: `Send ${contactName} a thoughtful opener to start building momentum.`,
      cta: "Break the ice today",
    };
  }

  const streakDays = Number(friendshipInsight.streakDays || 0);
  const interactions = Number(friendshipInsight.interactions || 0);
  const lastTouchAt = friendshipInsight.updatedAt
    ? Number(friendshipInsight.updatedAt)
    : friendshipInsight.lastDay
      ? new Date(friendshipInsight.lastDay).getTime()
      : 0;

  const daysSinceLastTouch = lastTouchAt
    ? Math.floor((Date.now() - lastTouchAt) / 86_400_000)
    : Infinity;

  if (!Number.isFinite(daysSinceLastTouch) || interactions === 0) {
    return {
      tone: "warmup",
      title: "Start a streak",
      description: `You have not built a rhythm with ${contactName} yet. One message is enough to get it moving.`,
      cta: "Send the first ping",
    };
  }

  if (daysSinceLastTouch === 0 && streakDays >= 3) {
    return {
      tone: "strong",
      title: "Hot streak active",
      description: `${contactName} is part of your ${streakDays}-day streak. Keep it alive with a quick follow-up while the conversation is warm.`,
      cta: "Keep the streak burning",
    };
  }

  if (daysSinceLastTouch <= 1 && streakDays >= 1) {
    return {
      tone: "risk",
      title: "Streak at risk",
      description: `Reply today to protect your ${streakDays}-day streak with ${contactName}.`,
      cta: "Send a quick check-in",
    };
  }

  return {
    tone: "comeback",
    title: "Comeback window",
    description: `It has been ${daysSinceLastTouch} days since you last replied to ${contactName}. Restart the momentum with a thoughtful message.`,
    cta: "Revive the conversation",
  };
}
