import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import Settings from "./Settings";
import * as session from "../services/session";

vi.mock("../services/session", () => ({
  clearSession: vi.fn(),
  getSession: vi.fn(() => ({ token: "fake-token", user: { id: "1", username: "testuser", email: "test@example.com" } })),
  getUserId: vi.fn(() => "1"),
}));

global.fetch = vi.fn();

describe("Settings page", () => {
  const originalLocation = window.location;

  beforeAll(() => {
    delete window.location;
    window.location = { href: "" };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
    localStorage.clear();
    localStorage.setItem("token", "fake-token");
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "1",
        username: "testuser",
        email: "test@example.com",
        profilePicUrl: "/uploads/test.jpg",
        status: "Online"
      }),
    });
  });

  it("should render settings options and profile data", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
    });
    
    // Verify profile data is rendered
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    
    // Verify elements
    expect(screen.getByRole("button", { name: /Back to Chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
  });

  it("should handle navigation back to chat", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Back to Chat/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole("button", { name: /Back to Chat/i }));
    expect(window.location.href).toBe("/app");
  });
});
