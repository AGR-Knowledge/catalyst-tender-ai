import type { ReactNode, Ref } from 'react';
import { Link } from 'react-router-dom';
import { personById } from '@/data/people';
import type { DebriefVM } from '@/domain/gcc/debriefs';
import { Card, CardHead } from '@/components/ui/primitives';
import { debriefLines, stampText } from './format';

/**
 * The debrief once submitted (plan 036 step 3.1): the same sections as the
 * form, read-only, in the words the Library's Debrief record uses, with who
 * recorded it and who accepted it, and when. The heading takes focus after a
 * submit, an acceptance or a send-back.
 */

const who = (id: string | undefined, fallback: string) => {
  const p = personById(id);
  return p ? `${p.name} (${p.title})` : fallback;
};

export function DebriefRecord({ vm, headRef, children }: { vm: DebriefVM; headRef?: Ref<HTMLSpanElement>; children?: ReactNode }) {
  const sub = vm.record.submission;
  if (!sub) return null;
  const acc = vm.record.accepted;
  const lines = debriefLines(vm, sub);

  return (
    <Card className="dbr">
      <CardHead title={<span ref={headRef} tabIndex={-1}>Debrief record</span>} meta={sub.round > 1 ? `Round ${sub.round}` : undefined} />
      <p className="dbr-by">
        Recorded by {who(sub.byId, 'the Project Director')}, {stampText(sub.at)}
        {acc && <> · Accepted by {who(acc.byId, 'the Head of Tendering')}, {stampText(acc.at)}</>}
      </p>
      <dl className="dbr-list">
        {lines.map((x, i) => (
          <div key={x.id} className="dbr-row">
            <dt><span className="dbf-n" aria-hidden>{i + 1}</span>{x.title}</dt>
            <dd>
              {x.text && <p>{x.text}{x.items?.length ? ':' : ''}</p>}
              {!!x.items?.length && <ul>{x.items.map((t) => <li key={t}>{t}</li>)}</ul>}
            </dd>
          </div>
        ))}
      </dl>
      {acc && (
        <p className="dbr-note">
          In the archive. The Debrief record is also in{' '}
          <Link to={`/tenders/${encodeURIComponent(vm.tenderId)}?tab=documents&folder=07`}>Library › 07 Result</Link>.
        </p>
      )}
      {children}
    </Card>
  );
}
