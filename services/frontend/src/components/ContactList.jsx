import { useState } from "react";
import { Search, Plus } from "lucide-react";

function ContactAvatar({ contact }) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = contact.profilePicUrl && contact.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${contact.profilePicUrl}` : "";

  if (picUrl && !failed) {
    return (
      <div className="avatar" style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden" }}>
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
    <div className="avatar" style={{ backgroundColor: "#8b5cf6", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
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
  return (
    <>
      <div className="contact-list-header">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon-fixed" />
          <input type="text" placeholder="Search Conversations" />
          <button className="rail-button" style={{ width: "32px", height: "32px", color: "white" }}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="contact-items">
        <div style={{ padding: "0 20px 10px", fontSize: "0.75rem", opacity: 0.5, textTransform: "uppercase", fontWeight: 700 }}>Recent</div>
        {contacts.map((contact) => {
          const isOnline = onlineStatuses[String(contact.id || contact._id)];
          const isActive = activeChatUser?.id === contact.id || activeChatUser?._id === contact._id;

          return (
            <div
              key={contact.id || contact._id}
              className={`contact-item ${isActive ? "active" : ""}`}
              onClick={() => onSelect(contact)}
            >
              <ContactAvatar contact={contact} />
              <div className="contact-info">
                <h4>{contact.username}</h4>
                <p>{isOnline ? "Online" : "Offline"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
