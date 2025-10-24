# Virtualized Grid Table – Core Design Brief

## Purpose
GridTable exposes a virtualized spreadsheet-style view that can display very large datasets without freezing the UI. The component is implemented with React 18 + TypeScript and is intended to serve as the foundation for future spreadsheet features (editing, selection, structure operations).

## Guiding Principles
- **Always virtualize** – render only the visible window plus a small overscan buffer so scrolling stays smooth even with millions of rows or hundreds of columns.
- **Self-measured layout** – derive column widths and row height from content heuristics rather than accepting external overrides.
- **Frozen row index** – the leading column always shows 1-based row numbers and stays fixed while horizontally scrolling.
- **Predictable API** – provide a minimal, declarative surface area that host applications can compose without bespoke configuration.
- **Graceful fallbacks** – when no data is provided, render a single blank cell so layout, metrics, and aria attributes remain stable.

## Public API Snapshot
- `data?: GridDataset` – defaults to a single blank row (`[['']]`). Empty arrays are normalised to the same fallback.
- `headerType?: 'alpha' | 'numeric' | 'headers'` (default `'alpha'`) – controls header labelling.
- `overscan?: { rows?: number; columns?: number }` – optional tuning for the virtual window (defaults: rows 5, columns 2).
- `onViewportChange?: (viewport: ViewportRange) => void` – called on every scroll with the current virtual window.
- `className?: string` / `style?: React.CSSProperties` – presentation hooks for host applications.
- `initialScrollPosition?` is reserved for future work; the prop is defined but not yet applied.

Types referenced above live in `src/types/grid.ts` and are kept as the single source of truth.

## Rendering Model
- The component renders a `section.grid-table` containing a scrollable div and three stacked `<table>` elements (header, row index, body) that share the same virtual window slices.
- Column metrics are derived from header text and the first 50 body rows (`width = clamp(textLength * 8 + 24, 80, 320)`).
- Row height is computed from the maximum character count across headers and sample rows (`base 22 px`, +12 px per additional ~30 characters, clamped to `[22, 80]`).
- The row index column width is calculated from the maximum row number length (`maxLength * 9.6 + 24`, minimum 48 px).
- When `headerType === 'headers'`, the first dataset row is treated as the header row and excluded from the rendered body unless the dataset is empty (in which case the blank fallback row is used).

## Interaction & Scroll Behaviour
- The scroll container uses native scrollbars and reports `onScroll` directly to the virtualization hook.
- `useVirtualGrid` computes the visible row/column window, applies overscan, clamps the result to dataset bounds, and emits the `ViewportRange`.
- Wheel, touchpad, and scrollbar drags are supported. Keyboard navigation will be introduced in a later milestone.

## Performance & Quality Guardrails
- Target ≤16 ms per frame during scroll on mid-tier hardware; avoid synchronous layout thrash by relying on cached metrics.
- Memoize row and column slices to prevent unnecessary React renders; render only visible cells plus overscan.
- Keep `data` immutable for phase 1—updates should come through prop changes rather than in-place mutation.

## Non-Goals (Current Phase)
- Cell editing, formulas, undo/redo, or history tracking.
- Column/row restructuring (resize, reorder, insert, delete).
- Remote data loading, persistence, or theming beyond the default styling.

## Future Opportunities
- Inline editors that respect virtualization boundaries.
- Rich selection model and keyboard navigation.
- Table structure operations that trigger metric recalculation.
- Import/export pipelines and theming hooks once the core grid stabilises.
