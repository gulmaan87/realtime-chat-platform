import { Search, Plus, Sparkles } from "lucide-react";

function formatLastSeen(status) {
  return status ? "Online now" : "Away";
}

export default function ContactList({
  onSelect,
  activeChatUser,
  contacts = [],
  onlineStatuses = {},
  query = "",
  onQueryChange,
  onAddContact,
  addContactBusy = false,
}) {
  return (
    <>
      <div className="contact-list-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand__mark">LU</div>
          <div>
            <strong>LevelUp Chat</strong>
            <span>Priority conversations</span>
          </div>
        </div>

        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon-fixed" />
          <input
            type="text"
            placeholder="Search by name or email"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            aria-label="Search conversations"
          />
          <button
            className="contact-add-button"
            type="button"
            onClick={onAddContact}
            disabled={addContactBusy}
            aria-label="Add contact"
            title="Add a contact by username or email"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="contact-items">
        <div className="contact-items__meta">
          <span>Recents</span>
          <small>{contacts.length} active</small>
        </div>

        {contacts.length ? (
          contacts.map((contact) => {
            const contactId = String(contact.id || contact._id);
            const isOnline = onlineStatuses[contactId];
            const isActive =
              String(activeChatUser?.id || activeChatUser?._id || "") === contactId;

            return (
              <button
                key={contactId}
                type="button"
                className={`contact-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(contact)}
              >
                <div className="contact-item__avatar-wrap">
                  <div className="avatar contact-avatar">{contact.username?.slice(0, 2).toUpperCase()}</div>
                  <span className={`contact-presence ${isOnline ? "online" : "offline"}`} />
                </div>

                <div className="contact-info">
                  <div className="contact-row">
                    <h4>{contact.username || contact.email}</h4>
                    <small>{contact.unreadCount ? `${contact.unreadCount} new` : "Open"}</small>
                  </div>
                  <p>{contact.lastMessagePreview || formatLastSeen(isOnline)}</p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="contact-empty-state">
            <div className="contact-empty-state__icon">
              <Sparkles size={18} />
            </div>
            <strong>No conversations yet</strong>
            <p>Add a teammate or search for someone to start your first realtime thread.</p>
          </div>
        )}
      </div>
    </>
  );
}
