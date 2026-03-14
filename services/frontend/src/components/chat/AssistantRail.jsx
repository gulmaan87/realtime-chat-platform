import { Phone, Mail, Calendar, User, Image as ImageIcon } from "lucide-react";

export default function AssistantRail({ activeChatUser }) {
  if (!activeChatUser) return <div className="chat-details-shell">Select a contact to view details</div>;

  return (
    <div className="chat-details-shell">
      <img
        src={`https://ui-avatars.com/api/?name=${activeChatUser.username}&size=120&background=random`}
        alt="Profile"
        className="profile-large-avatar"
      />
      <h3 className="profile-name">{activeChatUser.username}</h3>
      <p className="profile-role">Product Designer</p>

      <div className="social-links">
        {/* Placeholder social icons could go here */}
      </div>

      <button className="edit-profile-btn">Edit Profile</button>

      <div className="info-section">
        <div className="info-item">
          <Phone size={18} className="info-icon" />
          <div className="info-content">
            <label>Mobile</label>
            <p>+430 332 4567</p>
          </div>
        </div>
        <div className="info-item">
          <Mail size={18} className="info-icon" />
          <div className="info-content">
            <label>Email</label>
            <p>{activeChatUser.email || "no-email@example.com"}</p>
          </div>
        </div>
        <div className="info-item">
          <Calendar size={18} className="info-icon" />
          <div className="info-content">
            <label>Date of Birth</label>
            <p>02/12/1990</p>
          </div>
        </div>
        <div className="info-item">
          <User size={18} className="info-icon" />
          <div className="info-content">
            <label>Gender</label>
            <p>Male</p>
          </div>
        </div>
      </div>

      <div className="shared-media">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700 }}>Shared Media</h4>
          <button style={{ background: "none", border: "none", color: "#6b4ead", fontSize: "0.8rem", fontWeight: 600 }}>See All</button>
        </div>
        <div className="media-grid">
          <div className="media-item"><ImageIcon size={24} style={{ opacity: 0.2 }} /></div>
          <div className="media-item"><ImageIcon size={24} style={{ opacity: 0.2 }} /></div>
          <div className="media-item"><ImageIcon size={24} style={{ opacity: 0.2 }} /></div>
          <div className="media-item"><ImageIcon size={24} style={{ opacity: 0.2 }} /></div>
        </div>
      </div>
    </div>
  );
}
