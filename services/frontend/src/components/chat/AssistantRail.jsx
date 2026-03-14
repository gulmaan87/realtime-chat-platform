import { useState } from "react";
import { Sparkles, Target, Zap, ChevronRight } from "lucide-react";

export default function AssistantRail({ activeChatUser, seededData }) {
  const [activeTab, setActiveTab] = useState("Summary");

  if (!activeChatUser) return null;

  return (
    <div className="chat-details-shell">
      <div className="assistant-identity">
        <div className="assistant-avatar">
          🤖
        </div>
        <h3>LevelUp Copilot</h3>
        <p>Analyzing conversation with {activeChatUser.username}</p>
      </div>

      <div className="assistant-tabs">
        {["Summary", "Actions", "Insights"].map(tab => (
          <button
            key={tab}
            className={`ast-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="assistant-content">
        {activeTab === "Summary" && (
          <div className="insight-card">
            <div className="insight-header">
              <Sparkles size={16} /> Conversation Summary
            </div>
            <div className="insight-body">
              {seededData?.summary || "No recent summary available."}
            </div>
          </div>
        )}

        {activeTab === "Actions" && (
          <div>
            <div className="insight-header" style={{ marginBottom: "16px" }}>
              <Target size={16} /> Suggested Next Steps
            </div>
            {seededData?.tasks?.map(task => (
              <div key={task.id} className="task-item">
                <input type="checkbox" />
                <span className="task-text">{task.text}</span>
              </div>
            ))}
            <button className="new-chat-btn" style={{ width: "100%", height: "auto", padding: "12px", marginTop: "12px", borderRadius: "12px", background: "var(--glass-surface)", display: "flex", justifyContent: "space-between" }}>
              <span>Generate more ideas</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {activeTab === "Insights" && (
          <div className="insight-card">
            <div className="insight-header">
              <Zap size={16} /> Interaction Stats
            </div>
            <div className="insight-body" style={{ display: "grid", gap: "12px" }}>
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Current Mood</strong>
                <p>{seededData?.insights?.mood || "Neutral"}</p>
              </div>
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Relationship Health</strong>
                <p>{seededData?.insights?.health || "Good"}</p>
              </div>
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Smart Advice</strong>
                <p>{seededData?.insights?.nextAction || "Keep chatting to build connection."}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
