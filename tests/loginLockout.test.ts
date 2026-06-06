import { describe, it, expect } from "vitest";
import {
  clearFailedLogin,
  getLoginLockoutMs,
  registerFailedLogin,
} from "@/lib/loginLockout";

describe("loginLockout", () => {
  it("locks out after repeated failures", () => {
    const key = `test-lockout-${Date.now()}`;
    clearFailedLogin(key);

    for (let i = 0; i < 4; i++) {
      registerFailedLogin(key);
      expect(getLoginLockoutMs(key)).toBe(0);
    }

    registerFailedLogin(key);
    expect(getLoginLockoutMs(key)).toBeGreaterThan(0);

    clearFailedLogin(key);
    expect(getLoginLockoutMs(key)).toBe(0);
  });
});
