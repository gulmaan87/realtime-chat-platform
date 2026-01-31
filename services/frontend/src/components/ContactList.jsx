import { useEffect, useState } from "react";

export default function ContactList({ onSelect, activeChatUser }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    // Fetch all users (you can replace this with a contacts endpoint later)
    fetch("http://localhost:3002/auth/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) {
          // Fallback: return empty array if endpoint doesn't exist
          return [];
        }
        return res.json();
      })
      .then(data => {
        // Filter out current user and format contacts
        const users = Array.isArray(data) ? data : (data.users || []);
        const currentUserId = currentUser.id || currentUser._id;
        const filtered = users
          .filter(u => {
            const userId = u._id?.toString() || u.id?.toString();
            return userId !== currentUserId?.toString() && u.username !== currentUser.username;
          })
          .map(u => ({
            id: u._id?.toString() || u.id?.toString(),
            username: u.username,
            email: u.email,
            profilePicUrl: u.profilePicUrl,
            status: u.status
          }));
        setContacts(filtered);
      })
      .catch(err => {
        console.error("Failed to fetch contacts:", err);
        setContacts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = [
      "#0084ff", "#ff6b6b", "#4ecdc4", "#45b7d1",
      "#f9ca24", "#6c5ce7", "#a29bfe", "#fd79a8",
      "#00b894", "#e17055", "#0984e3", "#00cec9"
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  if (loading) {
    return (
      <div className="contact-list">
        <div className="contact-list-header">
          <h3>Contacts</h3>
        </div>
        <div className="contact-loading">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>Contacts</h3>
      </div>
      <div className="contact-items">
        {contacts.length === 0 ? (
          <div className="contact-empty">No contacts found</div>
        ) : (
          contacts.map(contact => {
            const isActive = activeChatUser?.id === contact.id;
            return (
              <div
                key={contact.id}
                className={`contact-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(contact)}
              >
                <div
                  className="contact-avatar"
                  style={{ backgroundColor: getAvatarColor(contact.username || contact.email) }}
                >
                  {getInitials(contact.username || contact.email)}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.username || contact.email}</div>
                  <div className="contact-status">{contact.status || "Hey there! I am using ChatApp"}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
