import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import type { Ccy } from '@/data/gcc/fx';
import type { Incoterm } from '@/data/gcc/s2';
import type { SupplierQuoteInput, SupplierView } from '@/domain/gcc/s2';
import { DemoTag } from '@/components/tender/DemoTag';

/**
 * The supplier's reply (spec §8.10, catalogue §C.7): a quote at the level the
 * RFQ fixes, the quote document, validity, lead time, deviations and
 * exclusions; or a decline with a reason. The RFQ asks for prices excluding
 * VAT, delivered to site; a supplier who quotes otherwise says so here, and
 * the buyer's levelling restates it.
 */

const CCYS: Ccy[] = ['SAR', 'AED', 'QAR', 'OMR', 'KWD', 'BHD', 'USD', 'EUR'];
const TERMS: { id: Incoterm; label: string }[] = [
  { id: 'DAP site', label: 'Delivered to site (DAP), as asked' },
  { id: 'CIF Dammam', label: 'CIF Dammam port' },
  { id: 'FCA', label: 'Free carrier (FCA), at our works' },
  { id: 'EXW', label: 'Ex works (EXW)' },
];

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function QuoteForm({ view, disabled, onSubmit }: { view: SupplierView; disabled: string | null; onSubmit(input: SupplierQuoteInput, what: 'quote' | 'decline'): void }) {
  const f = view.quoteForm;
  const label = (name: string) => f.fields.find((x) => x.name === name)?.label ?? name;
  const [amount, setAmount] = useState('');
  const [ccy, setCcy] = useState<Ccy>(view.terms.currency);
  const [vat, setVat] = useState(false);
  const [incoterm, setIncoterm] = useState<Incoterm>('DAP site');
  const [validity, setValidity] = useState(String(view.terms.validityDays));
  const [lead, setLead] = useState('');
  const [file, setFile] = useState('');
  const [devs, setDevs] = useState('');
  const [excl, setExcl] = useState('');
  const [declining, setDeclining] = useState(false);
  const [why, setWhy] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  const n = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
  const missing = !(n(amount) > 0) ? 'Enter your price.' : !(n(validity) > 0) ? 'Enter the validity in days.' : !(n(lead) > 0) ? 'Enter the lead time in weeks.' : !file ? 'Attach your quote document.' : null;
  const block = disabled ?? missing;

  if (declining) {
    return (
      <form className="sp-form" onSubmit={(e) => { e.preventDefault(); if (!disabled && why.trim()) onSubmit({ level: f.level, amount: 0, ccy, validityDays: 0, leadTimeWeeks: 0, deviations: [], exclusions: [], fileName: '', declined: why.trim() }, 'decline'); }}>
        <label className="sp-field">
          <span>Why are you declining? (required)</span>
          <textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: our workshop is fully booked until September." />
        </label>
        <div className="sp-acts">
          <button type="submit" className="btn btn-primary" disabled={!!disabled || !why.trim()}>Decline this RFQ</button>
          <button type="button" className="btn" onClick={() => setDeclining(false)}>Back to the quote</button>
          {(disabled || !why.trim()) && <span className="sp-why">{disabled ?? 'Give a reason.'}</span>}
        </div>
      </form>
    );
  }

  return (
    <form className="sp-form" onSubmit={(e) => {
      e.preventDefault();
      if (block) return;
      onSubmit({
        level: f.level, amount: n(amount), ccy, validityDays: Math.round(n(validity)), leadTimeWeeks: Math.round(n(lead)),
        deviations: lines(devs), exclusions: lines(excl), fileName: file, vatInclusive: vat, incoterm,
      }, 'quote');
    }}>
      <p className="sp-hint">{f.levelText}. {view.terms.priceBasis}; {view.terms.delivery.charAt(0).toLowerCase() + view.terms.delivery.slice(1)}.</p>
      <div className="sp-row">
        <label className="sp-field grow">
          <span>{label('amount')}</span>
          <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label className="sp-field">
          <span>Currency</span>
          <select value={ccy} onChange={(e) => setCcy(e.target.value as Ccy)}>{CCYS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
      </div>
      <label className="sp-check"><input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} /> My price includes VAT</label>
      <label className="sp-field">
        <span>Delivery terms of your price</span>
        <select value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm)}>{TERMS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      </label>
      <div className="sp-row">
        <label className="sp-field"><span>{label('validityDays')}</span><input type="text" inputMode="numeric" value={validity} onChange={(e) => setValidity(e.target.value)} /></label>
        <label className="sp-field"><span>{label('leadTimeWeeks')}</span><input type="text" inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Weeks" /></label>
      </div>
      <div className="sp-field">
        <span>{label('fileName')}</span>
        <div className="sp-file">
          <input ref={picker} type="file" accept=".pdf,.xlsx,.xls" className="sr-only" id="sp-file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? '')} />
          <label htmlFor="sp-file" className="btn btn-sm"><Paperclip size={12} aria-hidden /> Choose file</label>
          <span className={file ? '' : 'sp-muted'}>{file || 'No file chosen'}</span>
          {!file && (
            <span className="sp-demo">
              <DemoTag title="Demo control: attach a sample file name, so the presenter needs no file" />
              <button type="button" className="btn-link" onClick={() => setFile(`${view.supplier.name.split(' ')[0]}_${view.package.id}_Quote.pdf`)}>Attach a sample quote</button>
            </span>
          )}
        </div>
      </div>
      <label className="sp-field">
        <span>{view.deviations.label}</span>
        <textarea rows={2} value={devs} onChange={(e) => setDevs(e.target.value)} placeholder="One per line" />
        <small>{view.deviations.hint}</small>
      </label>
      <label className="sp-field">
        <span>{view.exclusions.label}</span>
        <textarea rows={2} value={excl} onChange={(e) => setExcl(e.target.value)} placeholder="One per line, for example: Excludes installation supervision" />
        <small>{view.exclusions.hint}</small>
      </label>
      <div className="sp-acts">
        <button type="submit" className="btn btn-primary" disabled={!!block}>Send quote</button>
        <button type="button" className="btn" disabled={!!disabled} onClick={() => setDeclining(true)}>Decline to quote</button>
        {block && <span className="sp-why">{block}</span>}
      </div>
    </form>
  );
}
