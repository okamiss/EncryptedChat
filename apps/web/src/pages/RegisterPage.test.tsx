import { App } from "antd";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

const register = vi.fn();

vi.mock("../state/AuthContext", () => ({
  useAuth: () => ({ register })
}));

vi.mock("../components/ThemeModeButton", () => ({
  ThemeModeButton: () => <button type="button">theme</button>
}));

describe("RegisterPage", () => {
  it("requires the password confirmation to match before registering", async () => {
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
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </App>
    );

    const textInputs = Array.from(container.querySelectorAll("input"));
    fireEvent.change(textInputs[0], { target: { value: "alice" } });
    fireEvent.change(container.querySelector('input[name="password"]') as HTMLInputElement, {
      target: { value: "password-one" }
    });
    fireEvent.change(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, {
      target: { value: "password-two" }
    });
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(register).not.toHaveBeenCalled());
  });
});
