import type { Profile, Property } from './types';
/** Super admin, or the account that created the listing, may edit/delete it. */
export function canManageListing(p: Pick<Property, 'owner_id' | 'id'>, profile: Pick<Profile, 'id' | 'role'> | null | undefined): boolean {
  if (!profile || p.id.startsWith('demo-')) return false;
  return profile.role === 'super_admin' || (!!p.owner_id && p.owner_id === profile.id);
}
/** Reserved or sold listings have an active deal and cannot be deleted. */
export function canDeleteListing(p: Pick<Property, 'status'>): boolean {
  return p.status === 'available';
}
