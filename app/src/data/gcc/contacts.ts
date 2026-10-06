/**
 * Contact facts for the Calendar, Call and Teams links (plan 044). Every
 * address sits on the reserved `.example` top-level domain, so no real mailbox
 * is ever addressed, and there are no phone numbers: calls go through Teams.
 * Addresses are built from each person's current name (`domain/gcc/contact.ts`),
 * so a renamed person gets a new address with no edit here.
 */

/** The company's mail domain, per tenant key. */
export const EMAIL_DOMAIN: Record<string, string> = {
  najd: 'najd-arcline.example',
  corniche: 'corniche-lattice.example',
  dafna: 'dafna-keystone.example',
  batinah: 'batinah-waypoint.example',
  qurain: 'qurain-meridian.example',
  'gen-gulf': 'genesis-gulf.example',
};

/** Catalyst's own operator (tenant `*`). */
export const PLATFORM_DOMAIN = 'catalyst-platform.example';

/** Used when a tenant has no domain above, and for an external contact whose firm can't be read. */
export const FALLBACK_DOMAIN = 'tenant.example';

/** Per-person address overrides, by person id. None yet. */
export const EMAIL_OVERRIDES: Record<string, string> = {};

/** A meeting booked from a contact link: its length and the grid its start sits on. */
export const MEETING = { minutes: 30, stepMinutes: 30 } as const;

/** Office hours outside Ramadan, tenant-local. During Ramadan the country's Ramadan hours apply (`data/gcc/calendar.ts`). */
export const OFFICE_HOURS = { from: '08:00', to: '17:00' } as const;
