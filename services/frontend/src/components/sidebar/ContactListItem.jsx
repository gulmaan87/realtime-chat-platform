export default function ContactListItem({
  contact,
  isActive,
  isOnline,
  getAvatarColor,
  getInitials,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={`contact-item ${isActive ? "active" : ""}`}
      onClick={() => onSelect(contact)}
      aria-pressed={isActive}
    >
      <div
        className="contact-avatar"
        style={{ backgroundColor: getAvatarColor(contact.username || contact.email) }}
      >
        {getInitials(contact.username || contact.email)}
      </div>
      <div className="contact-info">
        <div className="contact-name">{contact.username || contact.email}</div>
        <div className="contact-status">{isOnline ? "Online" : "Offline"}</div>
      </div>
    </button>
  );
}
