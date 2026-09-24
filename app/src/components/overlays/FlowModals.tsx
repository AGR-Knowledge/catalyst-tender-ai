import { useState } from 'react';
import type { RoleKey } from '@/data/types';
import { roleOf } from '@/data/roles';
import { CURRENCY_OPTIONS, RESIDENCY_OPTIONS, type Tenant } from '@/data/tenants';
import { useDemo } from '@/state/store';
import { useGo } from '@/state/nav';
import { useLive } from '@/domain/live';
import { handKey, handoverFrom, type HandState } from '@/domain/handover';
import { useTenants } from '@/domain/tenants';
import { plural } from '@/domain/format';
import { ModalFrame } from './Frames';

export const HAND_MARK: Record<HandState, { t: string; cls: string }> = {
  ready: { t: 'Ready', cls: 't-green' },
  open: { t: 'Goes across open', cls: 't-orange' },
  info: { t: 'For reference', cls: 't-ink4' },
};

/* ───────── Hand over to the next owner ───────── */

export function HandoverModal({ from }: { from: RoleKey }) {
  const { closeModal, mark } = useDemo();
  const { goRole } = useGo();
  const live = useLive();
  const h = handoverFrom(from, live);
  const to = roleOf(h.to);
  const me = roleOf(from);
  const [note, setNote] = useState('');
  const open = h.items.filter((i) => i.state === 'open').length;
  const loop = h.to === 'coord';

  const send = () => {
    mark(handKey(from), undefined, undefined, JSON.stringify({ at: Date.now(), note: note.trim() }));
    goRole(h.to, { announce: `Handed over to ${to.name}. ${open ? `${plural(open, 'item')} went across open` : 'Everything went across ready'}` });
  };

  return (
    <ModalFrame
      onClose={closeModal}
      wide
      eyebrow={loop ? 'Stage 9 feeds Stage 1' : `Hand over from ${me.short}`}
      title={`What ${to.name} receives`}
      sub={`${h.what}. ${to.name} (${to.title}) sees this on their dashboard as soon as you hand over.`}
      actions={[
        { label: `Hand over and sign in as ${to.name}`, primary: true, onClick: send },
        { label: 'Cancel', onClick: closeModal },
      ]}
      foot={open ? `${plural(open, 'item')} will be marked as open for ${to.name}` : 'Nothing open goes across'}
    >
      <div className="ho-list">
        {h.items.map((i) => (
          <div className={`ho-item s-${i.state}`} key={i.key}>
            <span className="ho-dot" aria-hidden />
            <span className="ho-body"><b>{i.label}</b><span>{i.detail}</span></span>
            <span className={`ho-state ${HAND_MARK[i.state].cls}`}>{HAND_MARK[i.state].t}</span>
          </div>
        ))}
      </div>
      <div className="fld" style={{ padding: '4px 24px 18px' }}>
        <label htmlFor="ho-note">Note for {to.name} <span className="t-ink5">(optional)</span></label>
        <textarea id="ho-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={open ? 'What they should look at first' : 'Anything they should know'} />
      </div>
    </ModalFrame>
  );
}

/* ───────── Add a tenant ───────── */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

export function TenantAddModal() {
  const { closeModal, addTenant, openDrawer, toast } = useDemo();
  const tenants = useTenants();
  const [f, setF] = useState({ name: '', country: 'India', currency: 'INR', residency: RESIDENCY_OPTIONS[0], admin: '', adminEmail: '', seats: '6' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const taken = tenants.some((t) => t.name.toLowerCase() === f.name.trim().toLowerCase());
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.adminEmail.trim());
  const ok = f.name.trim().length > 2 && !taken && f.admin.trim().length > 1 && emailOk && Number(f.seats) > 0;

  const create = () => {
    let key = 't-' + slug(f.name);
    while (tenants.some((t) => t.key === key)) key += '-2';
    const t: Tenant = {
      key, name: f.name.trim(), legal: f.name.trim(), country: f.country.trim() || 'India', currency: f.currency, residency: f.residency,
      sso: 'Not connected', admin: f.admin.trim(), adminEmail: f.adminEmail.trim(), created: new Date().toISOString().slice(0, 10),
      live: false, goLive: 'to be set', seats: Math.round(Number(f.seats)), sources: [], doneSteps: ['entity'],
    };
    addTenant(t);
    toast(`${t.name} created. Invitation sent to ${t.adminEmail}`, 'green');
    openDrawer({ type: 'tenant', key });
  };

  return (
    <ModalFrame
      onClose={closeModal}
      eyebrow="Platform administration"
      title="Add a tenant"
      sub="A tenant is a company or JV with its own bid office. Nothing is shared with other tenants: documents, users, rates and past bids stay separate."
      actions={[
        { label: 'Create tenant', primary: true, onClick: create, disabled: !ok },
        { label: 'Cancel', onClick: closeModal },
      ]}
      foot="The admin finishes setup from the invitation"
    >
      <div className="fld-grid">
        <div className="fld span2">
          <label htmlFor="tn-name">Company or JV name</label>
          <input id="tn-name" value={f.name} onChange={set('name')} placeholder="e.g. Genesis Infra Saudi LLC" autoComplete="off" />
          {taken && <small className="t-red">A tenant with this name already exists</small>}
        </div>
        <div className="fld">
          <label htmlFor="tn-country">Country</label>
          <input id="tn-country" value={f.country} onChange={set('country')} />
        </div>
        <div className="fld">
          <label htmlFor="tn-cur">Bid currency</label>
          <select id="tn-cur" value={f.currency} onChange={set('currency')}>{CURRENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="fld span2">
          <label htmlFor="tn-res">Data residency</label>
          <select id="tn-res" value={f.residency} onChange={set('residency')}>{RESIDENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select>
          <small>Documents, extracted data and model calls stay in this region.</small>
        </div>
        <div className="fld">
          <label htmlFor="tn-admin">Tenant admin</label>
          <input id="tn-admin" value={f.admin} onChange={set('admin')} placeholder="Name" autoComplete="off" />
        </div>
        <div className="fld">
          <label htmlFor="tn-email">Admin email</label>
          <input id="tn-email" type="email" value={f.adminEmail} onChange={set('adminEmail')} placeholder="name@company.com" autoComplete="off" />
          {f.adminEmail && !emailOk && <small className="t-red">Enter a valid email</small>}
        </div>
        <div className="fld">
          <label htmlFor="tn-seats">Seats</label>
          <input id="tn-seats" type="number" min={1} max={200} value={f.seats} onChange={set('seats')} />
        </div>
      </div>
    </ModalFrame>
  );
}
