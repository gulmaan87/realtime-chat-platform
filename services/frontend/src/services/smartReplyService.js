const FALLBACK_REPLIES = ["Sounds good", "Got it", "Tell me more", "I agree"];

const KEYWORD_REPLY_MAP = [
  { test: /(hello|hey|hi)/i, replies: ["Hey! 👋", "Hi there!", "Good to hear from you"] },
  { test: /(thanks|thank you|thx)/i, replies: ["You’re welcome!", "Anytime 🙌", "Happy to help"] },
  { test: /(where|location|address)/i, replies: ["Send me the location pin", "I’ll be there soon", "What time should I come?"] },
  { test: /(meeting|call|schedule)/i, replies: ["Works for me", "Can we do 15 mins later?", "Let’s lock a time"] },
  { test: /(ok|okay|sure|fine)/i, replies: ["Perfect ✅", "Great, done", "Awesome"] },
  { test: /(sad|upset|bad day|tired)/i, replies: ["I’m here for you", "Want to talk about it?", "Sending a hug 🤍"] },
  { test: /(love|miss you|❤️|💕)/i, replies: ["Miss you too ❤️", "Aww that’s sweet", "Can’t wait to see you"] },
];

export function buildSmartReplies({ messages = [], activeChatUser = null, max = 5 } = {}) {
  const recent = [...messages].reverse();
  const lastInbound = recent.find((entry) => {
    if (!entry || typeof entry === "string") return false;
    return !entry.self;
  });

  const text = String(lastInbound?.message || "").trim();

  const contextual = KEYWORD_REPLY_MAP.find((rule) => rule.test.test(text))?.replies || [];
  const personalization = activeChatUser?.username
    ? [`${activeChatUser.username}, got it!`, `Sure ${activeChatUser.username}`]
    : [];

  const merged = [...contextual, ...personalization, ...FALLBACK_REPLIES]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .slice(0, Math.max(3, max));

  return merged;
}
