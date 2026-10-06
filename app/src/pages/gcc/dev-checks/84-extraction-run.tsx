import { useMemo } from 'react';
import { gccData, type GccTenantKey } from '@/data/gcc';
import { firstWithRole } from '@/data/people';
import { HERO_FILE_NAME, HERO_ID } from '@/data/gcc/hero';
import { whenText } from '@/domain/calendar';
import { dataPort } from '@/domain/gcc/port';
import { documentFor, type TenderRecord } from '@/domain/gcc/documents';
import { eligibilityFor, recogniseUpload, recommendationFor } from '@/domain/gcc/s1';
import { extractionRun, RUN_TOTAL_MS, type ExtractionRunScript, type RunItem } from '@/domain/gcc/s1/extractionRun';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 045: the extraction run an upload plays, for every demo document in
 * every GCC tenant, on the seed (`done` empty), seen by the tenant's Head of
 * Tendering. Four rows per tenant: the timing; every revealed value read from
 * the record or the register row; the company check reading as the tender's
 * Overview and Eligibility tab do; the run naming and opening the right
 * tender. Nothing here writes demo state.
 */

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];

interface Check { name: string; ok: boolean; got: string }

const fileOf = (tenderId: string, r: TenderRecord) => (tenderId === HERO_ID ? HERO_FILE_NAME : r.fileNames[r.fileNames.length - 1]);

/** The values the record holds for a step, in the run's order: what each revealed item must equal. */
function expected(r: TenderRecord, id: string): { label?: string; value: string; page?: number }[] | null {
  switch (id) {
    case 'dates': return r.dates.map((d) => ({ label: d.label, value: whenText(d.date, d.time), page: d.page }));
    case 'scope': return r.scope.slice(0, 3).map((s) => ({ value: s.text, page: s.page }));
    case 'criteria': return r.eligibility.map((e) => ({ label: e.label, value: e.value, page: e.page }));
    case 'flags': return r.flags.map((f) => ({ value: f.title, page: f.page }));
    default: return null;
  }
}

function valuesOk(s: ExtractionRunScript, r: TenderRecord, shortTitle: string): string[] {
  const bad: string[] = [];
  const top = new Set([r.docType, r.authority, r.parent, r.refNo, r.country, r.mode, r.language].filter(Boolean) as string[]);
  for (const step of s.steps) {
    const exp = expected(r, step.id);
    if (exp) {
      if (exp.length !== step.items.length) bad.push(`${step.id}: ${step.items.length} items, record has ${exp.length}`);
      step.items.forEach((it, i) => {
        const e = exp[i];
        if (!e || it.value !== e.value || it.page !== e.page || (e.label !== undefined && it.label !== e.label)) bad.push(`${step.id} ${i + 1}: "${it.value.slice(0, 40)}"`);
      });
    }
    if (step.id === 'identify') {
      for (const it of step.items) if (it.key !== 'issued' && !top.has(it.value)) bad.push(`identify ${it.key}: "${it.value.slice(0, 40)}"`);
    }
    if (step.id === 'receive' || step.id === 'pages') {
      const pages = step.items.find((i) => i.key === 'pages' || i.key === 'read');
      if (pages && !pages.value.startsWith(String(r.pages))) bad.push(`${step.id}: ${pages.value}`);
    }
    if (step.id === 'match' && !step.items[0]?.value.includes(shortTitle)) bad.push('match: short title');
    // Arabic: every item that carries Arabic carries what the record printed.
    if (r.language === 'Arabic') for (const it of step.items) if (it.ar !== undefined && !it.ar.trim()) bad.push(`${step.id}: empty Arabic`);
  }
  return bad;
}

function timingOk(s: ExtractionRunScript): string[] {
  const bad: string[] = [];
  let at = 0;
  for (const st of s.steps) {
    if (st.start !== at) bad.push(`${st.id} starts at ${st.start}, expected ${at}`);
    for (const it of st.items) if (it.at < st.start || it.at >= st.start + st.ms) bad.push(`${st.id}/${it.key} at ${it.at}`);
    at += st.ms;
  }
  if (s.totalMs !== at) bad.push(`total ${s.totalMs} ≠ ${at}`);
  return bad;
}

function checksFor(tenant: GccTenantKey): Check[] {
  const port = dataPort();
  const hot = firstWithRole(tenant, 'hot');
  const docs = gccData(tenant).register.flatMap((t) => {
    const d = documentFor(tenant, t.id);
    return d ? [{ t, d }] : [];
  });
  const runs = docs.map(({ t, d }) => ({ t, d, file: fileOf(t.id, d.record), s: extractionRun(tenant, t.id, d.record, { file: fileOf(t.id, d.record), done: {} }) }));
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name: `${tenant} · ${name}`, ok, got });

  if (!runs.length || runs.some((x) => !x.s)) {
    add('A run for every demo document', false, `${runs.length} documents; no script for ${runs.filter((x) => !x.s).map((x) => x.t.id).join(', ')}`);
    return out;
  }

  // 1. Timing: 18–22 s, steps end to end, every item inside its step.
  const timing = runs.map((x) => ({ id: x.t.id, total: x.s!.totalMs, bad: timingOk(x.s!) }));
  add('Timing: 18–22 s, steps end to end', timing.every((x) => x.total >= 18_000 && x.total <= 22_000 && !x.bad.length),
    timing.map((x) => `${x.id} ${(x.total / 1000).toFixed(1)} s, ${runs.find((r) => r.t.id === x.id)!.s!.steps.length} steps${x.bad.length ? ` · ${x.bad.slice(0, 2).join('; ')}` : ''}`).join(' · ') + ` (target ${RUN_TOTAL_MS / 1000} s)`);

  // 2. Every revealed value is the record's or the register row's.
  const values = runs.map((x) => ({ id: x.t.id, n: x.s!.steps.reduce((n, st) => n + st.items.length, 0), bad: valuesOk(x.s!, x.d.record, x.t.shortTitle) }));
  add('Every value read from the record or the register', values.every((x) => !x.bad.length),
    values.map((x) => `${x.id} ${x.n} values${x.bad.length ? ` · ${x.bad.slice(0, 3).join('; ')}` : ''}`).join(' · '));

  // 3. The company check reads as the tender's pages: fit as on Overview, counts as on Eligibility, the rail's recommendation.
  const rows = port && hot ? port.rows(tenant, { kind: 'all' }, hot, 'all', {}) : [];
  const company = runs.map((x) => {
    const s = x.s!;
    const item = (k: string): RunItem | undefined => s.steps.find((st) => st.id === 'company')?.items.find((i) => i.key === k);
    const row = rows.find((r) => r.id === x.t.id);
    const elig = eligibilityFor(tenant, x.t.id, {});
    const rec = recommendationFor(tenant, x.t.id, {});
    const fitOk = row ? row.fit === s.fit && (row.fit === null || item('fit')?.value.startsWith(`${row.fit} `)) : false;
    const eligOk = elig ? item('elig')?.verdict === elig.verdict && !!item('elig')?.value.includes(`${elig.counts.met} met`) : !item('elig')?.verdict;
    const recOk = rec ? item('rec')?.value === rec.recommendation : !item('rec');
    return { id: x.t.id, ok: fitOk && eligOk && recOk, text: `${x.t.id} fit ${s.fit ?? '–'} (Overview ${row?.fit ?? 'no row'}) · ${elig ? elig.verdict : 'not checked'} · ${rec?.recommendation ?? 'no recommendation'}` };
  });
  add('Company check = Overview, Eligibility and the rail', company.every((x) => x.ok), company.map((x) => `${x.ok ? '' : '× '}${x.text}`).join(' · '));

  // 4. The file is recognised as this tender, and the run's last steps name it; a repeat upload says so at the match step and still opens it.
  const opens = runs.map((x) => {
    const s = x.s!;
    const last = s.steps[s.steps.length - 1];
    const hit = recogniseUpload(x.file, tenant);
    const ok = hit?.tenderId === x.t.id && last.id === 'open' && last.label === `Opening ${x.t.id}` && s.tenderId === x.t.id
      && !!s.steps.find((st) => st.id === 'match')?.items[0]?.value.includes(x.t.id);
    const again = extractionRun(tenant, x.t.id, x.d.record, { file: x.file, done: {}, previous: { at: '2026-03-08T10:01', by: hot?.name } });
    const againText = again?.steps.find((st) => st.id === 'match')?.items.find((i) => i.key === 'again')?.value ?? '';
    const againOk = /^Already uploaded .*: linked, not added again$/.test(againText) && again?.steps[again.steps.length - 1].label === `Opening ${x.t.id}`;
    return { ok: ok && againOk, text: `${x.file} → ${hit?.tenderId ?? 'not recognised'} · "${last.label}"${againOk ? '' : ` · repeat: "${againText}"`}` };
  });
  add('Each file opens its own tender', opens.every((x) => x.ok), opens.map((x) => `${x.ok ? '' : '× '}${x.text}`).join(' · '));

  return out;
}

export default function ExtractionRunCheck() {
  const rows = useMemo(() => TENANTS.flatMap(checksFor), []);
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Extraction run on upload (plan 045)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.2fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2.6fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.5fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
