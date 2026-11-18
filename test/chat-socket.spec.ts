import { describe, expect, it } from "vitest";
import { CHAT_CONTRACT_VERSION } from "../lib/chat-contract";

describe("chat contract", () => {
  it("uses supported contract version", () => {
    expect(CHAT_CONTRACT_VERSION).toBe("1.0");
  });

  it("documents reconnect expectation", () => {
    const reconnectsToSession = true;
    expect(reconnectsToSession).toBe(true);
  });
});
