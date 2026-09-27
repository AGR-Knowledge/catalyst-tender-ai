import { useMemo } from 'react';
import { gccData } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { documentFor, isArabicRecord } from '@/domain/gcc/documents';
import { keyDatesFor, pipelineFor } from '@/domain/gcc/s1';
import { arabicOf, bilingualSnippet, dateArabicOf, fieldsOf, ocrOf, prevailsOf, prevailsTitle, readingOf } from '@/domain/gcc/arabic';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 012, Arabic intake: the Arabic sources `BilingualValue`
 * renders, "Arabic text prevails", the OCR pages, the intake's OCR step and
 * "Read in English", on T-2026-042 (Batinah, Arabic, 3 scanned pages) and
 * T-2026-071 (Qurain, Arabic with an English specification), with the
 * English tenders as the control. It reads fixed tenants, so the rows read
 * the same whichever tenant is open. Values are typed only in `EXPECT`.
 */

const T042 = { tenant: 'batinah', id: 'T-2026-042' };
const T071 = { tenant: 'qurain', id: 'T-2026-071' };
const T128 = { tenant: 'najd', id: 'T-2026-128' };
const T061 = { tenant: 'corniche', id: 'T-2026-061' };
const EASTERN_DIGITS = /[٠-٩]/;

const EXPECT: Record<string, string> = {
  'T-2026-042: every field, clause, scope line, date and flag has its Arabic': '63 fields · 15 clauses · 11 scope · 8 dates · 6 flags · all with Arabic',
  'T-2026-042: the language clause prevails': 'Arabic text prevails (§7, p. 5) · with its Arabic',
  'T-2026-071: no clause says which language prevails': 'No clause says which language prevails · p. 38',
  'English tenders: the hero raises it, T-2026-061 does not': 'T-2026-118: Arabic text prevails (§27, p. 9) · T-2026-061: none',
  'OCR on T-2026-042: pages, fields and reasons': '15, 16, 17 · 7 fields · Table read from a skewed scan, Stamp over text, Scanned page read by OCR',
  'Intake: T-2026-042 names the OCR pages': 'done · pp. 15–17 read: scanned and stamped',
  'Intake: no OCR for T-2026-071; T-2026-128 keeps it': 'T-2026-071: skipped · T-2026-128: done, Scanned pages read',
  'Read in English, T-2026-042: every section, none empty': 'Headline facts 7 · Scope of work 11 · Eligibility and prequalification 9 · Dates 8 · Evaluation 3 · Submission 9 · Clauses 15',
  'Read in English, T-2026-071: every section, none empty': 'Headline facts 13 · Scope of work 18 · Eligibility and prequalification 14 · Dates 1 · Evaluation 7 · Submission 10 · Clauses 23',
  'T-2026-071: the English specification (pp. 38–61) carries no Arabic line': '16 items on pp. 38–61 · 0 with Arabic',
  'Snippets and key dates of T-2026-042 carry the Arabic': 'VAL-042-1: p. 5 Arabic · p. 17 Arabic, Eastern digits · key dates 9 of 9',
  'English records: no reading and no Arabic snippet': 'T-2026-118: no reading, no snippet · T-2026-061: no reading, no snippet',
};

function compute(): Record<string, string> {
  const got: Record<string, string> = {};
  const r042 = documentFor(T042.tenant, T042.id)?.record ?? null;
  const r071 = documentFor(T071.tenant, T071.id)?.record ?? null;
  const hero = documentFor('najd', HERO_ID)?.record ?? null;
  const r061 = documentFor(T061.tenant, T061.id)?.record ?? null;
  if (!r042 || !r071 || !hero || !r061) return { [Object.keys(EXPECT)[0]]: 'A document is missing' };

  // 1. What BilingualValue renders on T-2026-042: an Arabic line for every item.
  const lists = { fields: fieldsOf(r042), clauses: r042.clauses, scope: r042.scope, dates: r042.dates, flags: r042.flags };
  const all = Object.values(lists).flat() as object[];
  got['T-2026-042: every field, clause, scope line, date and flag has its Arabic'] = `${Object.entries(lists).map(([k, xs]) => `${xs.length} ${k}`).join(' · ')} · ${all.every((x) => arabicOf(x)) ? 'all with Arabic' : `${all.filter((x) => !arabicOf(x)).length} without Arabic`}`;

  // 2–4. "Arabic text prevails".
  const p042 = prevailsOf(r042);
  got['T-2026-042: the language clause prevails'] = p042 ? `${prevailsTitle(p042)} · ${p042.ar ? 'with its Arabic' : 'no Arabic'}` : 'none';
  const p071 = prevailsOf(r071);
  got['T-2026-071: no clause says which language prevails'] = p071 ? `${prevailsTitle(p071)} · p. ${p071.page ?? '–'}` : 'none';
  const pHero = prevailsOf(hero);
  const p061 = prevailsOf(r061);
  got['English tenders: the hero raises it, T-2026-061 does not'] = `${HERO_ID}: ${pHero ? prevailsTitle(pHero) : 'none'} · ${T061.id}: ${p061 ? prevailsTitle(p061) : 'none'}`;

  // 5. OCR.
  const ocr = ocrOf(r042);
  got['OCR on T-2026-042: pages, fields and reasons'] = `${ocr.pages.join(', ')} · ${ocr.fields} fields · ${ocr.reasons.join(', ')}`;

  // 6–7. The intake's OCR step comes from the record; a scanned letter with no record keeps it.
  const ocrStep = (t: { tenant: string; id: string }) => {
    const ev = gccData(t.tenant).intakeToday.find((e) => e.tenderId === t.id && e.disposition !== 'addendum');
    return ev ? pipelineFor(t.tenant, ev.id)?.steps.find((s) => s.key === 'ocr') : undefined;
  };
  const s042 = ocrStep(T042);
  got['Intake: T-2026-042 names the OCR pages'] = s042 ? `${s042.state} · ${s042.detail ?? ''}` : 'no step';
  const s071 = ocrStep(T071);
  const s128 = ocrStep(T128);
  got['Intake: no OCR for T-2026-071; T-2026-128 keeps it'] = `${T071.id}: ${s071?.state ?? 'no step'} · ${T128.id}: ${s128 ? `${s128.state}, ${s128.detail ?? ''}` : 'no step'}`;

  // 8–9. Read in English.
  const sections = (x: typeof r042) => readingOf(x)?.sections.map((s) => `${s.title} ${s.items.length}`).join(' · ') ?? 'no reading';
  got['Read in English, T-2026-042: every section, none empty'] = sections(r042);
  got['Read in English, T-2026-071: every section, none empty'] = sections(r071);

  // 10. The Kuwaiti tender's English specification shows no Arabic line.
  const spec = isArabicRecord(r071) ? [...fieldsOf(r071), ...r071.clauses, ...r071.scope, ...r071.flags].filter((x) => x.page >= 38) : [];
  got['T-2026-071: the English specification (pp. 38–61) carries no Arabic line'] = `${spec.length} items on pp. 38–61 · ${spec.filter((x) => arabicOf(x)).length} with Arabic`;

  // 11. The intake queue's snippets and the key dates.
  const val = gccData(T042.tenant).register.find((t) => t.id === T042.id)?.validations.find((v) => v.id === 'VAL-042-1');
  const a = val ? bilingualSnippet(r042, val.page, val.value) : null;
  const b = val?.alt ? bilingualSnippet(r042, val.alt.page, val.alt.value) : null;
  const kd = keyDatesFor(T042.tenant, T042.id);
  got['Snippets and key dates of T-2026-042 carry the Arabic'] = val
    ? `${val.id}: p. ${val.page} ${a?.ar ? 'Arabic' : 'no Arabic'} · p. ${val.alt?.page} ${b?.ar ? `Arabic${EASTERN_DIGITS.test(b.ar) ? ', Eastern digits' : ''}` : 'no Arabic'} · key dates ${kd.filter((k) => dateArabicOf(r042, k)).length} of ${kd.length}`
    : 'no VAL-042-1';

  // 12. English records have no reading and no Arabic snippet.
  const plain = (id: string, x: typeof r042) => {
    const v = 'conflicts' in x ? (x as { conflicts: { page: number; value: string }[] }).conflicts[0] : undefined;
    return `${id}: ${readingOf(x) ? 'a reading' : 'no reading'}, ${v && bilingualSnippet(x, v.page, v.value) ? 'a snippet' : 'no snippet'}`;
  };
  got['English records: no reading and no Arabic snippet'] = `${plain(HERO_ID, hero)} · ${plain(T061.id, r061)}`;
  return got;
}

export default function ArabicCheck() {
  const got = useMemo(compute, []);
  const rows = Object.entries(EXPECT).map(([name, expected]) => ({ name, expected, got: got[name] ?? 'missing' }));
  const failed = rows.filter((r) => r.got !== r.expected).length;
  return (
    <>
      <CardHead title="Arabic intake (plan 012)" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (r) => <span className="cell-main">{r.name}</span> },
          { key: 'e', header: 'Expected', width: '1.4fr', priority: 2, render: (r) => r.expected },
          { key: 'g', header: 'Got', width: '1.4fr', render: (r) => r.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (r) => (r.got === r.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
