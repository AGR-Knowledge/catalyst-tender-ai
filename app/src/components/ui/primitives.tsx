import type { CSSProperties, ReactNode } from 'react';
import type { Tone } from '@/data/types';
import { STAGE_MARKERS } from '@/data/stages';

export const tc = (t?: Tone) => (t ? `t-${t}` : '');
export const bg = (t?: Tone) => (t ? `bg-${t}` : '');

export function Card({ children, className = '', style, id }: { children: ReactNode; className?: string; style?: CSSProperties; id?: string }) {
  return <section id={id} className={`card ${className}`} style={style}>{children}</section>;
}

export function CardHead({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="card-head">
      <h3 className="card-title">{title}</h3>
      {meta != null && <span className="card-meta">{meta}</span>}
      {children}
    </header>
  );
}

export function CardFoot({ children, row = false }: { children: ReactNode; row?: boolean }) {
  return <footer className={`card-foot ${row ? 'row' : ''}`}>{children}</footer>;
}

export function SectionTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {sub && <span>{sub}</span>}
      {children}
    </div>
  );
}

export interface KpiItem { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; subTone?: Tone }

export function Kpis({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpis-c">
      <div className="kpis" data-n={items.length} style={{ '--n': items.length } as CSSProperties}>
        {items.map((k, i) => (
          <div className="kpi" key={k.label} style={{ animationDelay: `${i * 30}ms` }}>
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${tc(k.tone ?? 'ink')}`}>{k.value}</div>
            {k.sub && <div className={`kpi-sub ${tc(k.subTone)}`}>{k.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Meter({ label, value, pct, tone = 'ink', valueTone, thin = false }: { label: ReactNode; value: ReactNode; pct: number; tone?: Tone; valueTone?: Tone; thin?: boolean }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span className="l">{label}</span>
        <span className={`v ${tc(valueTone)}`}>{value}</span>
      </div>
      <Track pct={pct} tone={tone} thin={thin} />
    </div>
  );
}

export function Track({ pct, tone = 'ink', thin = false }: { pct: number; tone?: Tone; thin?: boolean }) {
  return (
    <div className={`track ${thin ? 'thin' : ''}`} role="presentation">
      <span className={bg(tone)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Mark({ tone, children, soft }: { tone?: Tone; children: ReactNode; soft?: 'orange' | 'green' }) {
  return <span className={`mark ${soft ? 'soft-' + soft : bg(tone)}`} aria-hidden>{children}</span>;
}

/** Nine-stage (or n-stage) progress track with gate markers. */
export function StageTrack({ current, count = 9, compact = false, markers = !compact }: { current: number; count?: number; compact?: boolean; markers?: boolean }) {
  const steps = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <div className={`track-steps ${compact ? 'compact' : ''}`} style={{ '--n': count } as CSSProperties} aria-label={`Stage ${current} of ${count}`}>
      {steps.map((n) => (
        <div key={n}>
          <div className={`bar ${n < current ? 'done' : n === current ? 'now' : ''}`} />
          <div className="lbl">
            <span className={`s ${n > current ? 'future' : ''}`}>S{n}</span>
            {markers && STAGE_MARKERS[n] && <span className="g">{STAGE_MARKERS[n]}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return <span className={`dot ${bg(tone)} ${pulse ? 'pulse' : ''}`} aria-hidden />;
}

export function KV({ k, v, tone, mono, stack }: { k: ReactNode; v?: ReactNode; tone?: Tone; mono?: boolean; stack?: boolean }) {
  return (
    <div className={`kv ${stack ? 'stack' : ''}`}>
      <span className="k">{k}</span>
      {v !== undefined && v !== '' && <span className={`v ${mono ? 'mono' : ''} ${tc(tone ?? 'ink')}`}>{v}</span>}
    </div>
  );
}
