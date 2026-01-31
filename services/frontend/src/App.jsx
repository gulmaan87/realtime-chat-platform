import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
// import ContactList from "./components/ContactList";

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === "/login") return "login";
    if (path === "/signup") return "signup";
    if (path === "/settings") return "settings";
    return "chat";
  });

  const token = localStorage.getItem("token");
  const [activeChatUser, setActiveChatUser] = useState(null);

  useEffect(() => {
    // Handle browser navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/login") setCurrentPage("login");
      else if (path === "/signup") setCurrentPage("signup");
      else if (path === "/settings") setCurrentPage("settings");
      else setCurrentPage("chat");

    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Redirect to login if no token and trying to access chat or settings
  if (!token && (currentPage === "chat" || currentPage === "settings")) {
    window.location.href = "/login";
    return null;
  }

  // Redirect to chat if has token and on login/signup
  if (token && (currentPage === "login" || currentPage === "signup")) {
    window.location.href = "/";
    return null;
  }

  if (currentPage === "login") {
    return <Login />;
  }

  if (currentPage === "signup") {
    return <Signup />;
  }
  if (currentPage === "settings") {
    return <Settings />;
  }

  return <Chat activeChatUser={activeChatUser} setActiveChatUser={setActiveChatUser} />;
}
