import { describe, expect, it } from "vitest";
import { addDays, kindsForDueDate } from "@/lib/manzil/reminder-rules";

describe("reminder rules", () => {
  it("t-3", () => {
    expect(kindsForDueDate("2026-11-14", "2026-11-11")).toEqual(["t_minus_3"]);
  });
  it("due today", () => {
    expect(kindsForDueDate("2026-11-11", "2026-11-11")).toEqual(["due"]);
  });
  it("overdue without escalation", () => {
    expect(kindsForDueDate("2026-11-10", "2026-11-11")).toEqual(["overdue"]);
  });
  it("escalation at 7+ days", () => {
    expect(kindsForDueDate("2026-11-01", "2026-11-11")).toEqual(["overdue", "escalation"]);
  });
  it("addDays", () => {
    expect(addDays("2026-11-11", 3)).toBe("2026-11-14");
  });
});
