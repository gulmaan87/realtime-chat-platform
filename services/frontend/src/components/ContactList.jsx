import { Search, Plus } from "lucide-react";

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
              <div className="avatar" style={{ backgroundColor: "#8b5cf6", width: "44px", height: "44px" }}>
                {contact.username?.slice(0, 2).toUpperCase()}
              </div>
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
