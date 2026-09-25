/** Marks presenter tooling (ui-direction §4.3), so it is never mistaken for the product. */
export function DemoTag({ title = 'Demo control, not part of the product' }: { title?: string }) {
  return <span className="demo-chip" title={title}>Demo</span>;
}
