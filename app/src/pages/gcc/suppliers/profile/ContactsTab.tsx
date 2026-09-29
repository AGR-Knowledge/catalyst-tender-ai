import { useMemo, useState } from 'react';
import { Eye, FileText, Mail, Phone } from 'lucide-react';
import { Card, CardHead } from '@/components/ui/primitives';
import { FileViewer } from '@/components/tender/FileViewer';
import { supplierDocumentsFor } from '@/domain/gcc/suppliers/documents';
import { Scroll, dmy, type TabProps } from './parts';

/**
 * Contacts and documents (plan 031 step 4.6): the supplier's key people
 * (fictional names, `.example` emails, phones in its country's format) and its
 * Supplier Portal user, beside its documents (one `.eq-row`). View opens each
 * in plan 030's file viewer as a watermarked facsimile.
 */
export function ContactsTab({ d }: TabProps) {
  const files = useMemo(() => supplierDocumentsFor(d), [d]);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
    <div className="eq-row">
      <Card>
        <CardHead title="Key contacts" meta={<span className="tk-sub">{d.row.s.name}</span>} />
        <Scroll pad={false}>
          <ul className="spf-rows">
            {d.contacts.map((c) => (
              <li key={c.role} className="spf-contact">
                <span className="spf-row-t">
                  <span className="spf-row-n">{c.name}</span>
                  <span className="spf-row-m">{c.title}</span>
                </span>
                <span className="spf-reach">
                  <a href={`mailto:${c.email}`} className="spf-tender"><Mail size={12} aria-hidden />{c.email}</a>
                  <span className="num"><Phone size={12} aria-hidden />{c.phone}</span>
                </span>
              </li>
            ))}
            <li className="spf-contact">
              <span className="spf-row-t">
                <span className="spf-row-n">{d.portalUser ? d.portalUser.name : 'No Supplier Portal user'}</span>
                <span className="spf-row-m">{d.portalUser ? `${d.portalUser.title}; answers your RFQs in the Supplier Portal` : 'RFQs go to the tendering contact by email until one is set up'}</span>
              </span>
              <span className="spf-reach tk-sub">Supplier Portal</span>
            </li>
          </ul>
        </Scroll>
      </Card>
      <Card>
        <CardHead title="Documents" meta={<span className="tk-sub">Held with its prequalification</span>} />
        <Scroll pad={false}>
          <ul className="spf-rows">
            {files.map((f, i) => (
              <li key={f.id} data-file-row={f.id}>
                <span className="spf-row-t">
                  <span className="spf-row-n"><FileText size={13} aria-hidden className="spf-ic" />{f.title}</span>
                  <span className="spf-row-m" title={f.name}>PDF{f.extent ? ` · ${f.extent.n} ${f.extent.n === 1 ? 'page' : 'pages'}` : ''} · dated {dmy(f.receivedAt ?? '')}</span>
                </span>
                <button type="button" className="btn btn-sm" onClick={() => setOpen(i)} aria-label={`View ${f.title}`}><Eye size={12} aria-hidden />View</button>
              </li>
            ))}
          </ul>
          <p className="s1-note spf-pad-x">Each opens as a facsimile built from the supplier’s record.</p>
        </Scroll>
      </Card>
    </div>
    <FileViewer file={open !== null ? files[open] ?? null : null} files={files} onIndex={setOpen} onClose={() => setOpen(null)} />
    </>
  );
}
