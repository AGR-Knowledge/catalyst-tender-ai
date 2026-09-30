import { useId, useRef, useState, type ReactNode } from 'react';
import { Check, Plus, Send, X } from 'lucide-react';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';
import {
  BID_AGAIN, EMPLOYER_DEBRIEF, FACTORS, LESSON_AREAS, MAX_FACTORS, MAX_LESSONS, STOPPED_EARLIER,
  draftFor, isDebriefError, validateDebrief,
  type DebriefCtx, type DebriefInput, type DebriefVM, type DebriefWriteResult, type Lesson, type LessonArea, type VocabItem,
} from '@/domain/gcc/debriefs';
import type { CanResult } from '@/data/access';
import { Card, CardHead } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { DemoTag } from '@/components/tender/DemoTag';
import { ConfirmModal, Effects } from '../../s3/Confirm';
import { debriefLines, gateOf, stampText, type DebriefWriters } from './format';

/**
 * The Project Director's debrief (plan 036 Phase 2): at most six short
 * sections, only those that apply to the ending (`vm.sections`), pre-set from
 * the facts (`draftFor`). The rules are the domain's: `validateDebrief` says
 * what is missing, in sentences, after the first attempt; the writer says what
 * happens, before anything is written. Under View as the form reads only,
 * with the reason.
 */

/** A form lesson may not have its area yet, and the place is typed as text; the validator says what is missing. */
type DraftLesson = { area: LessonArea | ''; text: string };
type Draft = Omit<DebriefInput, 'lessons' | 'place'> & { lessons: DraftLesson[]; place: [string, string] };

const EMPTY_LESSON: DraftLesson = { area: '', text: '' };

/** A submission, a pre-set or the example, as the form holds it. */
function draftOf(x: DebriefInput): Draft {
  return { ...x, lessons: x.lessons.length ? x.lessons : [EMPTY_LESSON], place: x.place ? [String(x.place[0]), String(x.place[1])] : ['', ''] };
}

/** What the form sends: only the fields its visible sections show, trimmed. */
function inputOf(vm: DebriefVM, d: Draft): DebriefInput {
  const f = vm.facts;
  const changed = vm.ending === 'lost' && !!f.lossReason && !!d.main && d.main !== f.lossReason;
  const e = vm.sections.employer ? d.employer : undefined;
  const note = d.mainNote?.trim();
  const letUs = d.wouldLetUsBid?.trim();
  // Either number given sends both, so the validator can say what the other should be.
  const place: [number, number] | undefined = d.place[0].trim() || d.place[1].trim() ? [Number(d.place[0]) || 0, Number(d.place[1]) || 0] : undefined;
  return {
    tenderId: vm.tenderId,
    main: vm.mainChoices ? d.main : null,
    ...(changed && note ? { mainNote: note } : {}),
    factors: d.factors,
    ...(vm.sections.competition && d.rivalId ? { rivalId: d.rivalId } : {}),
    ...(vm.sections.competition && !f.place && place ? { place } : {}),
    ...(e ? { employer: {
      state: e.state,
      ...((e.state === 'held' || e.state === 'booked') && e.at ? { at: e.at } : {}),
      ...(e.state === 'held' && e.said?.trim() ? { said: e.said.trim() } : {}),
    } } : {}),
    lessons: d.lessons.map((l) => ({ area: l.area as LessonArea, text: l.text.trim() })) as Lesson[],
    ...(vm.sections.bidAgain && d.bidAgain ? { bidAgain: d.bidAgain } : {}),
    ...(vm.sections.stoppedEarlier && d.stoppedEarlier ? { stoppedEarlier: d.stoppedEarlier } : {}),
    ...(vm.sections.stoppedEarlier && letUs ? { wouldLetUsBid: letUs } : {}),
  };
}

/** One choice from a list, as chips over native radios (arrow keys move within the group). */
function RadioChips<K extends string>({ name, items, value, onChange, label }: {
  name: string; items: VocabItem<K>[]; value: K | null | undefined; onChange(v: K): void; label: string;
}) {
  return (
    <div className="rcp-list" role="radiogroup" aria-label={label}>
      {items.map((x) => {
        const on = value === x.id;
        return (
          <label key={x.id} className={`rcp-code dbf-r ${on ? 'on' : ''}`}>
            <input className="dbf-ri" type="radio" name={name} value={x.id} checked={on} onChange={() => onChange(x.id)} />
            <span className="rcp-box" aria-hidden />
            {x.label}
          </label>
        );
      })}
    </div>
  );
}

function Section({ n, title, sub, children }: { n: number; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    // The hairline sits on the wrapper: a fieldset draws its own top border through its legend.
    <div className="dbf-sec">
      <fieldset className="dbf-fs">
        <legend className="dbf-lg"><span className="dbf-n" aria-hidden>{n}</span>{title}{sub && <span className="dbf-sub">{sub}</span>}</legend>
        <div className="dbf-in">{children}</div>
      </fieldset>
    </div>
  );
}

export function DebriefForm({ vm, dctx, check, writers, onSubmitted }: {
  vm: DebriefVM;
  dctx: DebriefCtx;
  /** `can('debrief.record')` on this tender: refused under View as, with its reason. */
  check: CanResult;
  writers: DebriefWriters;
  /** Called once the submission is written, so the record that replaces the form takes focus. */
  onSubmitted(): void;
}) {
  const id = useId();
  const { state, mark, logAudit, toast, nextAt } = useDemo();
  const viewAs = !!state.viewAs;
  const [d, setD] = useState<Draft>(() => draftOf(draftFor(vm)));
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const errRef = useRef<HTMLUListElement>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const f = vm.facts;
  const input = inputOf(vm, d);
  const v = validateDebrief(input, vm);
  const again = vm.status === 'sent-back';
  const back = vm.record.sentBack;
  const approver = personById(vm.approverId);
  const changed = vm.ending === 'lost' && !!f.lossReason && !!d.main && d.main !== f.lossReason;
  const gate = gateOf(vm);
  const readOnly = !check.ok;

  const submit = () => {
    setTried(true);
    if (!v.ok) { window.setTimeout(() => errRef.current?.focus(), 0); return; }
    setConfirming(true);
  };
  // A preview: nothing is written until Confirm.
  const preview = confirming ? writers.submit(dctx, input, dctx.viewer, nextAt(), { viewAs }) : null;
  const why = preview && isDebriefError(preview) ? preview.error : null;
  const confirm = () => {
    const r = writers.submit(dctx, input, dctx.viewer, nextAt(), { viewAs });
    if (isDebriefError(r)) { toast(r.error, 'red'); return; }
    applyWrite(r, { mark, logAudit, toast });
    setConfirming(false);
    onSubmitted();
  };

  let n = 0;
  const lessonsTitle = vm.group === 'won' ? 'What to repeat' : 'What to do differently';

  return (
    <Card className="dbf">
      <CardHead
        title={again ? 'Record the debrief again' : 'Record the debrief'}
        meta={vm.example && (
          <span className="dbf-ex">
            <button type="button" className="btn btn-sm" onClick={() => { setD(draftOf(vm.example!)); setTried(false); }} disabled={readOnly}>Fill in an example</button>
            <DemoTag title="Demo control: fills the form with a Project Director's example. It never submits." />
          </span>
        )}
      />

      {again && back && (
        <div className="dbf-pad">
          <Callout variant="route" word="Sent back" title={`By ${personById(back.byId)?.name ?? 'the Head of Tendering'}, ${stampText(back.at)}`} compact>
            "{back.note}"
          </Callout>
        </div>
      )}
      {readOnly && <p className="dbf-why" role="note">{check.reason}.</p>}

      <fieldset className="dbf-body" disabled={readOnly}>
        <Section n={++n} title="The main reason" sub={vm.mainChoices ? 'Pick one' : undefined}>
          {vm.mainChoices ? (
            <>
              <RadioChips name={`${id}-main`} items={vm.mainChoices} value={d.main} onChange={(main) => set({ main })} label="The main reason" />
              {changed && (
                <label className="dbf-field">
                  <span className="dbf-l">Why is it different from the result? (required)</span>
                  <textarea rows={2} value={d.mainNote ?? ''} onChange={(e) => set({ mainNote: e.target.value })} placeholder="What the employer or the evaluation told us." />
                  <span className="dbf-hint">Both are kept: the result's reason and yours.</span>
                </label>
              )}
            </>
          ) : (
            <>
              <ul className="rcp-list dbf-fixed" aria-label={`The ${gate ?? 'gate'} reasons`}>
                {(f.gateReasons ?? []).map((r) => <li key={r} className="rcp-code"><span className="rcp-box" aria-hidden><Check size={11} strokeWidth={2.4} /></span>{r}</li>)}
              </ul>
              <p className="dbf-hint">The {gate ?? 'gate'} reasons stand as recorded. Say below what else decided it.</p>
            </>
          )}
        </Section>

        <Section n={++n} title="What else decided it" sub={`${d.factors.length} of ${MAX_FACTORS} chosen`}>
          <div className="rcp-list" role="group" aria-label={`What else decided it, up to ${MAX_FACTORS}`}>
            {FACTORS.map((x) => {
              const on = d.factors.includes(x.id);
              const full = !on && d.factors.length >= MAX_FACTORS;
              return (
                <button
                  key={x.id} type="button" className={`rcp-code ${on ? 'on' : ''}`} aria-pressed={on} disabled={full}
                  onClick={() => set({ factors: on ? d.factors.filter((y) => y !== x.id) : [...d.factors, x.id] })}
                >
                  <span className="rcp-box" aria-hidden>{on && <Check size={11} strokeWidth={2.4} />}</span>
                  {x.label}
                </button>
              );
            })}
          </div>
          {d.factors.length >= MAX_FACTORS && <p className="dbf-hint">Unpick one to choose another.</p>}
        </Section>

        {vm.sections.competition && (
          <Section n={++n} title="The competition">
            <div className="dbf-row">
              <label className="dbf-field">
                <span className="dbf-l">{vm.ending === 'lost' ? 'Who won? (required)' : 'Our closest rival (optional)'}</span>
                <select value={d.rivalId ?? ''} onChange={(e) => set({ rivalId: e.target.value || undefined })}>
                  <option value="">{vm.ending === 'lost' ? 'Choose' : 'None named'}</option>
                  {vm.rivals.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              {!f.place && (
                <div className="dbf-field">
                  <span className="dbf-l" id={`${id}-place`}>Our place, if the employer told us</span>
                  <span className="dbf-place" role="group" aria-labelledby={`${id}-place`}>
                    <input
                      type="number" min={1} inputMode="numeric" aria-label="Our place" value={d.place[0]}
                      onChange={(e) => set({ place: [e.target.value, d.place[1]] })}
                    />
                    <span>of</span>
                    <input
                      type="number" min={1} inputMode="numeric" aria-label="Number of bidders" value={d.place[1]}
                      onChange={(e) => set({ place: [d.place[0], e.target.value] })}
                    />
                    <span>bidders</span>
                  </span>
                </div>
              )}
            </div>
          </Section>
        )}

        {vm.sections.employer && (
          <Section n={++n} title="The employer's debrief">
            <RadioChips
              name={`${id}-emp`} items={EMPLOYER_DEBRIEF} value={d.employer?.state} label="The employer's debrief"
              onChange={(s) => set({ employer: { ...d.employer, state: s } })}
            />
            {(d.employer?.state === 'held' || d.employer?.state === 'booked') && (
              <label className="dbf-field dbf-when">
                <span className="dbf-l">{d.employer.state === 'held' ? 'When it was held' : 'When it is booked'}</span>
                <input type="datetime-local" value={d.employer.at ?? ''} onChange={(e) => set({ employer: { ...d.employer!, at: e.target.value || undefined } })} />
              </label>
            )}
            {d.employer?.state === 'held' && (
              <label className="dbf-field">
                <span className="dbf-l">What the employer told us</span>
                <textarea rows={2} value={d.employer.said ?? ''} onChange={(e) => set({ employer: { ...d.employer!, said: e.target.value } })} placeholder="In their words, as near as you can." />
              </label>
            )}
          </Section>
        )}

        <Section n={++n} title="Lessons" sub={`${lessonsTitle}, up to ${MAX_LESSONS}`}>
          <ol className="dbf-lessons">
            {d.lessons.map((l, i) => (
              <li key={i} className="dbf-lesson">
                <select
                  aria-label={`Lesson ${i + 1}: area`} value={l.area}
                  onChange={(e) => set({ lessons: d.lessons.map((x, j) => (j === i ? { ...x, area: e.target.value as LessonArea } : x)) })}
                >
                  <option value="">Area</option>
                  {LESSON_AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                <textarea
                  rows={2} aria-label={`Lesson ${i + 1}`} value={l.text} placeholder={vm.group === 'won' ? 'What we did that worked, so the next bid repeats it.' : 'What we would do differently, in a sentence or two.'}
                  onChange={(e) => set({ lessons: d.lessons.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
                {d.lessons.length > 1 && (
                  <button type="button" className="btn btn-sm btn-icon dbf-rm" aria-label={`Remove lesson ${i + 1}`} onClick={() => set({ lessons: d.lessons.filter((_, j) => j !== i) })}>
                    <X size={13} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ol>
          {d.lessons.length < MAX_LESSONS && (
            <button type="button" className="btn btn-sm dbf-add" onClick={() => set({ lessons: [...d.lessons, EMPTY_LESSON] })}><Plus size={13} aria-hidden />Add a lesson</button>
          )}
        </Section>

        <Section n={++n} title="Next time">
          {vm.sections.bidAgain && (
            <div className="dbf-field">
              <span className="dbf-l" id={`${id}-again`}>Would we bid for this employer again?</span>
              <RadioChips name={`${id}-again`} items={BID_AGAIN} value={d.bidAgain} onChange={(bidAgain) => set({ bidAgain })} label="Would we bid for this employer again?" />
            </div>
          )}
          {vm.sections.stoppedEarlier && (
            <>
              <div className="dbf-field">
                <span className="dbf-l">Should we have stopped earlier?</span>
                <RadioChips name={`${id}-stop`} items={STOPPED_EARLIER} value={d.stoppedEarlier} onChange={(stoppedEarlier) => set({ stoppedEarlier })} label="Should we have stopped earlier?" />
              </div>
              <label className="dbf-field">
                <span className="dbf-l">What would have let us bid? (optional)</span>
                <textarea rows={2} value={d.wouldLetUsBid ?? ''} onChange={(e) => set({ wouldLetUsBid: e.target.value })} placeholder="A partner, a credential, more time, a different price basis." />
              </label>
            </>
          )}
        </Section>

        {tried && !v.ok && (
          <div className="dbf-pad">
            <ul className="dbf-err" role="alert" tabIndex={-1} ref={errRef} aria-label="What is still needed">
              {v.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="dbf-foot">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={readOnly}>
            <Send size={13} aria-hidden />{again ? 'Submit again for sign-off' : 'Submit for sign-off'}
          </button>
          <span className="dbf-hint">Sent to {approver?.name ?? 'the Head of Tendering'} with your name and the time, {stampText(nextAt())}.</span>
        </div>
      </fieldset>

      <ConfirmModal
        open={confirming} wide
        eyebrow={`Debrief · ${vm.tenderId}`} title="Submit the debrief for sign-off"
        sub={`${vm.endingLabel} on ${stampText(vm.endedAt)}${again ? `, round ${(vm.record.submission?.round ?? 0) + 1}` : ''}. ${approver?.name ?? 'The Head of Tendering'} accepts it or sends it back.`}
        confirmLabel={again ? 'Submit again' : 'Submit for sign-off'} disabledReason={why}
        onConfirm={confirm} onClose={() => setConfirming(false)}
      >
        {preview && !isDebriefError(preview) && <Effects items={preview.effects} />}
        <div className="dbf-says" aria-label="Record preview">
          <div className="s3-effects-h">The record will say</div>
          <ol>
            {debriefLines(vm, input).map((x) => (
              <li key={x.id}>
                <b>{x.title}:</b> {x.text}{x.text && x.items?.length ? ': ' : ''}{x.items?.join(' · ')}
              </li>
            ))}
          </ol>
        </div>
      </ConfirmModal>
    </Card>
  );
}

type DemoWrite = Pick<ReturnType<typeof useDemo>, 'mark' | 'logAudit' | 'toast'>;

/** A writer's result into the demo: each write through `mark`, each entry through `logAudit`, the first effect as the toast. */
export function applyWrite(r: DebriefWriteResult, demo: DemoWrite) {
  for (const w of r.writes) demo.mark(w.key, undefined, undefined, w.value);
  r.audit.forEach((a) => demo.logAudit(a));
  if (r.effects[0]) demo.toast(r.effects[0].replace(/\.?$/, '.'), 'green'); // an effect is a list item; the toast is a sentence
}
