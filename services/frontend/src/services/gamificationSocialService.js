const XP_STORAGE_KEY = "gamification:xpState";
const FRIENDSHIP_STORAGE_KEY = "gamification:friendshipStats";

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getStoredXpState() {
  const parsed = safeParse(localStorage.getItem(XP_STORAGE_KEY), null);
  return {
    xp: Math.max(0, Number(parsed?.xp) || 0),
  };
}

export function awardMessageXp() {
  const current = getStoredXpState();
  const next = { xp: current.xp + 5 };
  localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deriveLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safeXp / 100) + 1;
  const nextLevelXp = level * 100;
  return {
    level,
    xp: safeXp,
    nextLevelXp,
  };
}

export function loadFriendshipStats() {
  const parsed = safeParse(localStorage.getItem(FRIENDSHIP_STORAGE_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function updateFriendshipInteraction({ partnerId }) {
  if (!partnerId) return loadFriendshipStats();

  const stats = loadFriendshipStats();
  const now = Date.now();
  const current = stats[partnerId] || {
    interactions: 0,
    streakDays: 0,
    lastInteraction: null,
  };

  let streakDays = current.streakDays || 0;
  if (!current.lastInteraction) {
    streakDays = 1;
  } else {
    const last = new Date(current.lastInteraction);
    const today = new Date(now);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayDiff = Math.round((todayDay.getTime() - lastDay.getTime()) / 86_400_000);

    if (dayDiff === 0) {
      streakDays = Math.max(1, streakDays);
    } else if (dayDiff === 1) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
  }

  stats[partnerId] = {
    interactions: (current.interactions || 0) + 1,
    streakDays,
    lastInteraction: now,
  };

  localStorage.setItem(FRIENDSHIP_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function buildPollMessage({ userId, chatPartnerId, question, options }) {
  const timestamp = Date.now();
  return {
    localId: `poll-${String(userId)}-${String(chatPartnerId)}-${timestamp}`,
    type: "poll",
    timestamp,
    message: question,
    poll: {
      question,
      options: options.map((label, index) => ({
        id: `option-${index + 1}`,
        label,
        votes: [],
      })),
    },
    reactions: {},
  };
}

export function applyPollVote(message, { optionId, voterId }) {
  if (!message?.poll || !optionId || !voterId) return message;

  const nextOptions = (message.poll.options || []).map((option) => {
    const filteredVotes = Array.isArray(option.votes)
      ? option.votes.filter((id) => String(id) !== String(voterId))
      : [];

    if (option.id !== optionId) {
      return { ...option, votes: filteredVotes };
    }

    return {
      ...option,
      votes: [...filteredVotes, String(voterId)],
    };
  });

  return {
    ...message,
    poll: {
      ...message.poll,
      options: nextOptions,
    },
  };
}

export function buildMiniGameMessage({ userId, chatPartnerId }) {
  const timestamp = Date.now();
  return {
    localId: `mini-game-${String(userId)}-${String(chatPartnerId)}-${timestamp}`,
    type: "mini_game",
    timestamp,
    message: "Rock Paper Scissors",
    miniGame: {
      prompt: "Choose one",
      choices: ["Rock", "Paper", "Scissors"],
      attempts: [],
    },
    reactions: {},
  };
}

export function applyMiniGameAttempt(message, { playerId, choice }) {
  if (!message?.miniGame || !playerId || !choice) return message;

  return {
    ...message,
    miniGame: {
      ...message.miniGame,
      attempts: [
        ...(Array.isArray(message.miniGame.attempts) ? message.miniGame.attempts : []),
        {
          playerId: String(playerId),
          choice: String(choice),
          timestamp: Date.now(),
        },
      ],
    },
  };
}
