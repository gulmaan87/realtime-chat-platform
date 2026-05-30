function isLocalHost(value = "") {
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

function getBrowserHost() {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

function resolveUrl({ explicitEnv, localDefault, remoteDefault }) {
  if (explicitEnv) return explicitEnv;
  return isLocalHost(getBrowserHost()) ? localDefault : remoteDefault;
}

export const AUTH_API_URL = resolveUrl({
  explicitEnv: import.meta.env.VITE_AUTH_API_URL,
  localDefault: "http://localhost:3002",
  remoteDefault: "https://realtime-chat-platform-1.onrender.com",
});

export const CHAT_API_URL = resolveUrl({
  explicitEnv: import.meta.env.VITE_CHAT_API_URL,
  localDefault: "http://localhost:3000",
  remoteDefault: "https://realtime-chat-platform-api-service.onrender.com",
});

export const SOCKET_URL = resolveUrl({
  explicitEnv: import.meta.env.VITE_SOCKET_URL,
  localDefault: "http://localhost:3001",
  remoteDefault: "https://realtime-chat-platform-socket.onrender.com",
});
