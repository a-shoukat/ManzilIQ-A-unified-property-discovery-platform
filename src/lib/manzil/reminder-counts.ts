import type { ReminderKind } from "./reminder-rules";

export type ReminderJobCounts = {
  t_minus_3: number;
  due: number;
  overdue: number;
  escalated: number;
};

export function emptyReminderCounts(): ReminderJobCounts {
  return { t_minus_3: 0, due: 0, overdue: 0, escalated: 0 };
}

export function bumpReminderCount(counts: ReminderJobCounts, kind: ReminderKind): void {
  if (kind === "t_minus_3") counts.t_minus_3 += 1;
  else if (kind === "due") counts.due += 1;
  else if (kind === "overdue") counts.overdue += 1;
  else counts.escalated += 1;
}
