import type { KeyPerson } from './types';

/**
 * Key personnel on record per tenant (plan 007a step 2.1), enough to decide the
 * hero's PQ-13 as gcc-demo-data §4.7 expects:
 * - Najd, Dafna and Qurain (through Qurain Meridian Arabia Co.) hold all four roles;
 * - Corniche and Batinah have no Saudi national HSE Manager with 10 years.
 *
 * Names are fictional composites. Najd's Project Manager is committed to a live
 * contract until 30 Apr: plan 010 and CAP-4 use that later; it does not change PQ-13.
 */
export const KEY_PERSONNEL: KeyPerson[] = [
  // Najd
  { id: 'najd-kp-1', tenant: 'najd', name: 'Hassan Al-Zahrani', role: 'project-manager', title: 'Project Manager', years: 24, sectorYears: 14, saudiNational: true,
    availableFrom: '2026-05-01', committedTo: '2026-04-30' },
  { id: 'najd-kp-2', tenant: 'najd', name: 'Dr Samir Nassar', role: 'process-lead', title: 'Process Design Lead', years: 18, sectorYears: 18, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'najd-kp-3', tenant: 'najd', name: 'Fahd Al-Rashid', role: 'hse-manager', title: 'HSE Manager', years: 12, sectorYears: 9, saudiNational: true,
    availableFrom: '2026-03-01' },
  { id: 'najd-kp-4', tenant: 'najd', name: 'Rajesh Iyer', role: 'commissioning-manager', title: 'Commissioning Manager', years: 15, sectorYears: 13, saudiNational: false,
    availableFrom: '2026-04-01' },
  { id: 'najd-kp-5', tenant: 'najd', name: 'Yusuf Al-Harthi', role: 'other', title: 'Deputy Project Manager', years: 16, sectorYears: 11, saudiNational: true,
    availableFrom: '2026-03-01' },

  // Corniche: strong MEP people, but no Saudi national HSE Manager
  { id: 'corniche-kp-1', tenant: 'corniche', name: 'Vikram Nair', role: 'project-manager', title: 'Project Manager', years: 23, sectorYears: 10, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'corniche-kp-2', tenant: 'corniche', name: 'Elena Marsh', role: 'process-lead', title: 'Process Design Lead', years: 15, sectorYears: 8, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'corniche-kp-3', tenant: 'corniche', name: 'Omar Al Kaabi', role: 'hse-manager', title: 'HSE Manager', years: 14, sectorYears: 4, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'corniche-kp-4', tenant: 'corniche', name: 'Luis Ortega', role: 'commissioning-manager', title: 'Commissioning Manager', years: 16, sectorYears: 6, saudiNational: false,
    availableFrom: '2026-03-01' },

  // Dafna: the Riyadh branch employs the HSE Manager
  { id: 'dafna-kp-1', tenant: 'dafna', name: 'Khalil Mansour', role: 'project-manager', title: 'Project Manager', years: 22, sectorYears: 12, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'dafna-kp-2', tenant: 'dafna', name: 'Anand Rao', role: 'process-lead', title: 'Process Design Lead', years: 16, sectorYears: 16, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'dafna-kp-3', tenant: 'dafna', name: 'Turki Al-Subaie', role: 'hse-manager', title: 'HSE Manager, Riyadh branch', years: 11, sectorYears: 7, saudiNational: true,
    availableFrom: '2026-03-01' },
  { id: 'dafna-kp-4', tenant: 'dafna', name: 'Marco Bianchi', role: 'commissioning-manager', title: 'Commissioning Manager', years: 13, sectorYears: 10, saudiNational: false,
    availableFrom: '2026-03-15' },

  // Batinah: a roads contractor, with no water people and no Saudi national HSE Manager
  { id: 'batinah-kp-1', tenant: 'batinah', name: 'Hamid Al-Mashani', role: 'project-manager', title: 'Project Manager', years: 25, sectorYears: 2, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'batinah-kp-2', tenant: 'batinah', name: 'Sunil Varghese', role: 'hse-manager', title: 'HSE Manager', years: 15, sectorYears: 0, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'batinah-kp-3', tenant: 'batinah', name: 'Aziz Al-Wahaibi', role: 'other', title: 'Planning Engineer', years: 18, sectorYears: 0, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'batinah-kp-4', tenant: 'batinah', name: 'Neil Carter', role: 'other', title: 'Bridges Lead', years: 20, sectorYears: 0, saudiNational: false,
    availableFrom: '2026-03-01' },

  // Qurain: every PQ-13 role is held by the KSA subsidiary
  { id: 'qurain-kp-1', tenant: 'qurain', entity: 'qurain-arabia', name: 'Adel Al-Fadhli', role: 'project-manager', title: 'Project Manager', years: 25, sectorYears: 15, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'qurain-kp-2', tenant: 'qurain', entity: 'qurain-arabia', name: 'Ravi Menon', role: 'process-lead', title: 'Process Design Lead', years: 17, sectorYears: 17, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'qurain-kp-3', tenant: 'qurain', entity: 'qurain-arabia', name: 'Ibrahim Al-Shahrani', role: 'hse-manager', title: 'HSE Manager', years: 10, sectorYears: 8, saudiNational: true,
    availableFrom: '2026-03-01' },
  { id: 'qurain-kp-4', tenant: 'qurain', entity: 'qurain-arabia', name: 'Paolo Greco', role: 'commissioning-manager', title: 'Commissioning Manager', years: 14, sectorYears: 12, saudiNational: false,
    availableFrom: '2026-03-01' },
  { id: 'qurain-kp-5', tenant: 'qurain', name: 'Mishari Al-Ajeel', role: 'other', title: 'Group Construction Manager (Kuwait)', years: 21, sectorYears: 9, saudiNational: false,
    availableFrom: '2026-03-01' },
];
