import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';
import { roleOf } from '@/data/roles';
import { EXTRACTED } from '@/data/extracted';
import { useDemo } from '@/state/store';
import { progressOf, useNow } from '@/domain/intake';
import { ModalFrame } from '@/components/overlays/Frames';
import { UploadRow } from './UploadProgress';

const MAX_MB = 50;

export function UploadModal() {
  const { state, closeModal, addUpload } = useDemo();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = roleOf(state.role);

  const uploads = [...state.uploads].reverse();
  const now = useNow(state.uploads.some((u) => progressOf(u, Date.now(), state.uploads).phase === 'processing'));

  const take = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const bad = list.filter((f) => !/\.pdf$/i.test(f.name) && f.type !== 'application/pdf');
    const big = list.filter((f) => f.size > MAX_MB * 1_048_576);
    const ok = list.filter((f) => !bad.includes(f) && !big.includes(f));
    setError(bad.length ? `${bad.map((f) => f.name).join(', ')}: only PDF files can be read.` : big.length ? `${big[0].name} is over ${MAX_MB} MB.` : null);
    const t = Date.now();
    ok.forEach((f, i) => addUpload({ id: `U${(t + i).toString(36)}`, file: f.name, size: f.size, startedAt: t + i * 600, by: me.name }));
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); };
  const review = (id: string) => { closeModal(); navigate(`/intake/${id}`); };

  return (
    <ModalFrame
      wide
      onClose={closeModal}
      eyebrow="Stage 1 · Intake"
      title="Upload tender documents"
      sub="NIT, RFP, ToR or corrigendum. The Intake Agent reads each one and extracts the fields for review."
      actions={[{ label: 'Done', onClick: closeModal }]}
      foot={state.uploads.length ? 'Extraction carries on if you close this window' : undefined}
    >
      <div className="modal-body up-body">
        <div
          className={`drop ${over ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => input.current?.click()}
          role="button" tabIndex={0} aria-label="Drop PDF files here or choose files"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        >
          <UploadCloud size={26} strokeWidth={1.5} aria-hidden />
          <span className="drop-t">Drop PDF files here</span>
          <span className="drop-s">or</span>
          <span className="btn btn-primary">Choose files</span>
          <span className="drop-s">PDF up to {MAX_MB} MB each</span>
          <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
        </div>
        {error && <div className="up-err" role="alert">{error}</div>}
        <div className="up-hint"><span className="demo-chip">Demo</span>Recognised in this demo: {EXTRACTED.map((d) => d.fileNames[0]).join(', ')}. Other files show how an unknown document is handled.</div>

        {uploads.length > 0 && (
          <div className="up-list">
            {uploads.map((u) => {
              const p = progressOf(u, now, state.uploads);
              return (
                <UploadRow key={u.id} u={u} p={p}>
                  {(p.phase === 'ready' || p.phase === 'processing') && (
                    <span className="up-act">
                      <button type="button" className={`btn ${p.phase === 'ready' ? 'btn-primary' : ''}`} onClick={() => review(u.id)}>
                        {p.phase === 'ready' ? (u.tenderId ? `Open ${u.tenderId}` : 'Review extraction') : 'Watch progress'}
                      </button>
                    </span>
                  )}
                </UploadRow>
              );
            })}
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
