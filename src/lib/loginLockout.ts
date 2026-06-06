const FAILED_WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCKOUT_MS = 60 * 1000;
const MAX_LOCKOUT_MS = 30 * 60 * 1000;
const FAILURE_THRESHOLD = 5;

interface FailedLoginState {
  count: number;
  windowStart: number;
  lockUntil: number;
}

const failedLoginStore = new Map<string, FailedLoginState>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedLoginStore) {
    if (value.lockUntil <= now && value.windowStart + FAILED_WINDOW_MS <= now) {
      failedLoginStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getLockoutDurationMs(failureCount: number): number {
  const overThreshold = Math.max(0, failureCount - FAILURE_THRESHOLD);
  return Math.min(BASE_LOCKOUT_MS * 2 ** overThreshold, MAX_LOCKOUT_MS);
}

export function getLoginLockoutMs(key: string): number {
  const state = failedLoginStore.get(key);
  if (!state?.lockUntil) return 0;
  const remaining = state.lockUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function registerFailedLogin(key: string): number {
  const now = Date.now();
  const previous = failedLoginStore.get(key);
  const freshWindow = !previous || now - previous.windowStart > FAILED_WINDOW_MS;
  const count = freshWindow ? 1 : previous.count + 1;
  const windowStart = freshWindow ? now : previous.windowStart;
  const lockoutMs = count >= FAILURE_THRESHOLD ? getLockoutDurationMs(count) : 0;
  const lockUntil = lockoutMs > 0 ? now + lockoutMs : 0;

  failedLoginStore.set(key, { count, windowStart, lockUntil });
  return lockoutMs;
}

export function clearFailedLogin(key: string) {
  failedLoginStore.delete(key);
}
