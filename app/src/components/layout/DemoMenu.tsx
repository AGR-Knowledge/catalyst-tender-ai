import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Columns3, FastForward, Play, RotateCcw, Sparkles } from 'lucide-react';
import { isGccTenantKey } from '@/data/gcc';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { plural } from '@/domain/format';
import { addHours, DEMO_NOW } from '@/domain/gcc/clock';
import { pendingRepliesAll } from '@/domain/gcc/s2/simulate';
import { isPlan, presetFor, presets } from '@/domain/gcc/demo/presets';
import { stage3Candidates, stage3Entry, stage3EntryWrite } from '@/domain/gcc/demo/25-stage3-entry.apply';

/**
 * The presenter's Demo menu (plan 014, spec §16), beside the company switch
 * for GCC tenants. Everything in it is a demo control and is labelled so:
 * - Start from: the scenario presets, each landing on its screen;
 * - Simulate: "Advance agent work" (the scripted supplier replies) and
 *   "Advance to Stage 3" for the demo tender on screen;
 * - Views: the Compare tenants lens;
 * - Reset: this company or all, through the Reset modal.
 * Keyboard: Enter opens it, the arrow keys move, Esc closes it and returns to the button.
 */

interface Item {
  id: string;
  icon: ReactNode;
  label: string;
  line: string;
  /** Why it can't run now; the item stays focusable so the reason can be read. */
  reason?: string;
  run?: () => void;
}

/** The tender the screen is about: `/tenders/:id`, or `?tender=` on a desk or gate page. */
function tenderOnScreen(pathname: string, search: string): string | null {
  const m = /^\/tenders\/([^/?#]+)/.exec(pathname);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(search).get('tender');
}

export function DemoMenu() {
  const { state, applyPreset, openModal, toast, mark, logAudit } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  // Outside click closes; Esc closes and returns the focus to the button.
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent | TouchEvent) => { if (anchor.current && !anchor.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('touchstart', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('touchstart', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  // Opening moves the focus to the first item.
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const groups = useMemo(() => {
    if (!open || !isGccTenantKey(tenant)) return [];
    const done = state.done;
    const nextAt = () => {
      const last = state.audit[state.audit.length - 1];
      return last ? addHours(last.at, 1 / 60) : DEMO_NOW;
    };
    const finish = (to: string, message: string) => {
      close(false);
      navigate(to);
      window.scrollTo({ top: 0 });
      toast(message, 'ink3');
    };

    const start: Item[] = presets().map((p) => {
      const r = presetFor(p, tenant);
      return {
        id: `preset:${p.id}`, icon: <Play size={13} aria-hidden />, label: p.label, line: p.line,
        ...(isPlan(r)
          ? { run: () => { applyPreset(tenant, r.writes, r.audit); finish(r.to, r.message); } }
          : { reason: r.unavailable }),
      };
    });

    const replies = pendingRepliesAll(tenant, done);
    const declines = replies.filter((x) => x.reply.declines).length;
    const simulate: Item[] = [{
      id: 'agent-work', icon: <FastForward size={13} aria-hidden />, label: 'Advance agent work',
      line: 'Completes pending agent steps now: the scripted supplier replies (simulated).',
      ...(replies.length
        ? {
          run: () => {
            // As the package board's "Demo: suppliers reply now" records them: each reply's audit entry, then its key.
            for (const { write: w } of replies) { logAudit(w.audit); mark(w.key, undefined, 'green', w.value); }
            finish(`/sourcing?tender=${encodeURIComponent(replies[0].rfq.tenderId)}&s=tracking`,
              `${plural(replies.length, 'supplier reply', 'supplier replies')} received (simulated)${declines ? `, ${plural(declines, 'decline')} among them` : ''}. Quotes are in the levelling queue. Showing the package board.`);
          },
        }
        : { reason: 'No agent work is pending.' }),
    }];

    const candidates = stage3Candidates(tenant);
    if (candidates.length) {
      const here = tenderOnScreen(pathname, search);
      const id = here && candidates.includes(here) ? here : null;
      const can = id ? stage3Entry(tenant, id, done) : null;
      simulate.push({
        id: 'stage3', icon: <Sparkles size={13} aria-hidden />, label: id ? `Advance ${id} to Stage 3` : 'Advance to Stage 3',
        line: 'Opens the seeded Bid / No-Bid pack and moves the tender into Stage 3.',
        ...(!id || !can
          ? { reason: `Open ${candidates.join(' or ')} to move it to Stage 3.` }
          : !can.ok ? { reason: can.reason }
          : {
            run: () => {
              const w = stage3EntryWrite(tenant, id, state.realPerson.id, nextAt(), done);
              if ('error' in w) { toast(w.error, 'red'); return; }
              logAudit(w.audit);
              for (const x of w.writes) mark(x.key, undefined, 'green', x.value);
              finish(`/packs?tender=${encodeURIComponent(id)}`, `${id} moved to Stage 3 (demo control). Its Bid / No-Bid pack is ready to issue to the committee. Showing the pack.`);
            },
          }),
      });
    }

    const views: Item[] = [{
      id: 'compare', icon: <Columns3 size={13} aria-hidden />, label: 'Compare tenants',
      line: 'The hero tender in all five companies, side by side. A demo view.',
      run: () => { close(false); navigate('/demo/compare'); window.scrollTo({ top: 0 }); },
    }];

    const reset: Item[] = [{
      id: 'reset', icon: <RotateCcw size={13} aria-hidden />, label: 'Reset demo…',
      line: 'This company or all companies. Asks first.',
      run: () => { close(false); openModal({ type: 'reset' }); },
    }];

    return [
      { title: 'Start from', items: start },
      { title: 'Simulate', items: simulate },
      { title: 'Views', items: views },
      { title: 'Reset', items: reset },
    ];
  }, [open, tenant, state.done, state.audit, state.realPerson.id, pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const to = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === 'ArrowDown') to(i + 1);
    else if (e.key === 'ArrowUp') to(i < 0 ? items.length - 1 : i - 1);
    else if (e.key === 'Home') to(0);
    else if (e.key === 'End') to(items.length - 1);
    else if (e.key === 'Tab') close(false);
  };

  return (
    <span className="pop-anchor" ref={anchor}>
      <button
        ref={button} type="button" className={`hd-pill hd-demo ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Demo controls: scenario presets, simulation, Compare tenants and Reset" title="Demo controls, not part of the product"
      >
        <span>Demo</span>
        <ChevronDown size={12} className="hd-demo-caret" aria-hidden />
      </button>
      {open && (
        <div className="popover demo-pop" role="menu" aria-label="Demo controls" ref={menu} onKeyDown={onKey}>
          <div className="pop-head"><span className="t"><span className="demo-chip">Demo</span>Presenter controls</span></div>
          <div className="demo-list">
            {groups.map((g) => (
              <div key={g.title} role="group" aria-label={g.title}>
                <div className="demo-sub" role="presentation">{g.title}</div>
                {g.items.map((it) => (
                  <button
                    key={it.id} type="button" role="menuitem" className="pop-item demo-item" aria-disabled={!it.run || undefined}
                    onClick={() => it.run?.()}
                  >
                    <span className="demo-ic">{it.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="item-title">{it.label}</span>
                      <span className="item-text">{it.line}</span>
                      {it.reason && <span className="demo-why">{it.reason}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="pop-foot">Presenter tools for this demo. In production none of these exist.</div>
        </div>
      )}
    </span>
  );
}
