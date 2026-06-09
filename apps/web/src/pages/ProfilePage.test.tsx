import { App } from "antd";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

const updatePassword = vi.fn();

vi.mock("../state/AuthContext", () => ({
  useAuth: () => ({
    apiClient: {},
    user: {
      id: "user-1",
      uid: "USER111111",
      username: "alice",
      publicKey: {},
      createdAt: new Date(0).toISOString()
    },
    privateKeyStatus: "ready",
    unlockPrivateKey: vi.fn(),
    updatePassword,
    exportPrivateKeyBackup: vi.fn(),
    importPrivateKeyBackup: vi.fn(),
    refreshMe: vi.fn()
  })
}));

describe("ProfilePage", () => {
  it("requires the new password confirmation to match before updating", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });

    const { container } = render(
      <App>
        <ProfilePage />
      </App>
    );

    fireEvent.change(container.querySelector('input[name="currentPassword"]') as HTMLInputElement, {
      target: { value: "old-password" }
    });
    fireEvent.change(container.querySelector('input[name="newPassword"]') as HTMLInputElement, {
      target: { value: "new-password-one" }
    });
    fireEvent.change(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, {
      target: { value: "new-password-two" }
    });
    fireEvent.click(container.querySelector(".profile-password-form button") as HTMLButtonElement);

    await waitFor(() => expect(updatePassword).not.toHaveBeenCalled());
  });
});
