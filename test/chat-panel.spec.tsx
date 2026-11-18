import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "../components/chat/chat-panel";

describe("ChatPanel", () => {
  it("shows launcher button when widget is closed", () => {
    render(<ChatPanel appId="app-1" userId="user-1" />);
    expect(
      screen.getByRole("button", { name: /open chat widget/i }),
    ).toBeTruthy();
  });

  it("opens widget and shows start chat action", () => {
    render(<ChatPanel appId="app-1" userId="user-1" />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /open chat widget/i })[0],
    );
    expect(screen.getByRole("button", { name: /start chat/i })).toBeTruthy();
  });
});
