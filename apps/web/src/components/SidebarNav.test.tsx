import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeModeProvider } from "../state/ThemeModeContext";
import { SidebarNav } from "./SidebarNav";

describe("SidebarNav", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });
  });

  it("asks for confirmation before logging out", async () => {
    const onLogout = vi.fn();

    render(
      <ThemeModeProvider>
        <MemoryRouter>
          <SidebarNav
            user={undefined}
            directUnreadCount={0}
            friendRequestCount={0}
            groupUnreadCount={0}
            groupNoticeCount={0}
            onLogout={onLogout}
          />
        </MemoryRouter>
      </ThemeModeProvider>
    );

    fireEvent.click(screen.getByLabelText("退出登录"));

    expect(onLogout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: (name) => name.replace(/\s/g, "") === "退出" }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });
});
