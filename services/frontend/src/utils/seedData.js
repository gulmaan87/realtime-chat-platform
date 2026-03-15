export const INITIAL_CONVERSATIONS = [
  {
    id: "ai-copilot",
    name: "LevelUp Copilot",
    username: "LevelUp Copilot",
    type: "ai",
    status: "online",
    avatar: "🤖",
    unreadCount: 0,
    lastActive: "Just now",
    streak: 0,
    tier: "System",
    summary: "AI Assistant is analyzing your productivity workflows.",
    actions: ["Summarize unread", "Schedule follow-up", "Draft reply"],
    insights: { mood: "Neutral", health: "100%", cadence: "Instant" },
    messages: [
      { id: 1, senderId: "ai", text: "Welcome Alex! I'm your LevelUp Copilot. How can I help you level up your workflow today?", timestamp: Date.now() - 100000, status: "read" }
    ]
  },
  {
    id: "user-1",
    name: "Elena Rostova",
    username: "Elena Rostova",
    type: "dm",
    status: "online",
    avatar: "ER",
    unreadCount: 3,
    lastActive: "2m ago",
    streak: 12,
    tier: "Close Friend",
    summary: "Elena is waiting for the final Figma links for the redesign.",
    actions: ["Send Figma link", "Confirm meeting"],
    insights: { mood: "Excited", health: "92%", cadence: "Fast" },
    messages: [
      { id: 1, senderId: "user-1", text: "Hey! Are the glassmorphism assets ready?", timestamp: Date.now() - 500000, status: "read" },
      { id: 2, senderId: "me", text: "Almost there, just tweaking the blur values.", timestamp: Date.now() - 400000, status: "read" },
      { id: 3, senderId: "user-1", text: "Can't wait to see them. The purple glow looks amazing.", timestamp: Date.now() - 300000, status: "delivered" }
    ]
  },
  {
    id: "group-1",
    name: "Frontend Guild",
    username: "Frontend Guild",
    type: "group",
    status: "3 active",
    avatar: "FG",
    unreadCount: 0,
    lastActive: "15m ago",
    streak: 45,
    tier: "Elite",
    summary: "Team discussing React 19 concurrent rendering features.",
    actions: ["View roadmap", "Check PR #402"],
    insights: { mood: "Collaborative", health: "85%", cadence: "Moderate" },
    messages: [
      { id: 1, senderId: "user-2", senderName: "Marcus", text: "Has anyone tried the new useTransition hook?", timestamp: Date.now() - 1000000, status: "read" }
    ]
  }
];
