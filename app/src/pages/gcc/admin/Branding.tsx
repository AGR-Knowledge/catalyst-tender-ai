import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ImageUp, RotateCcw, X } from 'lucide-react';
import { useDemo } from '@/state/store';
import { nameStop } from '@/data/tenants';
import {
  ACCENTS, BRANDING_KEY, DISPLAY_NAME_MAX, LOGO_ACCEPT, LOGO_MAX_KB, LOGO_TYPES, accentName, accentVars, brandingChangeText, brandingOf, brandingValue,
  defaultAccentOf, logoProblem, type AccentKey, type BrandingInput, type BrandingLogo,
} from '@/domain/gcc/admin';
import { nowIso } from '@/domain/gcc/s1/done';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { DemoTag } from '@/components/tender/DemoTag';
import { Rule, useAdmin } from './AdminKit';

/**
 * `/admin/branding` (plan 024 Phase 4, s1-s3-demo-spec §16): before a meeting
 * the presenter sets the prospect's accent colour, logo and company name, so
 * the prospect sees their own company. Saved in this company's demo state
 * (`branding`, with an audit entry); the shell applies it at once on every
 * page; Reset demo restores the company's own brand. Persona names and data
 * don't change, and the Catalyst mark stays.
 */

interface Draft { accent: AccentKey | null; logo?: BrandingLogo; displayName: string }

const same = (a: Draft, b: Draft) => a.accent === b.accent && a.logo?.dataUrl === b.logo?.dataUrl && a.displayName.trim() === b.displayName.trim();

export default function Branding() {
  const { tenant, check, profile, viewer } = useAdmin();
  const { state, mark, logAudit } = useDemo();
  const own = defaultAccentOf(tenant);
  const raw = state.done[BRANDING_KEY];
  const saved = useMemo(() => brandingOf(raw ? { [BRANDING_KEY]: raw } : {}), [raw]);
  const savedDraft = useMemo<Draft>(() => ({ accent: saved?.accent ?? own, logo: saved?.logo, displayName: saved?.displayName ?? '' }), [saved, own]);
  const [draft, setDraft] = useState<Draft>(savedDraft);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // A save, Restore defaults or Reset demo elsewhere brings the form back to what is stored.
  useEffect(() => { setDraft(savedDraft); }, [savedDraft]);

  const can = check('admin.branding');
  const dirty = !same(draft, savedDraft);
  const accent = draft.accent ?? own;

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    const why = logoProblem(f);
    setProblem(why);
    if (why) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setDraft((d) => ({ ...d, logo: { dataUrl: reader.result as string, name: f.name } })); };
    reader.onerror = () => setProblem(`${f.name} could not be read. Try another file.`);
    reader.readAsDataURL(f);
  };

  const write = (input: BrandingInput, action: string, msg: string) => {
    logAudit({ actorId: viewer.id, action, detail: brandingChangeText(tenant, input) });
    mark(BRANDING_KEY, msg, 'green', brandingValue(tenant, input, nowIso(), viewer.id));
  };
  const save = () => {
    const input: BrandingInput = { accent: draft.accent ?? undefined, logo: draft.logo, displayName: draft.displayName };
    write(input, 'Branding changed', `Branding saved: ${brandingChangeText(tenant, input).replace(/^./, (c) => c.toLowerCase())}. Every page shows it now`);
  };
  const restore = () => {
    setProblem(null);
    write({}, 'Branding restored', `${profile.name}’s own brand is back on every page`);
  };

  const onSwatchKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = (i + step + ACCENTS.length) % ACCENTS.length;
    setDraft((d) => ({ ...d, accent: ACCENTS[n].key }));
    swatchRefs.current[n]?.focus();
  };

  const previewStyle = (accent ? accentVars(accent) : {}) as CSSProperties;
  const shownName = draft.displayName.trim() || profile.name;

  return (
    <div className="view">
      <div className="split" style={{ '--cols': 'minmax(0, 1.2fr) minmax(0, 1fr)' } as CSSProperties}>
        <Card>
          <CardHead title={<><DemoTag title="Prospect branding: a presenter control to tailor a meeting" /> Prospect branding</>} meta={saved ? `Saved ${saved.at.slice(11, 16)}` : 'The company’s own brand'} />
          <Rule>The prospect’s name replaces the company name in the company switcher only. Persona names and all data stay as they are, and the Catalyst mark stays.</Rule>

          <div className="brand-field">
            <span className="lbl" id="brand-accent-l">Accent colour</span>
            <div className="brand-swatches" role="radiogroup" aria-labelledby="brand-accent-l">
              {ACCENTS.map((a, i) => {
                const on = accent === a.key;
                return (
                  <button
                    key={a.key} ref={(el) => { swatchRefs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                    className={`brand-sw accent-${a.key}`} onClick={() => setDraft({ ...draft, accent: a.key })} onKeyDown={(e) => onSwatchKey(e, i)}
                  >
                    <span className="dot" aria-hidden />
                    <span>{a.name[0].toUpperCase() + a.name.slice(1)}</span>
                    {a.key === own && <span className="own">Company default</span>}
                  </button>
                );
              })}
            </div>
            <span className="hint">Used for the active page marker, charts, selected rows and the focus ring. Every palette has a light and a dark version.</span>
          </div>

          <div className="brand-field">
            <span className="lbl">Logo</span>
            <div className="brand-logo-row">
              {draft.logo && <img className="brand-logo" src={draft.logo.dataUrl} alt={`Logo: ${draft.logo.name}`} />}
              <input ref={fileRef} type="file" accept={LOGO_ACCEPT} hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}><ImageUp size={12} aria-hidden />{draft.logo ? 'Replace logo' : 'Upload logo'}</button>
              {draft.logo && <button type="button" className="btn btn-sm" onClick={() => setDraft({ ...draft, logo: undefined })}><X size={12} aria-hidden />Remove</button>}
              {draft.logo && <span className="adm-sub">{draft.logo.name}</span>}
            </div>
            {problem && <span className="brand-problem" role="alert">{problem}</span>}
            <span className="hint">{LOGO_TYPES.map((t) => t.label).join(', ')}, {LOGO_MAX_KB} KB at most. Shown in place of the company mark in the top bar.</span>
          </div>

          <div className="brand-field">
            <label htmlFor="brand-name">Company name to show</label>
            <input id="brand-name" type="text" value={draft.displayName} maxLength={DISPLAY_NAME_MAX} placeholder={profile.name}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
            <span className="hint">Leave empty to show {nameStop(profile.name)}</span>
          </div>

          <div className="brand-actions">
            <button type="button" className="btn btn-primary" onClick={save} disabled={!can.ok || !dirty}>Save branding</button>
            <button type="button" className="btn" onClick={restore} disabled={!can.ok || !saved}><RotateCcw size={13} aria-hidden />Restore defaults</button>
            {!can.ok && <span className="adm-why">{can.reason}</span>}
            {can.ok && dirty && <span className="adm-why">Not saved yet: the preview shows it.</span>}
          </div>
          <CardFoot>Saved in this company’s demo state and written to the audit log. Reset demo restores {profile.name}’s own brand; each company keeps its own.</CardFoot>
        </Card>

        <Card>
          <CardHead title="Preview" meta={accent ? `Accent ${accentName(accent)}` : undefined} />
          <div className="brand-preview" style={previewStyle} aria-label="Preview of the branding" role="img">
            <div className="bp-top">
              <span className="bp-pill">
                {draft.logo
                  ? <img className="brand-logo" src={draft.logo.dataUrl} alt="" style={{ maxHeight: 20 }} />
                  : <span className="tn-mark sm">{profile.monogram}</span>}
                <span>{shownName}</span>
              </span>
            </div>
            <div className="bp-nav">
              <span className="bp-item on">Dashboard</span>
              <span className="bp-item">Calendar</span>
              <span className="bp-item">Tender radar</span>
            </div>
            <div className="bp-row">
              <span className="bp-bars" aria-hidden><span className="bp-bar" /><span className="bp-bar" /><span className="bp-bar" /><span className="bp-bar" /></span>
              <span className="bp-soft">Selected row</span>
              <span className="bp-focus">Focus ring</span>
            </div>
          </div>
          <CardFoot>The preview follows the theme you are in. Switch between light and dark in Settings to check both.</CardFoot>
        </Card>
      </div>
    </div>
  );
}
