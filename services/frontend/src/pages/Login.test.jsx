import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import Login from "./Login";

// Mock global services and API
vi.mock("../services/session", () => ({
  clearSession: vi.fn(),
  setSession: vi.fn(),
  getSession: vi.fn(() => ({ token: null, user: null })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("Login page", () => {
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

  it("should render login form correctly", () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("should show error if fields are empty on submit", async () => {
    render(<Login />);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    
    // We need to trigger the browser's form validation or the component's internal check
    // Since we're using 'required' on inputs, standard browser validation applies.
    // However, the component also has its own check.
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Email and password are required/i)).toBeInTheDocument();
    });
  });

  it("should handle successful login", async () => {
    const mockUser = { id: "1", username: "tester" };
    const mockToken = "fake-jwt";
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("should display error message on failed login", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid credentials" }),
    });

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
