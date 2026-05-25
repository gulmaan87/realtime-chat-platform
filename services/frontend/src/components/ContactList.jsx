import { useState } from "react";
import { Search, Plus, Edit } from "lucide-react";

function ContactAvatar({ contact }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = contact.profilePicUrl && contact.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${contact.profilePicUrl}` : "";

  if (contact.type === 'ai') {
    return (
      <div className="contact-avatar ai">🤖</div>
    );
  }

  if (picUrl && !failed) {
    return (
      <div className="contact-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={picUrl}
          alt={contact.username}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="contact-avatar">
      {contact.username?.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function ContactList({
  onSelect,
  activeChatUser,
  contacts = [],
  onlineStatuses = {},
}) {
  const [activeFilter, setActiveFilter] = useState("All");
  
  return (
    <>
      <div className="inbox-header">
        <div className="inbox-title-row">
          <h2>Messages</h2>
          <button className="new-chat-btn">
            <Edit size={16} />
          </button>
        </div>
        
        <div className="search-bar">
          <Search size={16} color="var(--text-muted)" />
          <input type="text" placeholder="Search conversations..." />
        </div>
        
        <div className="filter-tabs">
          {["All", "DMs", "Groups", "AI", "Unread"].map(tab => (
            <button 
              key={tab} 
              className={`filter-tab ${activeFilter === tab ? "active" : ""}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="contact-items">
        {contacts.map((contact) => {
          const isOnline = contact.status === "online" || onlineStatuses[String(contact.id || contact._id)];
          const isActive = activeChatUser?.id === contact.id || activeChatUser?._id === contact._id;

          return (
            <div
              key={contact.id || contact._id}
              className={`contact-item ${isActive ? "active" : ""}`}
              onClick={() => onSelect(contact)}
            >
              <div className="contact-avatar-wrapper">
                <ContactAvatar contact={contact} />
                <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
              </div>
              
              <div className="contact-info">
                <div className="contact-info-top">
                  <h4>{contact.username}</h4>
                  <span className="contact-time">{contact.lastActive}</span>
                </div>
                <div className="contact-info-bottom">
                  <p>{contact.lastMessage}</p>
                  {contact.unread > 0 && (
                    <span className="unread-badge">{contact.unread}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
