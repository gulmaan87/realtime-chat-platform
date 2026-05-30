import { AUTH_API_URL, CHAT_API_URL } from "./serviceUrls";

function buildHeaders(token, extraHeaders = {}) {
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
}

function buildRoomId(userA, userB) {
  return [String(userA), String(userB)].sort().join(":");
}

async function safeJson(res, fallback) {
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function fetchChatHistory(currentUserId, partnerUserId) {
  if (!currentUserId || !partnerUserId) {
    return { messages: [] };
  }

  const token = localStorage.getItem("token");
  const roomId = buildRoomId(currentUserId, partnerUserId);
  const res = await fetch(`${CHAT_API_URL}/api/chats/${roomId}`, {
    headers: buildHeaders(token),
  });

  if (!res.ok) {
    return { messages: [] };
  }

  return safeJson(res, { messages: [] });
}

export async function fetchContacts() {
  const token = localStorage.getItem("token");
  if (!token) return [];

  const res = await fetch(`${AUTH_API_URL}/contacts`, {
    headers: buildHeaders(token),
  });

  if (!res.ok) {
    return [];
  }

  const data = await safeJson(res, []);
  return Array.isArray(data) ? data : [];
}

export async function fetchUsers() {
  const token = localStorage.getItem("token");
  if (!token) return [];

  const res = await fetch(`${AUTH_API_URL}/auth/users`, {
    headers: buildHeaders(token),
  });

  if (!res.ok) {
    return [];
  }

  const data = await safeJson(res, []);
  return Array.isArray(data) ? data : [];
}

export async function addContact(identifier) {
  const token = localStorage.getItem("token");
  if (!token || !identifier) {
    throw new Error("A valid contact identifier is required");
  }

  const res = await fetch(`${AUTH_API_URL}/contacts`, {
    method: "POST",
    headers: buildHeaders(token, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ identifier }),
  });

  const data = await safeJson(res, {});
  if (!res.ok) {
    throw new Error(data.message || "Failed to add contact");
  }

  return data.contact || null;
}
