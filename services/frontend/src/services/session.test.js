import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSession, setSession, clearSession, getUserId } from "./session";

// Manual mock for localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true
});

describe("session service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should return null session if localStorage is empty", () => {
    const session = getSession();
    expect(session).toEqual({ token: null, user: null });
  });

  it("should store and retrieve session data", () => {
    const testUser = { id: "123", username: "testuser" };
    const testToken = "abc-token";

    setSession({ token: testToken, user: testUser });

    expect(localStorage.getItem("token")).toBe(testToken);
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(testUser);

    const session = getSession();
    expect(session).toEqual({ token: testToken, user: testUser });
  });

  it("should clear session", () => {
    localStorage.setItem("token", "some-token");
    localStorage.setItem("user", JSON.stringify({ id: "1" }));

    clearSession();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(getSession()).toEqual({ token: null, user: null });
  });

  it("should extract userId correctly", () => {
    expect(getUserId({ id: "123" })).toBe("123");
    expect(getUserId({ _id: "456" })).toBe("456");
    expect(getUserId({ userId: "789" })).toBe("789");
    expect(getUserId(null)).toBeNull();
  });
});
