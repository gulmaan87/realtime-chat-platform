import { useState } from "react";

export default function ContactListItem({
  contact,
  isActive,
  isOnline,
  getAvatarColor,
  getInitials,
  onSelect,
}) {
  const [failed, setFailed] = useState(false);
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";
  const picUrl = contact?.profilePicUrl && contact.profilePicUrl.startsWith("/uploads/") ? `${AUTH_API_URL}${contact.profilePicUrl}` : "";

  return (
    <button
      type="button"
      className={`contact-item ${isActive ? "active" : ""}`}
      onClick={() => onSelect(contact)}
      aria-pressed={isActive}
    >
      {picUrl && !failed ? (
        <div className="contact-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={picUrl}
            alt={contact.username || contact.email}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div
          className="contact-avatar"
          style={{ backgroundColor: getAvatarColor(contact.username || contact.email) }}
        >
          {getInitials(contact.username || contact.email)}
        </div>
      )}
      <div className="contact-info">
        <div className="contact-name">{contact.username || contact.email}</div>
        <div className="contact-status">{isOnline ? "Online" : "Offline"}</div>
      </div>
    </button>
  );
}
