const API_URL = "http://localhost:3000";

export async function fetchChatHistory(roomId) {
  const res = await fetch(`${API_URL}/api/chats/${roomId}`, {
    headers: {
      Authorization: "demo-token",
    },
  });

  return res.json();
}
