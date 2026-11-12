import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/manzil/dealer";

describe("dealer discover timeout helper", () => {
  it("resolves when the promise finishes in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 500, "Discover")).resolves.toBe(42);
  });

  it("rejects when the promise exceeds the timeout", async () => {
    vi.useFakeTimers();
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 5_000);
    });
    const pending = withTimeout(slow, 100, "Discover");
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(150);
    await assertion;
    vi.useRealTimers();
  });
});
