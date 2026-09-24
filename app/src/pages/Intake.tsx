import { createContext, lazy, Suspense, useContext, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, UploadCloud } from 'lucide-react';
import type { ExtractField } from '@/data/extracted/types';
import { TODAY_ISO } from '@/data/tenders';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { cr, dayMonth, longDate, plural } from '@/domain/format';
import {
  bidDue, confirmKey, docFor, doubtful, fieldCount, matchFile, nextTenderId, progressOf, screeningFor, sourceUrl, termsFor, useNow, valueCrOf, USD_INR,
} from '@/domain/intake';
import { Card, CardFoot, CardHead, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { StepList, UploadRow } from '@/components/intake/UploadProgress';
import { compatFor, type Compat } from '@/domain/compat';
import { PURSUE_AT, REVIEW_AT } from '@/data/compat';

const stamp = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const PdfViewer = lazy(() => import('@/components/intake/PdfViewer'));

interface ViewAt { page: number; terms: string[]; label?: string }
const ViewerCtx = createContext<(v: ViewAt) => void>(() => {});

/** Page reference. Opens the source PDF in the in-app viewer at that page, marking the value. */
function Pg({ page, terms = [], label }: { page: number; terms?: string[]; label?: string }) {
  const open = useContext(ViewerCtx);
  return <button type="button" className="pg" onClick={() => open({ page, terms, label })} title={`Check against page ${page} of the source`}>p. {page}</button>;
}

/* ───────── List of uploaded documents ───────── */

export function IntakeList() {
  const { state, openModal } = useDemo();
  const navigate = useNavigate();
  const now = useNow(state.uploads.some((u) => progressOf(u, Date.now(), state.uploads).phase === 'processing'), 500);
  const rows = [...state.uploads].reverse();

  return (
    <div className="view">
      <Card>
        <CardHead title="Uploaded documents" meta={rows.length ? plural(rows.length, 'document') : 'none yet'}>
          <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'upload' })}><UploadCloud size={15} aria-hidden /> Upload tender</button>
        </CardHead>
        {rows.length === 0 ? (
          <div className="up-empty">
            <UploadCloud size={28} strokeWidth={1.4} aria-hidden />
            <b>Nothing uploaded yet</b>
            <span>Upload an NIT, RFP or ToR and the extracted fields appear here for review before the tender joins the register.</span>
            <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'upload' })}>Upload tender</button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            rowKey={(u) => u.id}
            onRowClick={(u) => navigate(`/intake/${u.id}`)}
            rowLabel={(u) => `Open ${u.file}`}
            columns={[
              { key: 'f', header: 'Document', width: '1.8fr', primary: true, render: (u) => { const d = matchFile(u.file); return (<><span className="cell-main ellipsis">{d?.shortName ?? u.file}</span><span className="cell-sub">{u.file}{d ? `, ${d.docType}` : ''}</span></>); } },
              { key: 's', header: 'Status', width: '1.2fr', render: (u) => { const p = progressOf(u, now, state.uploads); return p.phase === 'processing' ? <span className="t-cyan">{p.steps[p.at]?.label} {Math.round(p.pct * 100)}%</span> : p.phase === 'ready' ? (u.tenderId ? <span className="t-green">Added as {u.tenderId}</span> : <span className="t-orange">Ready to review</span>) : p.phase === 'duplicate' ? <span className="t-ink3">Duplicate</span> : <span className="t-ink3">Not recognised</span>; } },
              { key: 'b', header: 'Uploaded', width: '1fr', align: 'right', priority: 2, render: (u) => <span className="t-ink3">{u.by}, {stamp(u.startedAt)}</span> },
            ]}
          />
        )}
        <CardFoot>Extracted values stay with their page reference, so every field can be checked against the source.</CardFoot>
      </Card>
    </div>
  );
}

/* ───────── Compatibility: pursue or not, with the reasoning ───────── */

function CompatCard({ c, passed, dated }: { c: Compat; passed: boolean; dated: boolean }) {
  const strong = c.strengths.map((x) => x.toLowerCase());
  const weak = c.concerns.map((x) => x.toLowerCase());
  const join = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
  const summary = [
    c.verdict === 'pursue' ? 'The agent recommends pursuing this tender.' : c.verdict === 'review' ? 'The agent recommends pursuing only if the concerns below can be resolved.' : 'The agent recommends not pursuing this tender.',
    strong.length ? `It scores well on ${join(strong)}.` : '',
    weak.length ? `It is held back by ${join(weak)}.` : '',
    passed ? (dated ? 'The bid date has passed, so this applies to a re-issue.' : 'No submission date is given, so ask the client for one first.') : '',
  ].filter(Boolean).join(' ');
  return (
    <Card className="cp" style={{ marginTop: 'var(--gap)' }}>
      <CardHead title="Compatibility" meta="Win-Probability & Recommendation Agent, against the bid office profile" />
      <div className="cp-grid">
        <div className="cp-sum">
          <div className="cp-score"><b className={tc(c.tone)}>{c.score}</b><span>/100</span></div>
          <div className={`cp-verdict ${tc(c.tone)}`}>{c.label}</div>
          <div className="cp-scale" aria-hidden>
            <i className="r" style={{ width: `${REVIEW_AT}%` }} /><i className="o" style={{ width: `${PURSUE_AT - REVIEW_AT}%` }} /><i className="g" style={{ width: `${100 - PURSUE_AT}%` }} />
            <b style={{ left: `${c.score}%` }} />
          </div>
          <div className="cp-scale-l"><span style={{ left: 0 }}>Do not pursue</span><span style={{ left: `${REVIEW_AT}%` }}>{REVIEW_AT}</span><span style={{ left: `${PURSUE_AT}%` }}>{PURSUE_AT}</span><span style={{ right: 0 }}>Pursue</span></div>
          <p className="cp-why">{summary}</p>
          <div className="cp-sharpen">
            <span>What would change this</span>
            <ul>{c.sharpen.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
        <div className="cp-rows">
          {c.rows.map((r) => (
            <div className="cp-row" key={r.key}>
              <div className="cp-row-h">
                <span className="l">{r.label}</span>
                <span className="w">weight {r.weight}</span>
                <span className="p num">{r.points.toFixed(1)}</span>
              </div>
              <span className="ptrack cp-bar"><span className="f" style={{ width: `${r.score}%`, background: `var(--${r.score >= 70 ? 'green' : r.score >= 45 ? 'orange' : 'red'})` }} /></span>
              <div className="cp-row-r">{r.reason}. {r.page && <Pg page={r.page} terms={termsFor(r.reason)} label={r.label} />}</div>
            </div>
          ))}
          <div className="cp-total"><span>Weighted total</span><b className={`num ${tc(c.tone)}`}>{c.score}</b></div>
        </div>
      </div>
    </Card>
  );
}

/* ───────── Review of one extraction ───────── */

function FieldRows({ fields, offset, confirmFor }: { fields: ExtractField[]; offset: number; confirmFor?: (idx: number) => ReactNode }) {
  return (
    <div className="xf">
      {fields.map((f, i) => (
        <div className={`xf-row c-${f.confidence}`} key={`${f.label}${i}`}>
          <span className="xf-k">{f.label}</span>
          <span className="xf-v">
            {f.value}
            {f.note && <small>{f.note}</small>}
            {f.confidence !== 'high' && confirmFor?.(offset + i)}
          </span>
          <span className="xf-m">
            {f.confidence !== 'high' && <span className={`xf-c ${f.confidence}`}>{f.confidence === 'low' ? 'Low confidence' : 'Check'}</span>}
            <Pg page={f.page} terms={termsFor(f.value)} label={f.label} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function IntakeReview() {
  const { id } = useParams();
  const { state, registerUpload, removeUpload, mark, is, toast, openDrawer } = useDemo();
  const navigate = useNavigate();
  const live = useLive();
  const u = state.uploads.find((x) => x.id === id);
  const now = useNow(!!u && progressOf(u, Date.now(), state.uploads).phase === 'processing');
  const [viewAt, setViewAt] = useState<ViewAt | null>(null);

  if (!u) {
    return (
      <div className="view">
        <Card><div className="up-empty"><b>This upload is no longer here</b><span>It may have been removed, or the demo was reset.</span><Link className="btn" to="/intake">Back to uploaded documents</Link></div></Card>
      </div>
    );
  }

  const p = progressOf(u, now, state.uploads);
  const d = docFor(u);

  if (p.phase !== 'ready' || !d) {
    const earlier = p.phase === 'duplicate' ? state.uploads.find((o) => o.id !== u.id && matchFile(o.file)?.key === d?.key && o.startedAt < u.startedAt) : undefined;
    return (
      <div className="view">
        <Card>
          <CardHead title={u.file} meta={p.phase === 'processing' ? 'extracting' : p.phase === 'duplicate' ? 'duplicate' : 'not recognised'} />
          <UploadRow u={u} p={p} />
          {p.phase === 'processing' && <div className="card-body"><StepList p={p} /></div>}
          {p.phase === 'unmatched' && <div className="card-body t-ink3" style={{ fontSize: 13 }}>This file isn't part of the demo set, so nothing was extracted. In production the Intake Agent would read it like any other tender; here it is queued for the Tender Coordinator.</div>}
          <CardFoot>
            {earlier ? <button type="button" className="btn-link" onClick={() => navigate(`/intake/${earlier.id}`)}>Open the earlier upload of this document →</button>
              : p.phase === 'processing' ? 'You can leave this page. Extraction carries on and a notice appears when it finishes.'
              : <button type="button" className="btn-link" onClick={() => { removeUpload(u.id); navigate('/intake'); }}>Remove this upload</button>}
          </CardFoot>
        </Card>
      </div>
    );
  }

  const due = bidDue(d);
  const sc = screeningFor(d);
  const cp = compatFor(d);
  const { value, converted } = valueCrOf(d);
  const doubts = doubtful(d);
  const open = doubts.filter((f) => !is(confirmKey(u.id, f.idx)));
  const period = [/completion|construction period/i, /total time|programme/i, /period|duration/i].map((r) => d.summary.find((f) => r.test(f.label))).find(Boolean);
  const registered = u.tenderId ? live.byId(u.tenderId) : undefined;
  const nextId = nextTenderId(state.uploads);
  const passed = !due || due.date < TODAY_ISO;

  const confirmFor = (idx: number) => {
    const k = confirmKey(u.id, idx);
    if (!doubts.some((f) => f.idx === idx)) return null;
    return is(k)
      ? <span className="xf-ok">Checked against the source</span>
      : <button type="button" className="btn btn-sm" onClick={() => mark(k, 'Field confirmed against the source page', 'green')}>Confirm</button>;
  };
  const off = { summary: 0, eligibility: d.summary.length, evaluation: d.summary.length + d.eligibility.length, submission: d.summary.length + d.eligibility.length + d.evaluation.length };

  const add = () => {
    registerUpload(u.id, nextId);
    toast(`${nextId} added to the register at Stage 1${passed ? ', held for review' : ''}`);
  };

  return (
    <ViewerCtx.Provider value={setViewAt}>
    <div className="view">
      <Card className="xr-head">
        <div className="xr-top">
          <span className="xr-type">{d.docType}</span>
          <span className="xr-file">{u.file}, {d.pages} pages</span>
          <button type="button" className="btn btn-sm xr-prev" onClick={() => setViewAt({ page: 1, terms: [] })}><Eye size={14} aria-hidden /> Preview PDF</button>
          <span className="xr-by">Uploaded by {u.by}, {stamp(u.startedAt)}</span>
        </div>
        <h2 className="xr-title">{d.title}</h2>
        <div className="xr-sub">
          {[d.authority, d.parent, d.location, d.refNo && `Ref ${d.refNo}`, d.issued && `issued ${longDate(d.issued)}`].filter(Boolean).join(', ')}
        </div>
        <div className="figs">
          <div className="fig"><div className="k">Estimated value</div><div className="v">{d.valueDisplay ?? 'Not stated'}</div>{converted && <div className="s">about {cr(value)} at ₹ {USD_INR} per US$</div>}</div>
          <div className="fig"><div className="k">Bid due</div><div className={`v ${passed ? 't-red' : ''}`}>{due ? `${dayMonth(due.date)} ${due.date.slice(0, 4)}` : 'Not given'}</div><div className="s">{due ? `${due.time ? `${due.time}, ` : ''}${passed ? 'already passed' : 'open'}` : 'no date printed'}</div></div>
          <div className="fig"><div className="k">{period?.label ?? 'Period'}</div><div className="v sm">{period?.value ?? 'Not stated'}</div></div>
          <div className="fig"><div className="k">Extracted</div><div className="v">{fieldCount(d)}</div><div className="s">fields from {d.pages} pages</div></div>
          <div className="fig"><div className="k">To check</div><div className={`v ${open.length ? 't-orange' : 't-green'}`}>{open.length}</div><div className="s">{open.length ? 'below high confidence' : 'all confirmed'}</div></div>
        </div>
        <div className="xr-screen">
          <span className="xr-fit"><b className={tc(cp?.tone ?? 'ink')}>{sc.fit}</b>/100</span>
          <span className="xr-reason">{cp ? <><b className={tc(cp.tone)}>{cp.label}.</b> </> : null}{passed ? (due ? `The bid date has passed, so it joins the register held for review.` : 'No submission date is printed, so it joins the register held for review.') : 'It joins the register at Stage 1 with DG1 open.'}</span>
          <span className="xr-acts">
            {registered ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => openDrawer({ type: 'tender', id: registered.id })}>Open {registered.id}</button>
                <button type="button" className="btn" onClick={() => navigate('/pipeline')}>View in pipeline</button>
              </>
            ) : (
              <>
                <button type="button" className={`btn ${cp?.verdict === 'decline' ? '' : 'btn-primary'}`} onClick={add}>{cp?.verdict === 'decline' ? 'Add to register anyway' : `Add to register as ${nextId}`}</button>
                <button type="button" className={`btn ${cp?.verdict === 'decline' ? 'btn-primary' : ''}`} onClick={() => { removeUpload(u.id); navigate('/intake'); toast(`${u.file} not pursued. Reason recorded: ${cp?.concerns[0]?.toLowerCase() ?? 'screening'}`, 'ink3'); }}>{cp?.verdict === 'decline' ? 'Do not pursue' : 'Discard'}</button>
              </>
            )}
          </span>
        </div>
      </Card>

      {cp && <CompatCard c={cp} passed={passed} dated={!!due} />}

      <div className="split" style={{ '--cols': '1.55fr 1fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <div className="stack-gap">
          <Card>
            <CardHead title="Key facts" meta={plural(d.summary.length, 'field')} />
            <FieldRows fields={d.summary} offset={off.summary} confirmFor={confirmFor} />
          </Card>
          {d.scope.length > 0 && (
            <Card>
              <CardHead title="Scope of work" meta={plural(d.scope.length, 'item')} />
              <ul className="xs">
                {d.scope.map((s, i) => <li key={i}><span>{s.text}</span><Pg page={s.page} terms={termsFor(s.text)} label="Scope" /></li>)}
              </ul>
            </Card>
          )}
          {d.eligibility.length > 0 && (
            <Card>
              <CardHead title="Eligibility" meta="what a bidder must show" />
              <FieldRows fields={d.eligibility} offset={off.eligibility} confirmFor={confirmFor} />
            </Card>
          )}
          {d.evaluation.length > 0 && (
            <Card>
              <CardHead title="How bids are evaluated" />
              <FieldRows fields={d.evaluation} offset={off.evaluation} confirmFor={confirmFor} />
            </Card>
          )}
          {d.submission.length > 0 && (
            <Card>
              <CardHead title="What to submit" />
              <FieldRows fields={d.submission} offset={off.submission} confirmFor={confirmFor} />
            </Card>
          )}
          {d.clauses.length > 0 && (
            <Card>
              <CardHead title="Clauses worth reading" meta={plural(d.clauses.length, 'clause')} />
              {d.clauses.map((c, i) => (
                <div className="xc" key={i}>
                  <span className="xc-ref mono">{c.ref}</span>
                  <span className="xc-body"><b>{c.title}</b><span>{c.summary}</span></span>
                  <Pg page={c.page} terms={[c.ref, ...termsFor(c.title)]} label={c.title} />
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="stack-gap">
          <Card>
            <CardHead title="Key dates" meta={d.dates.length ? `as printed, ${d.dates[0].date.slice(0, 4)}` : 'none printed'} />
            {d.dates.length ? (
              <ol className="xd">
                {d.dates.map((x, i) => (
                  <li key={i} className={x === due ? 'due' : ''}>
                    <span className="xd-d mono">{dayMonth(x.date)}<small>{x.date.slice(0, 4)}{x.time ? `, ${x.time}` : ''}</small></span>
                    <span className="xd-l">{x.label}</span>
                    <Pg page={x.page} terms={termsFor('', x.date, x.time)} label={x.label} />
                  </li>
                ))}
              </ol>
            ) : <div className="card-body t-ink3" style={{ fontSize: 13 }}>The document gives no dates. Ask the client for the submission schedule.</div>}
          </Card>
          {d.flags.length > 0 && (
            <Card>
              <CardHead title="Raised at screening" meta={plural(d.flags.length, 'point')} />
              {d.flags.map((f, i) => (
                <div className="item" key={i}>
                  <span className={`bar-rail bg-${f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'orange' : 'ink3'}`} />
                  <span className="item-body"><span className="item-title">{f.title}</span><span className="item-text">{f.detail}</span></span>
                  <span className="item-when"><Pg page={f.page} terms={termsFor(f.title)} label={f.title} /></span>
                </div>
              ))}
            </Card>
          )}
          {d.contacts.length > 0 && (
            <Card>
              <CardHead title="Contacts" />
              {d.contacts.map((c, i) => (
                <div className="xk" key={i}>
                  <b>{c.name}</b>
                  <span>{c.role}, {c.org}</span>
                  {c.address && <span>{c.address}</span>}
                  {(c.email || c.phone) && <span className="t-ink3">{[c.phone, c.email].filter(Boolean).join(', ')}</span>}
                  <Pg page={c.page} terms={[c.name, ...(c.email ? [c.email] : [])]} label={c.name} />
                </div>
              ))}
            </Card>
          )}
          <Card>
            <CardHead title="Needs checking" meta={open.length ? `${open.length} open` : 'done'} />
            {doubts.map((f) => (
              <div className="xq" key={f.idx}>
                <span className="xq-b"><b>{f.label}</b><span className={tc(f.confidence === 'low' ? 'red' : 'orange')}>{f.group}, {f.confidence === 'low' ? 'low confidence' : 'check'}</span></span>
                {confirmFor(f.idx)}
              </div>
            ))}
            {doubts.length === 0 && <div className="card-body t-ink3" style={{ fontSize: 13 }}>Every field was read with high confidence.</div>}
            <CardFoot>{registered ? `Open checks show on ${registered.id} in the register until confirmed.` : 'Confirmed fields are logged against your name.'}</CardFoot>
          </Card>
        </div>
      </div>
    </div>
    {viewAt && (
      <div className="pdfv-wrap">
        <div className="scrim" onClick={() => setViewAt(null)} aria-hidden />
        <Suspense fallback={<div className="pdfv"><div className="pdfv-msg">Opening the viewer…</div></div>}>
          <PdfViewer url={sourceUrl(d)} title={u.file} page={viewAt.page} terms={viewAt.terms} label={viewAt.label} onClose={() => setViewAt(null)} />
        </Suspense>
      </div>
    )}
    </ViewerCtx.Provider>
  );
}
