import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { personById } from '@/data/people';
import { LOSS_LABEL, type DebriefVM } from '@/domain/gcc/debriefs';
import { Card, CardHead } from '@/components/ui/primitives';
import { Money } from '@/components/tender/Money';
import { StatusPill } from '@/components/tender/StatusPill';
import { STATUS_ICON, dayText, gateOf, stampText } from './format';

/**
 * The tab's head (what ended, when, and where the debrief stands) and What we
 * know: the facts of the ending, read-only, from the result and the gate
 * records. The employer's debrief date shows here only until the Project
 * Director records it; after that the record says it, so it isn't shown twice.
 */

export function DebriefHead({ vm }: { vm: DebriefVM }) {
  return (
    <header className="dbh">
      <div className="dbh-l1">
        <h2 className="dbh-t">Debrief · {vm.endingLabel} on {dayText(vm.endedAt)}</h2>
        <StatusPill label={vm.statusText} tone={vm.statusTone} icon={STATUS_ICON[vm.status]} />
      </div>
      <p className="dbh-rule">Recorded by the Project Director, accepted by the Head of Tendering. Both are kept, with the names and the time.</p>
    </header>
  );
}

const LETTER: Record<NonNullable<DebriefVM['facts']['letter']>, string> = {
  award: 'Letter of award', regret: 'Regret letter', cancellation: 'Notice of cancellation',
};

export function WhatWeKnow({ vm }: { vm: DebriefVM }) {
  const f = vm.facts;
  const gate = gateOf(vm);
  const decider = personById(f.gateById);
  const items: { k: string; v: ReactNode; wide?: boolean }[] = [];

  if (gate && f.gateAt) items.push({ k: `Decided at ${gate}`, v: `${decider ? `${decider.name}, ${decider.title}` : 'Recorded'}, ${stampText(f.gateAt)}` });
  if (!gate && f.gateReasons?.length) items.push({ k: 'Why it closed', v: f.gateReasons.join('; '), wide: true });
  if (vm.sections.competition) items.push({ k: 'Our place', v: f.place ? `${f.place[0]} of ${f.place[1]}` : 'Not published' });
  if (f.value) items.push({ k: 'Value', v: <Money value={f.value} /> });
  if (vm.ending === 'lost' && f.lossReason) items.push({ k: 'Loss reason in the result', v: LOSS_LABEL[f.lossReason] });
  if (vm.sections.employer && f.employerDebriefAt && !vm.record.submission) {
    items.push({ k: "Employer's debrief", v: stampText(f.employerDebriefAt) });
  }
  if (f.dg2Lessons) items.push({ k: 'Lessons noted at DG2', v: f.dg2Lessons, wide: true });
  if (f.letter) {
    items.push({
      k: 'The letter',
      v: <Link to={`/tenders/${encodeURIComponent(vm.tenderId)}?tab=documents&folder=07`}>{LETTER[f.letter]} › Library › 07 Result</Link>,
    });
  }
  if (!items.length) return null;

  return (
    <Card>
      <CardHead title="What we know" meta="From the result and the gate records" />
      <dl className="dbw">
        {items.map((x) => (
          <div key={x.k} className={`dbw-i ${x.wide ? 'wide' : ''}`}>
            <dt className="dbw-k">{x.k}</dt>
            <dd className="dbw-v">{x.v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
