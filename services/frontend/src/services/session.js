function safeParseUser(rawUser) {
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function getSession() {
  const token = localStorage.getItem("token");
  const user = safeParseUser(localStorage.getItem("user"));

  if (!token || !user) {
    return { token: null, user: null };
  }

  return { token, user };
}

export function getUserId(user) {
  if (!user) return null;
  return user.id || user._id || user.userId || null;
}

export function setSession({ token, user }) {
  if (!token || !user) {
    clearSession();
    return;
  }

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("session:changed"));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("session:changed"));
}
