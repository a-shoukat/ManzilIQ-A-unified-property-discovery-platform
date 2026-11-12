import type { PaidRole } from "./plans";

export const SOCIETY_PROFILE_REQUIRED =
  "Society profile not submitted; grant not possible";

/**
 * Live `subscriptions.society_id` is NOT NULL UNIQUE on older shapes.
 * Society grants must send an explicit society profile id (usually the society_admin user id).
 * Non-society roles leave society_id null (migration 14 drops NOT NULL when needed).
 */
export function resolveGrantSocietyId(input: {
  role: string;
  userId: string;
  /** Admin-selected society profile id, when provided. */
  explicitSocietyId?: string | null;
  /** True when society_details exists for the target society profile. */
  hasSocietyProfile: boolean;
}): string | null {
  const { role, userId, explicitSocietyId, hasSocietyProfile } = input;
  if (role !== "society_admin") {
    return explicitSocietyId ?? null;
  }
  const societyId = explicitSocietyId || userId;
  if (!hasSocietyProfile) {
    throw new Error(SOCIETY_PROFILE_REQUIRED);
  }
  return societyId;
}

/** Admin grant UI: only society_admin rows that already submitted society_details. */
export function societyAdminsWithProfile<T extends { id: string; role: string }>(
  users: T[],
  societyProfileIds: Iterable<string>,
): T[] {
  const ok = new Set(societyProfileIds);
  return users.filter((u) => u.role !== "society_admin" || ok.has(u.id));
}

export function isPaidRole(role: string): role is PaidRole {
  return role === "buyer" || role === "dealer" || role === "society_admin";
}

export type SubscriptionUpsertRow = {
  user_id: string;
  role: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  society_id: string | null;
};
