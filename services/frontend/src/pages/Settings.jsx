import { useEffect, useState } from "react";
import "./Settings.css";
import { ArrowLeft, User, LogOut, Upload, Save, Settings as SettingsIcon, UserCircle, MessageSquare } from "lucide-react";

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://realtime-chat-platform-1.onrender.com";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const token = localStorage.getItem("token");


  useEffect(() => {
    // Enable scrolling on settings page
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    
    return () => {
      // Reset on unmount
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    fetch(`${AUTH_API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async res => {
        let data;
        try {
          data = await res.json();
        } catch {
          // If response is not JSON, get text
          const text = await res.text();
          throw new Error(text || `Server error (${res.status})`);
        }
        
        if (!res.ok) {
          throw new Error(data.message || data.error || `Failed to fetch profile (${res.status})`);
        }
        return data;
      })
      .then(data => {
        if (!data) {
          throw new Error("No profile data received");
        }
        console.log("Profile loaded:", data);
        console.log("Profile picture URL:", data.profilePicUrl);
        console.log("Full image URL:", data.profilePicUrl ? `${AUTH_API_URL}${data.profilePicUrl}` : "No URL");
        setProfile(data);
        setStatus(data.status || "");
        setError("");
      })
      .catch(err => {
        console.error("Error fetching profile:", err);
        let errorMessage = err.message || "Failed to load profile. Please try again.";
        
        // Handle network errors
        if (err.name === "TypeError" && err.message.includes("fetch")) {
          errorMessage = "Cannot connect to server. Please check if the backend is running.";
        }
        
        setError(errorMessage);
        
        // If it's an auth error, redirect to login
        if (errorMessage.includes("401") || 
            errorMessage.includes("Invalid token") || 
            errorMessage.includes("No token") ||
            errorMessage.includes("Token expired") ||
            errorMessage.includes("Authentication failed")) {
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const saveStatus = async () => {
    if (!token) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${AUTH_API_URL}/users/me/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      await res.json();
      setSuccessMessage("Status updated successfully");
      setError("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePic = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    if (!token) return;

    // Validate file size (9MB max)
    if (file.size > 9 * 1024 * 1024) {
      setError("File size must be less than 9MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);
  
    try {
      const res = await fetch(`${AUTH_API_URL}/users/me/profile-pic`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      // Read response body only once
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || `Failed to upload profile picture (${res.status})`);
      }
  
      console.log("Upload response:", data);
      console.log("New profilePicUrl:", data.profilePicUrl);
      console.log("Full image URL will be:", `${AUTH_API_URL}${data.profilePicUrl}`);
  
      // Update profile with new image URL
      const updatedProfile = {
        ...profile,
        profilePicUrl: data.profilePicUrl
      };
      setProfile(updatedProfile);
      setError("");
      setSuccessMessage("Profile picture updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Reset file input
      e.target.value = "";
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      // Handle JSON parse errors
      if (err.name === "SyntaxError" || err.message.includes("JSON")) {
        setError("Invalid response from server. Please try again.");
      } else {
        const errorMessage = err.message || "Failed to upload profile picture. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  

  if (loading && !profile) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load profile</h3>
          <p>{error || "An unknown error occurred. Please try again."}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="retry-button">
              Retry
            </button>
            <a href="/" className="error-link">Go back to chat</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {successMessage && (
        <div className="success-toast">
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✓
          </div>
          {successMessage}
        </div>
      )}
      <div className="settings-container">
        <div className="settings-card">
          <div className="settings-header">
            <h2>Account Settings</h2>
            <button onClick={() => window.location.href = "/"} className="back-button">
              <ArrowLeft size={18} />
              Back to Chat
            </button>
          </div>
          
          <div className="settings-content">
            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            {/* Profile Picture Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <UserCircle size={20} />
                  Profile Picture
                </h3>
                <p className="section-description">
                  Update your profile picture to personalize your account
                </p>
              </div>
              <div className="profile-picture-section">
                <div className="profile-picture-wrapper">
                  {profile?.profilePicUrl ? (
                    <img
                      src={`${AUTH_API_URL}${profile.profilePicUrl}?t=${Date.now()}`}
                      alt="Profile"
                      className="profile-picture"
                      key={profile.profilePicUrl}
                      onError={(e) => {
                        const imageUrl = `${AUTH_API_URL}${profile.profilePicUrl}`;
                        console.error("Failed to load profile picture from:", imageUrl);
                        console.error("Error details:", e);
                        // Hide the broken image and show placeholder
                        if (e.target) {
                          e.target.style.display = "none";
                        }
                        const placeholder = e.target?.nextSibling || e.target?.parentElement?.querySelector('.profile-picture-placeholder');
                        if (placeholder) {
                          placeholder.style.display = "flex";
                        }
                      }}
                      onLoad={() => {
                        console.log("Profile picture loaded successfully:", `${AUTH_API_URL}${profile.profilePicUrl}`);
                      }}
                    />
                  ) : null}
                  <div 
                    className="profile-picture-placeholder"
                    style={{ display: profile?.profilePicUrl ? "none" : "flex" }}
                  >
                    {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadProfilePic}
                    disabled={loading}
                    className="file-input"
                    id="profile-pic-input"
                  />
                  <label htmlFor="profile-pic-input" className="file-input-label">
                    <Upload size={16} />
                    {loading ? "Uploading..." : "Change Picture"}
                  </label>
                </div>
              </div>
            </div>

            {/* User Info Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <User size={20} />
                  Account Information
                </h3>
                <p className="section-description">
                  Your account details and contact information
                </p>
              </div>
              <div className="user-info-grid">
                <div className="info-item">
                  <span className="info-label">Username</span>
                  <span className="info-value">{profile?.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{profile?.email}</span>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <MessageSquare size={20} />
                  Status Message
                </h3>
                <p className="section-description">
                  Set a custom status message that others will see
                </p>
              </div>
              <div className="status-input-wrapper">
                <input
                  id="status-input"
                  type="text"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  disabled={loading}
                  className="status-input"
                />
              </div>
              <button 
                onClick={saveStatus}
                disabled={loading}
                className="save-button"
              >
                <Save size={16} />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
