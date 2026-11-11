export type ReminderKind = "t_minus_3" | "due" | "overdue" | "escalation";

export function kindsForDueDate(dueDate: string, today: string): ReminderKind[] {
  const kinds: ReminderKind[] = [];
  const t3 = addDays(today, 3);
  if (dueDate === t3) kinds.push("t_minus_3");
  if (dueDate === today) kinds.push("due");
  if (dueDate < today) {
    kinds.push("overdue");
    const daysLate = Math.floor((Date.parse(today) - Date.parse(dueDate)) / (24 * 3600 * 1000));
    if (daysLate >= 7) kinds.push("escalation");
  }
  return kinds;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
