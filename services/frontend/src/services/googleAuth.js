const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise;

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

export async function getGoogleCredential(googleClientId) {
  if (!googleClientId) {
    throw new Error("Google OAuth is not configured");
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Google login timed out. Please try again."));
    }, 20000);

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        clearTimeout(timeout);
        if (!response?.credential) {
          reject(new Error("Google login was cancelled"));
          return;
        }
        resolve(response.credential);
      }
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        clearTimeout(timeout);
        reject(new Error("Google sign-in is unavailable on this browser."));
      }
    });
  });
}
