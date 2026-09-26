import { useTenant } from '@/domain/tenancy';
import { convert, money, moneyPair, rateNote } from '@/domain/money';
import {
  DEMO_TIME, DEMO_TODAY, calendarDaysBetween, countdownText, dateText, dayFlags, isWorkingDay, whenText,
} from '@/domain/calendar';
import { isCcy, type Ccy } from '@/data/gcc/fx';
import type { CountryCode } from '@/data/tenants';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/** Dev check for plan 002: money, FX, calendar and countdown for the active tenant. Deleted with GccPending in plan 006. */

// Inputs from gcc-demo-data §4: hero estimate, submission deadline, site visit and answers-due dates.
const HERO_ESTIMATE = 480e6;
const HERO_SUBMISSION = '2026-05-10';
const FLAG_DAYS = ['2026-03-17', '2026-03-25'];
const COUNTRIES: CountryCode[] = ['SA', 'AE', 'QA', 'OM', 'KW'];

interface Check { name: string; expected: string; got: string }

const has = (iso: string, cc: CountryCode, key: string) => String(dayFlags(iso, cc).some((f) => f.key === key));

const CHECKS: Check[] = [
  { name: "money(480e6, 'SAR')", expected: 'SAR 480.0 M', got: money(480e6, 'SAR') },
  { name: "moneyPair(480e6, 'SAR', 'KWD').text", expected: 'KWD 39.3 M', got: moneyPair(480e6, 'SAR', 'KWD').text },
  { name: "moneyPair(480e6, 'SAR', 'KWD', { dp: 2 }).text", expected: 'KWD 39.30 M', got: moneyPair(480e6, 'SAR', 'KWD', { dp: 2 }).text },
  { name: "money(1.24e9, 'AED')", expected: 'AED 1.24 bn', got: money(1.24e9, 'AED') },
  { name: "money(49.22e6, 'OMR')", expected: 'OMR 49.2 M', got: money(49.22e6, 'OMR') },
  { name: "money(49.22e6, 'OMR', { dp: 2 })", expected: 'OMR 49.22 M', got: money(49.22e6, 'OMR', { dp: 2 }) },
  { name: "money(12064000, 'SAR', { full: true })", expected: 'SAR 12,064,000', got: money(12064000, 'SAR', { full: true }) },
  { name: "money(−4.1e6, 'SAR')", expected: '−SAR 4.1 M', got: money(-4.1e6, 'SAR') },
  { name: "money(785920, 'KWD', { millions: true, dp: 2 })", expected: 'KWD 0.79 M', got: money(785920, 'KWD', { millions: true, dp: 2 }) },
  { name: 'Calendar days, 8 Mar → 10 May', expected: '63', got: String(calendarDaysBetween(DEMO_TODAY, HERO_SUBMISSION)) },
  { name: 'Fri 13 Mar is a working day in SA', expected: 'false', got: String(isWorkingDay('2026-03-13', 'SA')) },
  { name: 'Fri 13 Mar is a working day in AE', expected: 'true', got: String(isWorkingDay('2026-03-13', 'AE')) },
  { name: 'Sat 14 Mar is a working day in AE', expected: 'false', got: String(isWorkingDay('2026-03-14', 'AE')) },
  { name: 'Tue 17 Mar, SA: Ramadan hours', expected: 'true', got: has('2026-03-17', 'SA', 'ramadan-hours') },
  { name: 'Wed 25 Mar, SA: Eid holiday expected', expected: 'true', got: has('2026-03-25', 'SA', 'closure-expected') },
  { name: 'Wed 25 Mar, AE: Eid holiday expected', expected: 'false', got: has('2026-03-25', 'AE', 'closure-expected') },
  { name: "whenText(DEMO_TODAY, DEMO_TIME, 'AST')", expected: 'Sun 8 Mar 2026, 10:00 AST', got: whenText(DEMO_TODAY, DEMO_TIME, 'AST') },
];

export default function FormatsCheck() {
  const t = useTenant();
  const cc = t.countryCode;
  const ccy: Ccy = isCcy(t.currency) ? t.currency : 'USD';
  const pair = moneyPair(HERO_ESTIMATE, 'SAR', ccy);
  const failed = CHECKS.filter((c) => c.got !== c.expected).length;

  return (
    <>
      <CardHead title="Formats: money, calendar and countdown" meta={failed ? `${failed} of ${CHECKS.length} checks failing` : `All ${CHECKS.length} checks pass`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Demo today" v={whenText(DEMO_TODAY, DEMO_TIME, t.tzLabel)} />
        <KV k={`To ${dateText(HERO_SUBMISSION)} (${t.country} calendar)`} v={countdownText(DEMO_TODAY, HERO_SUBMISSION, cc)} />
        {FLAG_DAYS.map((d) => {
          const flags = dayFlags(d, cc);
          return <KV key={d} k={`Flags on ${dateText(d)}`} v={flags.length ? flags.map((f) => f.label).join(', ') : 'None'} tone={flags.length ? 'orange' : 'muted'} />;
        })}
        <KV k="Hero estimate, as stated" v={money(HERO_ESTIMATE, 'SAR')} />
        <KV k={`In ${ccy}`} v={<span title={rateNote('SAR', ccy)}>{pair.original ? `${pair.text} · ${pair.original}` : pair.text}</span>} />
        <KV k={`In ${ccy}, full`} v={money(convert(HERO_ESTIMATE, 'SAR', ccy), ccy, { full: true })} />
        <KV k="Rate" v={ccy === 'SAR' ? 'Not converted: the tenant bids in SAR' : rateNote('SAR', ccy)} />
      </div>

      <DataTable
        rows={COUNTRIES}
        rowKey={(c) => c}
        columns={[
          { key: 'c', header: 'Country calendar', width: '1fr', primary: true, render: (c) => <span className="cell-main">{c}{c === cc ? ', this tenant' : ''}</span> },
          { key: 'n', header: `8 Mar → ${dateText(HERO_SUBMISSION)}`, width: '1.4fr', align: 'right', render: (c) => <span className="num">{countdownText(DEMO_TODAY, HERO_SUBMISSION, c)}</span> },
        ]}
      />

      <DataTable
        rows={CHECKS}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.8fr', primary: true, render: (c) => <span className="cell-main mono" style={{ fontSize: 12.5 }}>{c.name}</span> },
          { key: 'e', header: 'Expected', width: '1fr', priority: 2, render: (c) => c.expected },
          { key: 'g', header: 'Got', width: '1fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
