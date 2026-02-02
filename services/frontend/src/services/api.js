const API_URL = "https://realtime-chat-platform-api-service.onrender.com";

export async function fetchChatHistory(roomId) {
  const token = localStorage.getItem("token");

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/chats/${roomId}`, {
    headers,
  });

  return res.json();
}
