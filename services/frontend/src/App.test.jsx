import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import App from "./App";
import * as session from "./services/session";

// Mock child components
vi.mock("./pages/Landing", () => ({ default: () => <div data-testid="landing-page">Landing Page</div> }));
vi.mock("./pages/Login", () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock("./pages/Signup", () => ({ default: () => <div data-testid="signup-page">Signup Page</div> }));
vi.mock("./pages/Chat", () => ({ default: () => <div data-testid="chat-page">Chat Page</div> }));
vi.mock("./pages/Settings", () => ({ default: () => <div data-testid="settings-page">Settings Page</div> }));

describe("App component routing", () => {
  const originalLocation = window.location;

  beforeAll(() => {
    delete window.location;
    window.location = { pathname: "/", replace: vi.fn() };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.pathname = "/";
  });

  it("should render Landing page on /", () => {
    window.location.pathname = "/";
    render(<App />);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
  });

  it("should render Login page on /login", () => {
    window.location.pathname = "/login";
    render(<App />);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("should redirect to login if accessing /app without token", async () => {
    window.location.pathname = "/app";
    render(<App />);
    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("should render Chat page on /app if token exists", () => {
    localStorage.setItem("token", "fake-token");
    window.location.pathname = "/app";
    render(<App />);
    expect(screen.getByTestId("chat-page")).toBeInTheDocument();
  });

  it("should redirect to /app if on /login with token", async () => {
    localStorage.setItem("token", "fake-token");
    window.location.pathname = "/login";
    render(<App />);
    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith("/app");
    });
  });
});
