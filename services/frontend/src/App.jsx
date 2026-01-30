import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === "/login") return "login";
    if (path === "/signup") return "signup";
    return "chat";
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Handle browser navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/login") setCurrentPage("login");
      else if (path === "/signup") setCurrentPage("signup");
      else setCurrentPage("chat");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Redirect to login if no token and trying to access chat
  if (!token && currentPage === "chat") {
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

  return <Chat />;
}
