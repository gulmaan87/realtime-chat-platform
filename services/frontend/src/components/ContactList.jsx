import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";

export default function ContactList({ onSelect, activeChatUser, onContactsLoaded, onlineStatuses = {} }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const normalizeContact = useCallback((user) => {
    if (!user || typeof user !== "object") return null;

    const id = user._id?.toString() || user.id?.toString();
    if (!id) return null;

    return {
      id,
      username: user.username || "",
      email: user.email || "",
      profilePicUrl: user.profilePicUrl || "",
      status: user.status || ""
    };
  }, []);

const isNotCurrentUser = useCallback((contact) => {
  const currentUserId = (currentUser.id || currentUser._id)?.toString();
  return contact.id !== currentUserId && contact.username !== currentUser.username;
}, [currentUser.id, currentUser._id, currentUser.username]);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    // Fetch only logged-in user's contacts
    fetch(`${AUTH_API_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          return [];
        }
        return res.json();
      })
      .then((data) => {
        // Filter out current user and format contacts
        const users = Array.isArray(data) ? data : (data.users || []);
        const normalizedUsers = users.map(normalizeContact).filter(Boolean);
        const filtered = normalizedUsers.filter(isNotCurrentUser);
        setContacts(filtered);
        onContactsLoaded?.(filtered.map((contact) => contact.id));
      })
      .catch((err) => {
        console.error("Failed to fetch contacts:", err);
        setContacts([]);
      })
      .finally(() => setLoading(false));
  }, [isNotCurrentUser, normalizeContact, onContactsLoaded]);
  }, [currentUser.id, currentUser._id, currentUser.username, normalizeContact, onContactsLoaded]);
//   }, [currentUser.id, currentUser._id, currentUser.username, onContactsLoaded]);
  }, [currentUser.id, currentUser._id, currentUser.username,onContactsLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchContacts]);

  async function handleAddFriend(e) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    const username = addUsername.trim();
    if (!username) {
      setAddError("Enter a username or email");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(`${AUTH_API_URL}/contacts/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ username, identifier: username, email: username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.message || "Could not add friend");
        setAddLoading(false);
        return;
      }
      const createdContact = normalizeContact(data.contact);
      if (createdContact) {
        setContacts((prev) => {
          const exists = prev.some((contact) => contact.id === createdContact.id);
          if (exists) return prev;
          const next = [...prev, createdContact];
          onContactsLoaded?.(next.map((contact) => contact.id));
          return next;
        });
      }

      setAddSuccess("Friend added!");
      setAddUsername("");
      fetchContacts();
      setTimeout(() => {
        setAddSuccess("");
        setShowAddFriend(false);
      }, 1500);
    } catch {
      setAddError("Network error. Try again.");
    }
    setAddLoading(false);
  }

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
          <button
            type="button"
            className="contact-add-friend-btn"
            onClick={() => setShowAddFriend(true)}
            title="Add friend"
          >
            <UserPlus size={20} />
            <span>Add friend</span>
          </button>
        </div>
        <div className="contact-loading">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>Contacts</h3>
        <button
          type="button"
          className="contact-add-friend-btn"
          onClick={() => setShowAddFriend(true)}
          title="Add friend"
        >
          <UserPlus size={20} />
          <span>Add friend</span>
        </button>
      </div>

      {showAddFriend && (
        <div className="add-friend-panel">
          <div className="add-friend-header">
            <h4>Add friend</h4>
            <button
              type="button"
              className="add-friend-close"
              onClick={() => {
                setShowAddFriend(false);
                setAddUsername("");
                setAddError("");
                setAddSuccess("");
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleAddFriend} className="add-friend-form">
            <input
              type="text"
              placeholder="Enter username or email"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="add-friend-input"
              autoFocus
              disabled={addLoading}
            />
            {addError && <div className="add-friend-error">{addError}</div>}
            {addSuccess && <div className="add-friend-success">{addSuccess}</div>}
            <button type="submit" className="add-friend-submit" disabled={addLoading}>
              {addLoading ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}
      
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
                  <div className="contact-status">{onlineStatuses[String(contact.id)] ? "Online" : "Offline"}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
