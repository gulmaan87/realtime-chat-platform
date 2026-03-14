const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise;
let isInitialized = false;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Gets a Google ID Token using Google One Tap / FedCM.
 * Handles migration to FedCM and prevents multiple initializations.
 */
export async function getGoogleCredential(googleClientId) {
  if (!googleClientId) {
    throw new Error("Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.");
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    // 60s timeout for user interaction
    const timeout = setTimeout(() => {
      reject(new Error("Google login timed out. Please try again."));
    }, 60000);

    const handleCallback = (response) => {
      clearTimeout(timeout);
      if (response?.credential) {
        resolve(response.credential);
      } else {
        reject(new Error("Google login failed to return a credential."));
      }
    };

    try {
      // Only initialize once to avoid GSI warnings
      if (!isInitialized) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          use_fedcm_for_prompt: true, // Crucial for migration
          itp_support: true,
          callback: handleCallback,
          error_callback: (error) => {
            clearTimeout(timeout);
            console.error("GSI Error:", error);
            reject(new Error(`Google Identity error: ${error.type}`));
          }
        });
        isInitialized = true;
      } else {
        // If already initialized, we need to update the callback for this specific call
        // Note: Google's API doesn't have a direct 'updateCallback', but initialize 
        // effectively sets the global handler.
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          use_fedcm_for_prompt: true,
          itp_support: true,
          callback: handleCallback
        });
      }

      window.google.accounts.id.prompt((notification) => {
        const moment = notification.getMomentType();
        console.log("GSI Notification:", moment);

        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.warn("GSI Not Displayed:", reason);
          
          // Re-prompt via overlay if One Tap is suppressed (e.g. opt_out)
          if (reason === "opt_out" || reason === "suppressed_by_user") {
            clearTimeout(timeout);
            reject(new Error("Google sign-in was suppressed. Please use the Google button directly."));
          }
        }

        if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason();
          console.warn("GSI Skipped:", reason);
          
          if (reason === "user_cancel" || reason === "tap_outside") {
            clearTimeout(timeout);
            reject(new Error("Google sign-in dismissed."));
          }
        }
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}
