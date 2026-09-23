# 001 — Motion pass (audit 2026-09-23)

Scope: `src/styles/*.css`, overlay hosts, toast store. No new libraries.

## Tokens (tokens.css)
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`
- `--dur-press: 160ms; --dur-fast: 150ms; --dur-pop: 180ms; --dur-view: 180ms; --dur-overlay: 260ms; --dur-exit: 180ms`

## Fixes
1. Exit animations — Drawer, Modal, Toast keep mounted with `data-closing` for `--dur-exit`, then unmount. Exit = ease-out, opacity + small translate (drawer 24px x, modal 6px y + scale .985, toast 6px y).
2. `.search-pop` — `animation: none`.
3. `.view` — `viewIn var(--dur-view) var(--ease-out)`, translateY(4px).
4. Replace every entrance `ease` with `var(--ease-out)`; hover colour changes keep `ease`.
5. Remove `transition: all` — list properties.
6. Press: `.btn, .board-card, .learn-card, .dt-row.click, .item.click, .stage-chip:active { transform: scale(0.97–0.99) }`, `transition: transform var(--dur-press) var(--ease-out)`.
7. `.popover { transform-origin: top right }`.
8. Reduced motion: drop transforms, keep opacity fades ≤150ms; hover lifts gated by `(hover: hover) and (pointer: fine)`.
9. Meters: 600ms, keyframe only on first mount.
10. Theme switch: `html.theme-fade *` colour transitions for 200ms.

## Verify
DevTools → Animations panel at 10% speed: drawer/modal/toast in and out, popover grows from its trigger, ⌘K is instant, reduced-motion emulation keeps fades.
