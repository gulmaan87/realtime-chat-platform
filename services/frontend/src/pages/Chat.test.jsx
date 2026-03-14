import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import Chat from "./Chat";
import * as session from "../services/session";
import * as api from "../services/api";

// Mock child components to isolate Chat testing
vi.mock("../components/ContactList", () => ({ default: () => <div data-testid="contact-list" /> }));
vi.mock("../components/chat/ChatHeader", () => ({ default: () => <div data-testid="chat-header" /> }));
vi.mock("../components/chat/MessageTimeline", () => ({ default: () => <div data-testid="message-timeline" /> }));
vi.mock("../components/chat/MessageComposer", () => ({ default: () => <div data-testid="message-composer" /> }));
vi.mock("../components/chat/AssistantRail", () => ({ default: () => <div data-testid="assistant-rail" /> }));
vi.mock("../components/chat/FriendshipPanel", () => ({ default: () => <div data-testid="friendship-panel" /> }));

vi.mock("../services/session", () => ({
  clearSession: vi.fn(),
  getSession: vi.fn(() => ({ token: "fake-token", user: { id: "1", username: "testuser" } })),
  getUserId: vi.fn(() => "1"),
}));

vi.mock("../services/api", () => ({
  fetchChatHistory: vi.fn(),
}));

vi.mock("../services/socket", () => ({
  createSocket: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    off: vi.fn(),
  })),
}));

describe("Chat page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", "fake-token");
    api.fetchChatHistory.mockResolvedValue({ messages: [] });
  });

  it("should render main chat components", async () => {
    const activeUser = { id: "2", username: "friend" };
    render(<Chat activeChatUser={activeUser} setActiveChatUser={vi.fn()} />);
    
    expect(screen.getByTestId("contact-list")).toBeInTheDocument();
    expect(screen.getByTestId("chat-header")).toBeInTheDocument();
    expect(screen.getByTestId("message-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("message-composer")).toBeInTheDocument();
    expect(screen.getByTestId("assistant-rail")).toBeInTheDocument();
  });
});
