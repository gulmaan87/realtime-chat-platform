import { io } from "socket.io-client";

const SOCKET_URL = "https://realtime-chat-platform-socket.onrender.com";

export function createSocket(token) {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: token ? { token } : undefined,
  });
}
