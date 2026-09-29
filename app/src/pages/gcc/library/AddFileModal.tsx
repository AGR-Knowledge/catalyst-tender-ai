import { useEffect, useId, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { useDemo } from '@/state/store';
import { flatFolders, keepContent, libFileKey, libFileWrite, type LibraryVM } from '@/domain/gcc/library';
import { readDone } from '@/domain/gcc/s1/done';
import type { LibFileValue } from '@/domain/gcc/library/uploads';
import { S1Modal } from '@/pages/gcc/s1/parts/Modal';
import { DemoTag } from '@/components/tender/DemoTag';

/**
 * Add a file to a tender's library (plan 030 Phase 4): the browser's file
 * picker and the folder to put it in (the open one by default). The write goes
 * through `mark()` as a `lib-file:` key, so a reload keeps it and Reset demo
 * clears it; the content stays in this session only. The same name in the same
 * folder becomes the next version. Anyone who can open the tender may add a
 * file (no new capability); View as is read only. Focus returns to the button
 * that opened it.
 */

const sizeText = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function AddFileModal({ open, onClose, lib, folderId }: {
  open: boolean;
  onClose(): void;
  lib: LibraryVM;
  /** The folder open in the browser, if people may add to it. */
  folderId: string;
}) {
  const { state, mark, logAudit, nextAt } = useDemo();
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState(folderId);
  const input = useRef<HTMLInputElement>(null);
  const selectId = useId();
  const folders = flatFolders(lib.folders).filter((f) => f.addable);

  useEffect(() => { if (open) { setFile(null); setFolder(folders.some((f) => f.id === folderId) ? folderId : '05'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = folders.find((f) => f.id === folder);
  const before = file ? readDone<LibFileValue>(state.done, libFileKey(lib.tenderId, folder, file.name)) : null;
  const where = target ? target.path.join(' › ') : folder;

  const add = () => {
    if (!file || !target) return;
    const w = libFileWrite(state.done, lib.tenderId, folder, { name: file.name, size: file.size, type: file.type }, nextAt(), state.person.id);
    keepContent(w.key, file);
    mark(w.key, `Added ${file.name}${w.again ? ` as version ${w.parsed.version}` : ''} to ${where}`, 'green', w.value);
    logAudit({ actorId: state.person.id, action: 'Added a file to the tender library', target: lib.tenderId, detail: `${file.name} to ${where}${w.again ? ` (version ${w.parsed.version})` : ''}. Demo: the content stays in this session` });
    onClose();
  };

  return (
    <S1Modal
      open={open} onClose={onClose} eyebrow="Tender library" title={`Add a file to ${lib.tenderId}`}
      sub="For your own files: the proposal, a drawing, a note from a meeting."
      actions={[
        { label: before ? `Add version ${(before.version ?? 1) + 1}` : 'Add file', primary: true, disabled: !file || !target, onClick: add },
        { label: 'Cancel', onClick: onClose },
      ]}
      foot={!file ? 'Choose a file first.' : undefined}
    >
      <label className="s1-drop lib-drop">
        <FileUp size={18} aria-hidden />
        <span>{file ? <><bdi dir="auto" className="mono">{file.name}</bdi> · {sizeText(file.size)}</> : 'Choose a file'}</span>
        <input ref={input} type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }} />
      </label>
      <div className="lib-field">
        <label htmlFor={selectId}>Folder</label>
        <select id={selectId} value={folder} onChange={(e) => setFolder(e.target.value)}>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.path.join(' › ')}</option>)}
        </select>
      </div>
      {before && <p className="s1-note">A file of this name is already in {where}: this adds version {(before.version ?? 1) + 1}, not a second row.</p>}
      <p className="s1-note"><DemoTag /> The demo keeps the file's name and details until Reset demo. Its content stays in this browser session only, and nothing leaves the app.</p>
    </S1Modal>
  );
}
