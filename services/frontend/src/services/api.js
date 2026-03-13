const API_URL = "https://realtime-chat-platform-api-service.onrender.com";

function buildRoomId(userA, userB) {
  return [String(userA), String(userB)].sort().join(":");
}

export async function fetchChatHistory(currentUserId, partnerUserId) {
  if (!currentUserId || !partnerUserId) {
    return { messages: [] };
  }

  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const roomId = buildRoomId(currentUserId, partnerUserId);
  const res = await fetch(`${API_URL}/api/chats/${roomId}`, { headers });

  if (!res.ok) {
    return { messages: [] };
  }

  return res.json();
}
