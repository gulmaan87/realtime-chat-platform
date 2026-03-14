import { useMemo, useState } from "react";
import { RefreshCw, Search, Sparkles, Stars, Phone, Mail, Calendar, User, Image as ImageIcon } from "lucide-react";

export default function AssistantRail({
  activeChatUser,
  summaryState,
  refreshSummary,
  savedTasks = [],
  achievements = {},
  friendshipStatsMap = {},
  messages = []
}) {
  const [activeTab, setActiveTab] = useState("summary");

  if (!activeChatUser) return <div className="chat-details-shell">Select a contact to view details</div>;

  return (
    <div className="chat-details-shell">
      <div className="assistant-tabs" style={{ display: "flex", gap: "10px", padding: "20px 24px", borderBottom: "1px solid #eee" }}>
        {["summary", "actions", "insights"].map(tab => (
          <button
            key={tab}
            className={`assistant-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{ 
              flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ddd", 
              background: activeTab === tab ? "var(--accent-primary)" : "white",
              color: activeTab === tab ? "white" : "#666",
              textTransform: "capitalize", fontWeight: 600, cursor: "pointer"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="assistant-content" style={{ padding: "24px" }}>
        {activeTab === "summary" && (
          <div className="summary-panel">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700 }}>AI Summary</h4>
              <button onClick={() => refreshSummary(true)} disabled={summaryState.loading}>
                <RefreshCw size={16} className={summaryState.loading ? "spinning" : ""} />
              </button>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.6 }}>{summaryState.summary}</p>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="actions-panel">
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "16px" }}>Task List</h4>
            {savedTasks.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#999" }}>No pending tasks</p> : (
              <div className="task-list" style={{ display: "grid", gap: "10px" }}>
                {savedTasks.map(task => (
                  <div key={task.id} style={{ padding: "10px", borderRadius: "10px", background: "#f9f9f9", border: "1px solid #eee", fontSize: "0.85rem" }}>
                    {task.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="insights-panel">
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "16px" }}>Achievements</h4>
            <div className="achievement-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {Object.keys(achievements).map(key => (
                <div key={key} style={{ padding: "10px", borderRadius: "10px", background: "#f0f7ff", border: "1px solid #cce5ff", textAlign: "center" }}>
                  <Stars size={20} color="#007bff" style={{ marginBottom: "4px" }} />
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{key}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="profile-section" style={{ marginTop: "auto", borderTop: "1px solid #eee", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <img
            src={`https://ui-avatars.com/api/?name=${activeChatUser.username}&size=48&background=random`}
            alt="Avatar"
            style={{ width: "48px", height: "48px", borderRadius: "50%" }}
          />
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{activeChatUser.username}</h3>
            <p style={{ fontSize: "0.8rem", color: "#999" }}>{activeChatUser.email}</p>
          </div>
        </div>
        <button className="edit-profile-btn" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "white", fontWeight: 600, cursor: "pointer" }}>
          View Profile
        </button>
      </div>
    </div>
  );
}
