export const SEEDED_CONTACTS = [
  {
    id: "ai-copilot",
    username: "LevelUp Copilot",
    email: "ai@levelup.chat",
    type: "ai",
    status: "online",
    lastMessage: "I've summarized your latest meetings.",
    lastActive: "Now",
    unread: 0,
  },
  {
    id: "user-1",
    username: "Elena Rostova",
    email: "elena@example.com",
    type: "dm",
    status: "online",
    lastMessage: "Did you check the new Figma designs?",
    lastActive: "2m ago",
    unread: 3,
    streak: 12,
    tier: "Close Friend"
  },
  {
    id: "group-1",
    username: "Frontend Guild",
    type: "group",
    status: "online",
    lastMessage: "Alex: We need to update the React version.",
    lastActive: "15m ago",
    unread: 0,
  },
  {
    id: "user-2",
    username: "Marcus Chen",
    email: "marcus@example.com",
    type: "dm",
    status: "offline",
    lastMessage: "Sounds like a plan! 🚀",
    lastActive: "2h ago",
    unread: 0,
    streak: 5,
    tier: "Trusted"
  },
  {
    id: "user-3",
    username: "Sarah Jenkins",
    email: "sarah@example.com",
    type: "dm",
    status: "offline",
    lastMessage: "Can we reschedule to 3PM?",
    lastActive: "1d ago",
    unread: 0,
  }
];

export const SEEDED_MESSAGES = [
  {
    localId: "seed-1",
    fromUserId: "user-1",
    from: "Elena Rostova",
    message: "Hey! Are we still on for the UI review today?",
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    type: "text",
    reactions: { "👍": ["user-2"] }
  },
  {
    localId: "seed-2",
    fromUserId: "me",
    from: "Me",
    message: "Yes! I've updated the component library.",
    timestamp: Date.now() - 1000 * 60 * 60 * 1.5,
    type: "text",
    self: true
  },
  {
    localId: "seed-3",
    fromUserId: "user-1",
    from: "Elena Rostova",
    message: "Awesome. Did you add the new glassmorphism variants?",
    timestamp: Date.now() - 1000 * 60 * 60 * 1.4,
    type: "text"
  },
  {
    localId: "seed-4",
    fromUserId: "me",
    from: "Me",
    message: "Yep, pushed them to the main branch just now. 🎨",
    timestamp: Date.now() - 1000 * 60 * 5,
    type: "text",
    self: true,
    reactions: { "🔥": ["user-1"] }
  }
];

export const SEEDED_ASSISTANT_DATA = {
  summary: "Elena is asking about the UI review and glassmorphism variants. You confirmed the updates are pushed to the main branch.",
  tasks: [
    { id: 1, text: "Review UI with Elena at 3PM" },
    { id: 2, text: "Verify glassmorphism components in staging" }
  ],
  insights: {
    mood: "Collaborative & Positive",
    health: "98%",
    nextAction: "Share the staging link with Elena."
  }
};
