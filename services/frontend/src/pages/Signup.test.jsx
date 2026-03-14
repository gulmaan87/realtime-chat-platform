import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import Signup from "./Signup";

// Mock global services and API
vi.mock("../services/session", () => ({
  clearSession: vi.fn(),
  setSession: vi.fn(),
  getSession: vi.fn(() => ({ token: null, user: null })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("Signup page", () => {
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
  });

  it("should render signup form correctly", () => {
    render(<Signup />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Up/i })).toBeInTheDocument();
  });

  it("should show error if fields are empty on submit", async () => {
    render(<Signup />);
    const submitBtn = screen.getByRole("button", { name: /Sign Up/i });
    
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
    });
  });

  it("should show error if password is too short", async () => {
    render(<Signup />);
    
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: "tester" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Sign Up/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it("should handle successful signup", async () => {
    const mockUser = { id: "1", username: "tester" };
    const mockToken = "fake-jwt";
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    render(<Signup />);
    
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: "tester" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign Up/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
