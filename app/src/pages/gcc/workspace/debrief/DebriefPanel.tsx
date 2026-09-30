import { useEffect, useMemo, useRef, useState } from 'react';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { debriefFor, type DebriefCtx, type DebriefVM } from '@/domain/gcc/debriefs';
import { Card } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import type { WorkspaceCtx } from '../tabs/types';
import { DebriefHead, WhatWeKnow } from './WhatWeKnow';
import { DebriefForm } from './DebriefForm';
import { DebriefRecord } from './DebriefRecord';
import { SignOff } from './SignOff';
import { RECORDABLE, WRITERS, stampText, type DebriefAccess, type DebriefWriters } from './format';
import '../../s3/s3.css';
import './debrief.css';

/**
 * The Debrief tab (plan 036; spec §20.1–20.3): on any tender that ended, what
 * we know about the ending, then the Project Director's form while the debrief
 * is due or sent back, and the record once it is submitted, with the Head of
 * Tendering's sign-off while it waits. One column, so no cards sit side by
 * side. Everything comes from `domain/gcc/debriefs`; access from `can()`.
 */

export function DebriefPanel({ ctx }: { ctx: WorkspaceCtx }) {
  const { nextAt } = useDemo();
  const now = nextAt();
  const dctx = useMemo<DebriefCtx>(() => ({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done, now }), [ctx.tenant, ctx.viewer, ctx.done, now]);
  const vm = useMemo(() => debriefFor(dctx, ctx.tenderId), [dctx, ctx.tenderId]);
  const access = useMemo<DebriefAccess>(() => ({
    record: ctx.check('debrief.record'),
    holdsRecord: ctx.check('debrief.record', { viewAs: false }).ok,
    accept: ctx.check('debrief.accept'),
    holdsAccept: ctx.check('debrief.accept', { viewAs: false }).ok,
  }), [ctx]);

  if (!vm) {
    return <Card><EmptyState title="No debrief for this tender." body="A debrief opens when a bid ends: won, lost, cancelled by the employer, withdrawn, No-Bid at DG2 or rejected at DG3." /></Card>;
  }
  return <DebriefView vm={vm} dctx={dctx} access={access} />;
}

/** The tab's body for one view model; the kit preview renders it with fixtures and writers that write nothing. */
export function DebriefView({ vm, dctx, access, writers = WRITERS }: { vm: DebriefVM; dctx: DebriefCtx; access: DebriefAccess; writers?: DebriefWriters }) {
  // After a submit, an acceptance or a send-back, focus moves to the record's heading (the DG3 pattern).
  const [arrive, setArrive] = useState(false);
  const recordHead = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!arrive || !recordHead.current) return;
    recordHead.current.focus({ preventScroll: false });
    setArrive(false);
  }, [arrive, vm]);

  const sub = vm.record.submission;
  const back = vm.record.sentBack;
  const form = access.holdsRecord && RECORDABLE.includes(vm.status);
  const recorder = personById(vm.recorderId);
  const recorderText = recorder ? `${recorder.name} (${recorder.title})` : 'the Project Director';
  // Re-mount the form when the debrief moves on, so it starts from the new draft.
  const formKey = `${vm.tenderId}:${vm.status}:${sub?.round ?? 0}`;

  return (
    <div className="ws-tab dbt">
      <DebriefHead vm={vm} />
      <WhatWeKnow vm={vm} />

      {form ? (
        <DebriefForm key={formKey} vm={vm} dctx={dctx} check={access.record} writers={writers} onSubmitted={() => setArrive(true)} />
      ) : sub ? (
        <>
          {vm.status === 'sent-back' && back && (
            <Callout variant="route" word="Sent back" title={`By ${personById(back.byId)?.name ?? 'the Head of Tendering'}, ${stampText(back.at)}: "${back.note}"`} compact>
              Waiting for {recorderText} to submit it again.
            </Callout>
          )}
          <DebriefRecord vm={vm} headRef={recordHead}>
            <SignOff vm={vm} dctx={dctx} check={access.accept} holds={access.holdsAccept} writers={writers} onDone={() => setArrive(true)} />
          </DebriefRecord>
        </>
      ) : (
        <Card><p className="dbr-wait solo">Waiting for {recorderText} to record it.</p></Card>
      )}
    </div>
  );
}
