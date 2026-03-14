import { useMemo, useState } from "react";
import { RefreshCw, Search, Sparkles, Stars } from "lucide-react";
import {
  extractActionItems,
  semanticSearchMessages,
} from "../../services/aiProductivityService";
import {
  getFriendshipTier,
  getStreakNudge,
  getUnlockedRewards,
} from "../../services/gamificationSocialService";

function buildTopic(activeChatUser) {
  if (!activeChatUser) {
    return {
      title: "No active conversation",
      question: "Select a chat to unlock the assistant rail",
      action: "Open a conversation from the sidebar",
    };
  }

  const name = activeChatUser.username || activeChatUser.email || "this contact";
  return {
    title: `Catch up with ${name}`,
    question: `What should you reply to ${name} next?`,
    action: "Use the tone helper before sending",
  };
}

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "actions", label: "Actions" },
  { id: "insights", label: "Insights" },
];

export default function AssistantRail({
  activeChatUser,
  getAvatarColor,
  getInitials,
  moodThemeEnabled,
  moodResult,
  summaryState,
  refreshSummary,
  toTime,
  smartReplies = [],
  friendshipInsight,
  friendshipStatsMap = {},
  messages = [],
  savedTasks = [],
  achievements = {},
  achievementDefinitions = [],
  unlockedAchievementCount = 0,
  onToggleTask,
  onRemoveTask,
  onSelectSearchResult,
}) {
  const [activeTab, setActiveTab] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const topic = buildTopic(activeChatUser);
  const contactName = activeChatUser?.username || activeChatUser?.email || "this contact";
  const replyBank =
    smartReplies.length > 0 ? smartReplies : ["Sounds good", "On my way", "Let's do it"];
  const actionItems = useMemo(() => extractActionItems(messages), [messages]);
  const searchResults = useMemo(
    () => {
      let filteredMessages = messages;
      if (searchFilter === "me") {
        filteredMessages = messages.filter(m => m.self || m.fromUserId === activeChatUser?.id);
      } else if (searchFilter === "them") {
        filteredMessages = messages.filter(m => !m.self && m.fromUserId !== activeChatUser?.id);
      } else if (searchFilter === "files") {
        filteredMessages = messages.filter(m => m.type === "voice_note" || m.type === "whiteboard");
      }
      return semanticSearchMessages(filteredMessages, searchQuery, 4);
    },
    [messages, searchQuery, searchFilter, activeChatUser]
  );
  const leaderboard = useMemo(
    () =>
      Object.entries(friendshipStatsMap)
        .map(([partnerId, stats]) => ({
          partnerId,
          streakDays: stats?.streakDays || 0,
          interactions: stats?.interactions || 0,
          tier: getFriendshipTier(stats),
          score: (stats?.interactions || 0) + (stats?.streakDays || 0) * 5,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [friendshipStatsMap]
  );
  const unlockedAchievements = useMemo(
    () =>
      achievementDefinitions
        .filter((achievement) => achievements[achievement.id])
        .sort(
          (a, b) =>
            (achievements[b.id]?.unlockedAt || 0) - (achievements[a.id]?.unlockedAt || 0)
        ),
    [achievementDefinitions, achievements]
  );
  const lockedAchievementCount = Math.max(
    0,
    achievementDefinitions.length - unlockedAchievementCount
  );
  const unlockedRewards = useMemo(
    () =>
      getUnlockedRewards(achievements)
        .sort((a, b) => b.unlockedAt - a.unlockedAt)
        .slice(0, 4),
    [achievements]
  );
  const streakNudge = useMemo(
    () => getStreakNudge(friendshipInsight, contactName),
    [contactName, friendshipInsight]
  );

  return (
    <aside className="chat-details">
      <div className="details-user-card details-user-card--hero details-user-card--compact">
        <div className="details-user-card__topline">
          <div
            className="details-avatar"
            style={{
              backgroundColor: getAvatarColor(
                activeChatUser?.username || activeChatUser?.email || "User"
              ),
            }}
          >
            {getInitials(activeChatUser?.username || activeChatUser?.email || "U")}
          </div>

          <div className="details-user-copy">
            <div className="details-kicker">
              <Sparkles size={14} />
              <span>Assistant rail</span>
            </div>
            <h3>{activeChatUser?.username || "No chat selected"}</h3>
            <p>{activeChatUser?.email || "Select a contact to view details"}</p>
          </div>
        </div>

        {moodThemeEnabled ? (
          <p className="chat-mood-chip">
            Mood: {moodResult.mood} / {Math.round(moodResult.confidence * 100)}%
          </p>
        ) : null}
      </div>

      <div className="assistant-tabs" role="tablist" aria-label="Assistant sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`assistant-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="assistant-tab-panel">
        {activeTab === "summary" ? (
          <div className="assistant-dashboard assistant-dashboard--single">
            <section className="assistant-card assistant-card--summary">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Unread summary</p>
                  <div className="details-section-header">Conversation Summary</div>
                </div>
                <button
                  type="button"
                  className="summary-refresh"
                  onClick={() => refreshSummary(true)}
                  disabled={summaryState.loading}
                >
                  <RefreshCw size={14} className={summaryState.loading ? "spinning" : ""} />
                  Refresh
                </button>
              </div>

              <p className="summary-text">{summaryState.summary}</p>
              <p className="summary-meta">
                Source: {summaryState.source}
                {summaryState.updatedAt ? ` / ${toTime(summaryState.updatedAt)}` : ""}
              </p>
            </section>
          </div>
        ) : null}

        {activeTab === "actions" ? (
          <div className="assistant-dashboard">
            <section className="assistant-card assistant-card--spotlight">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Next move</p>
                  <div className="details-section-header">{topic.title}</div>
                </div>
                <div className="assistant-mini-icon">
                  <Stars size={16} />
                </div>
              </div>

              <div className="assistant-spotlight-copy">
                <p>{topic.question}</p>
                <strong>{topic.action}</strong>
              </div>
            </section>

            <section className={`assistant-card assistant-card--nudge assistant-card--${streakNudge.tone}`}>
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Momentum</p>
                  <div className="details-section-header">{streakNudge.title}</div>
                </div>
                <div className="assistant-mini-icon">
                  <Sparkles size={16} />
                </div>
              </div>

              <div className="assistant-spotlight-copy">
                <p>{streakNudge.description}</p>
                <strong>{streakNudge.cta}</strong>
              </div>
            </section>

            <section className="assistant-card assistant-card--toolbox">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Action items</p>
                  <div className="details-section-header">Recent follow-ups</div>
                </div>
              </div>

              {actionItems.length > 0 ? (
                <div className="assistant-task-list">
                  {actionItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="assistant-task-item">
                      <strong>{item.text}</strong>
                      <span>{item.when || item.sender}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="assistant-empty-copy">
                  No clear action items detected in the recent conversation.
                </p>
              )}

              <div className="assistant-chip-grid">
                {replyBank.slice(0, 4).map((reply) => (
                  <span key={reply} className="assistant-chip">
                    {reply}
                  </span>
                ))}
              </div>
            </section>

            <section className="assistant-card assistant-card--toolbox">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Saved tasks</p>
                  <div className="details-section-header">Persistent reminders</div>
                </div>
              </div>

              {savedTasks.length > 0 ? (
                <div className="assistant-task-list">
                  {savedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className={`assistant-task-item ${task.done ? "is-done" : ""}`}
                    >
                      <strong>{task.text}</strong>
                      <span>{task.source}</span>
                      <div className="assistant-task-actions">
                        <button type="button" onClick={() => onToggleTask?.(task.id)}>
                          {task.done ? "Reopen" : "Done"}
                        </button>
                        <button type="button" onClick={() => onRemoveTask?.(task.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="assistant-empty-copy">
                  Intent actions will save reminders and follow-ups here.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "insights" ? (
          <div className="assistant-dashboard assistant-dashboard--single">
            <section className="assistant-card assistant-card--toolbox assistant-card--wide">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Semantic search</p>
                  <div className="details-section-header">Find a message</div>
                </div>
                <div className="assistant-mini-icon">
                  <Search size={16} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                <label className="assistant-search" style={{ flex: 1, marginBottom: 0 }}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search messages by meaning or keyword"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                <select 
                  value={searchFilter} 
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ padding: "6px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-primary)" }}
                >
                  <option value="all">All</option>
                  <option value="me">From Me</option>
                  <option value="them">From Them</option>
                  <option value="files">Media</option>
                </select>
              </div>

              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  <div className="assistant-search-results">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className="assistant-search-result"
                        onClick={() => onSelectSearchResult?.(result.id)}
                      >
                        <strong>{result.sender}</strong>
                        <p>{result.text}</p>
                        <span>{toTime(result.timestamp)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="assistant-empty-copy">
                    No matching messages found for "{searchQuery}".
                  </p>
                )
              ) : (
                <p className="assistant-empty-copy">
                  Search recent messages to find reminders, files, or payment requests.
                </p>
              )}
            </section>

            <section className="assistant-card assistant-card--metrics assistant-card--wide">
              <p className="assistant-card__eyebrow">Connection</p>
              <div className="details-section-header">Friendship metrics</div>
              <div className="assistant-metric-pills">
                <div className="assistant-metric-pill">
                  <span>Streak</span>
                  <strong>{friendshipInsight?.streakDays || 0}d</strong>
                </div>
                <div className="assistant-metric-pill">
                  <span>Chats</span>
                  <strong>{friendshipInsight?.interactions || 0}</strong>
                </div>
              </div>
            </section>

            <section className="assistant-card assistant-card--metrics assistant-card--wide">
              <p className="assistant-card__eyebrow">Leaderboard</p>
              <div className="details-section-header">Top connections</div>
              {leaderboard.length > 0 ? (
                <div className="assistant-leaderboard">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.partnerId} className="assistant-leaderboard__row">
                      <span>#{index + 1}</span>
                      <strong>{entry.tier}</strong>
                      <small>{entry.streakDays}d streak / {entry.interactions} chats</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="assistant-empty-copy">
                  Start chatting consistently to build your leaderboard.
                </p>
              )}
            </section>

            <section className="assistant-card assistant-card--metrics assistant-card--wide">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Achievements</p>
                  <div className="details-section-header">Milestone unlocks</div>
                </div>
                <div className="assistant-mini-icon">
                  <Sparkles size={16} />
                </div>
              </div>

              <div className="assistant-achievement-summary">
                <strong>{unlockedAchievementCount} unlocked</strong>
                <span>{lockedAchievementCount} remaining</span>
              </div>

              {unlockedAchievements.length > 0 ? (
                <div className="assistant-achievement-grid">
                  {unlockedAchievements.slice(0, 4).map((achievement) => (
                    <div key={achievement.id} className="assistant-achievement-badge">
                      <strong>{achievement.label}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="assistant-empty-copy">
                  Start messaging, reacting, and using social features to unlock badges.
                </p>
              )}
            </section>

            <section className="assistant-card assistant-card--metrics assistant-card--wide">
              <div className="assistant-card__header">
                <div>
                  <p className="assistant-card__eyebrow">Rewards</p>
                  <div className="details-section-header">Milestone rewards</div>
                </div>
                <div className="assistant-mini-icon">
                  <Stars size={16} />
                </div>
              </div>

              {unlockedRewards.length > 0 ? (
                <div className="assistant-reward-grid">
                  {unlockedRewards.map((reward) => (
                    <div key={reward.id} className="assistant-reward-card">
                      <strong>{reward.label}</strong>
                      <span>{reward.description}</span>
                      <small>From {reward.achievementLabel}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="assistant-empty-copy">
                  Unlock achievements to reveal milestone rewards here.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
