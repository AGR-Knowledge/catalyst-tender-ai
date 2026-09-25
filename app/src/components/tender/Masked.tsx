import { Lock } from 'lucide-react';
import { Tip } from './Tip';

/**
 * A value hidden by permission (ui-direction §7.5): "Masked for your role",
 * with a lock and a tooltip naming who can see it. Never a blank or a dash.
 */
export function Masked({ by, text = 'Masked for your role' }: { by?: string; text?: string }) {
  return (
    <Tip
      className="masked" width={260} label={`${text}. ${by ? `Visible to ${by}` : 'Visible to the roles that need it'}`}
      tip={<><b>{text}</b><span>{by ? `Visible to ${by}.` : 'Visible to the roles that need it.'}</span></>}
    >
      <Lock size={12} strokeWidth={1.8} aria-hidden />
      <span>{text}</span>
    </Tip>
  );
}
