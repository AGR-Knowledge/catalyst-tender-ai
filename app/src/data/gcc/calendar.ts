import type { CountryCode } from '@/data/tenants';

/**
 * Working calendar per country (gcc-demo-data §1). Moon-sighting dates carry
 * `expected: true` until they are confirmed, and the UI always says "expected".
 * Weekdays: 0 = Sunday … 6 = Saturday.
 */

export interface Closure { from: string; to: string; name: string; expected: boolean }

export interface RamadanHours { from: string; to: string; hours: string; expected: boolean }

export interface CountryCalendar {
  weekend: number[];
  closures: Closure[];
  ramadan?: RamadanHours;
}

const RAMADAN = { from: '2026-02-18', to: '2026-03-19', expected: true };

const EID_AL_ADHA: Closure = { from: '2026-05-26', to: '2026-05-30', name: 'Eid al-Adha', expected: true };
const EID_AL_FITR_GULF: Closure = { from: '2026-03-20', to: '2026-03-23', name: 'Eid al-Fitr', expected: true };

export const CALENDARS: Record<CountryCode, CountryCalendar> = {
  SA: {
    weekend: [5, 6],
    closures: [
      { from: '2026-02-22', to: '2026-02-22', name: 'Founding Day', expected: false },
      { from: '2026-03-19', to: '2026-03-28', name: 'Eid al-Fitr', expected: true },
      EID_AL_ADHA,
    ],
    ramadan: { ...RAMADAN, hours: '10:00–15:00' },
  },
  // The federal government also works a half day on Friday; it is not modelled.
  AE: { weekend: [6, 0], closures: [EID_AL_FITR_GULF, EID_AL_ADHA], ramadan: { ...RAMADAN, hours: '09:00–14:00' } },
  QA: { weekend: [5, 6], closures: [EID_AL_FITR_GULF, EID_AL_ADHA], ramadan: { ...RAMADAN, hours: '09:00–14:00' } },
  OM: { weekend: [5, 6], closures: [EID_AL_FITR_GULF, EID_AL_ADHA], ramadan: { ...RAMADAN, hours: '09:00–14:00' } },
  KW: { weekend: [5, 6], closures: [EID_AL_FITR_GULF, EID_AL_ADHA], ramadan: { ...RAMADAN, hours: '09:00–14:00' } },
  IN: { weekend: [0], closures: [] },
};
