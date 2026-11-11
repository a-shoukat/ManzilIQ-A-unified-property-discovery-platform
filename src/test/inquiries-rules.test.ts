import { describe, expect, it } from "vitest";

/** Status machine allowed transitions for inquiry CRM (backend contract). */
const ALLOWED: Record<string, string[]> = {
  new: ["contacted", "qualified", "closed"],
  contacted: ["qualified", "converted", "closed"],
  qualified: ["converted", "closed"],
  converted: ["closed"],
  closed: [],
};

function canTransition(from: string, to: string): boolean {
  return (ALLOWED[from] ?? []).includes(to);
}

describe("inquiry status machine", () => {
  it("new → contacted", () => expect(canTransition("new", "contacted")).toBe(true));
  it("new → converted blocked", () => expect(canTransition("new", "converted")).toBe(false));
  it("qualified → converted", () => expect(canTransition("qualified", "converted")).toBe(true));
  it("closed is terminal", () => expect(canTransition("closed", "new")).toBe(false));
});
