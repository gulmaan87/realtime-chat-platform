import { io } from "socket.io-client";

const SOCKET_URL = "https://realtime-chat-platform-socket.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
