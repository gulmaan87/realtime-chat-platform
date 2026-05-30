import { test, expect } from "@playwright/test";

const AUTH_API_URL = "https://realtime-chat-platform-1.onrender.com";

test.describe("Collaboration Features", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__E2E_TEST_MODE__ = true;
      window.localStorage.setItem("token", "fake-jwt-token");
      window.localStorage.setItem("user", JSON.stringify({
        id: "123",
        username: "testuser",
        email: "test@example.com",
      }));

      const makeTrack = (kind) => ({
        kind,
        enabled: true,
        stop() {},
      });

      if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, "mediaDevices", {
          value: {},
          configurable: true,
        });
      }

      navigator.mediaDevices.getUserMedia = async (constraints = {}) => ({
        getTracks: () => [
          makeTrack("audio"),
          ...(constraints.video ? [makeTrack("video")] : []),
        ],
        getAudioTracks: () => [makeTrack("audio")],
        getVideoTracks: () => (constraints.video ? [makeTrack("video")] : []),
      });

      class MockRTCPeerConnection {
        constructor() {
          this.connectionState = "new";
          this.localDescription = null;
          this.remoteDescription = null;
          this.onicecandidate = null;
          this.ontrack = null;
          this.onconnectionstatechange = null;
        }

        addTrack() {}

        async createOffer() {
          return { type: "offer", sdp: "fake-offer-sdp" };
        }

        async createAnswer() {
          return { type: "answer", sdp: "fake-answer-sdp" };
        }

        async setLocalDescription(description) {
          this.localDescription = description;
        }

        async setRemoteDescription(description) {
          this.remoteDescription = description;
          this.connectionState = "connected";
          this.onconnectionstatechange?.();
        }

        async addIceCandidate() {}

        close() {
          this.connectionState = "closed";
        }
      }

      window.RTCPeerConnection = MockRTCPeerConnection;
      window.RTCSessionDescription = class {
        constructor(value) {
          return value;
        }
      };
      window.RTCIceCandidate = class {
        constructor(value) {
          return value;
        }
      };
    });

    await page.route(`${AUTH_API_URL}/contacts`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "456", username: "friend", email: "friend@example.com", status: "Online now" },
        ]),
      });
    });

    await page.route(`${AUTH_API_URL}/auth/users`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "456", username: "friend", email: "friend@example.com", status: "Online now" },
        ]),
      });
    });

    await page.route("**/api/chats/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [] }),
      });
    });

    await page.goto("/app");
    await page.getByRole("button", { name: /friend/i }).first().click();
    await expect(page.getByTitle("Voice call")).toBeVisible();
  });

  test("Audio call flow opens and can be ended", async ({ page }) => {
    await page.getByTitle("Voice call").click();

    await expect(page.getByText("Audio call")).toBeVisible();
    await expect(page.getByText("Calling friend")).toBeVisible();
    await expect(page.getByText("Waiting for friend to answer...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mute" })).toBeVisible();

    await page.getByRole("button", { name: "End call" }).click();
    await expect(page.getByText("Audio call")).not.toBeVisible();
  });

  test("Video call flow opens camera controls and can be ended", async ({ page }) => {
    await page.getByTitle("Video call").click();

    await expect(page.getByText("Video call")).toBeVisible();
    await expect(page.getByText("Calling friend")).toBeVisible();
    await expect(page.getByRole("button", { name: "Camera on" })).toBeVisible();

    await page.getByRole("button", { name: "Mute" }).click();
    await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();

    await page.getByRole("button", { name: "Camera on" }).click();
    await expect(page.getByRole("button", { name: "Camera off" })).toBeVisible();

    await page.getByRole("button", { name: "End call" }).click();
    await expect(page.getByText("Video call")).not.toBeVisible();
  });
});
