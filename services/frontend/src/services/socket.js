import { io } from "socket.io-client";

const SOCKET_URL = "https://realtime-chat-platform-socket.onrender.com";

export function createSocket(token) {
  if (typeof window !== "undefined" && window.__E2E_TEST_MODE__) {
    console.log("E2E Test Mode: Using mock socket");
    const mockSocket = {
      on: (event, cb) => {
        if (event === "connect") {
          setTimeout(() => cb(), 100);
        }
      },
      emit: (event, data) => {
        console.log(`Mock socket emit: ${event}`, data);
      },
      connect: () => {
        console.log("Mock socket connect called");
      },
      disconnect: () => {
        console.log("Mock socket disconnect called");
      },
      off: () => {},
    };
    return mockSocket;
  }

  return io(SOCKET_URL, {
    autoConnect: false,
    auth: token ? { token } : undefined,
  });
}
