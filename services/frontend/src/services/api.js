const API_URL = "https://realtime-chat-platform-api-service.onrender.com";

export async function fetchChatHistory(roomId) {
  const res = await fetch(`${API_URL}/api/chats/${roomId}`, {
    headers: {
      Authorization: "demo-token",
    },
  });

  return res.json();
}
