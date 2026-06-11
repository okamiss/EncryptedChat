import { App } from "antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrivateKeyUnlockPrompt } from "./PrivateKeyUnlockPrompt";

const unlockPrivateKey = vi.fn();

vi.mock("../state/AuthContext", () => ({
  useAuth: () => ({
    privateKeyStatus: "locked",
    unlockPrivateKey
  })
}));

describe("PrivateKeyUnlockPrompt", () => {
  it("opens a quick password dialog from the locked-key notice", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });

    render(
      <App>
        <PrivateKeyUnlockPrompt />
      </App>
    );

    fireEvent.click(screen.getByRole("button", { name: "快速解锁" }));
    fireEvent.change(screen.getByPlaceholderText("输入登录密码解锁私钥"), {
      target: { value: "correct-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "解锁私钥" }));

    await waitFor(() => expect(unlockPrivateKey).toHaveBeenCalledWith("correct-password"));
  });
});
