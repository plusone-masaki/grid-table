# Virtualized Grid Table – Functional Specification

## 1. Overview
The project aims to deliver a high-performance React + TypeScript grid table component that can act as an open-source alternative to Handsontable. The initial milestone focuses on rendering very large datasets with smooth scrolling through virtualized (windowed) rendering, while establishing the baseline behaviours required for subsequent spreadsheet features.

## 2. Goals
- Render datasets with up to 1,000,000 rows and 1,000 columns without perceptible lag.
- Maintain ≤16 ms render budget on scroll to sustain 60 fps.
- Support both vertical and horizontal virtualization, including synchronized scrollbars.
- Provide a declarative React API so host applications can supply data, listen to events, and control the viewport.
- Lay the groundwork for later features (editing, selection, table structure operations) without rework.

## 3. Non-goals (Phase 1)
- Cell editing or formula evaluation.
- Undo/redo and history tracking.
- Column resizing, reordering, or grouping.
- Persistence or remote data loading logic.
- Styling system beyond the baseline needed to validate virtualization (custom themes may come later).

## 4. User Stories
1. As an application developer, I can mount the GridTable component with my dataset and column schema to display millions of cells without freezing the UI.
2. As an end user, I can scroll vertically and horizontally and always see contiguous rows/columns with no blank gaps or flicker.
3. As an end user, the grid reacts to fast scroll gestures (mouse wheel, trackpad fling, scrollbar drag, PgUp/PgDn) while keeping the content and headers synchronized.
4. As an accessibility-conscious user, I can navigate with keyboard arrow keys to move the virtual viewport even before full cell focus/selection is available.

## 5. Data & API Requirements
- `headerType?: ColumnPreset`
  - Header generation strategy (default: `'alpha'`):
    - `'alpha'`: auto-generate headers A, B, C…
    - `'numeric'`: auto-generate headers 1, 2, 3…
    - `'headers'`: consume `data[0]` as the header row. The row is excluded from the rendered body; empty header cells fall back to alphabetical labels.
- `frozenColumnCount?: number`
  - Number of leading columns to freeze when using presets.
- `overscan?: { rows?: number; columns?: number }` (default: 5 rows, 2 columns)
- `onViewportChange?: (viewport: ViewportRange) => void`
- `initialScrollPosition?: { top?: number; left?: number }`
- `className?: string` / `style?: React.CSSProperties`
  - Optional presentation hooks for host applications integrating the library.

### 5.2 Types (conceptual)
- `GridRow` – array or record of cell values. Keys correspond to column IDs inferred from the dataset.
- `ViewportRange` – `{ rowStart: number; rowEnd: number; columnStart: number; columnEnd: number; top: number; left: number }`.
- `ComputedColumnMetrics` (internal TypeScript type) – `{ id: string; width: number; offset: number; isFrozen: boolean }`.
- `ComputedRowMetrics` – `{ height: number }` representing the uniform row height computed internally.
- `ColumnPreset` – `'alpha' | 'numeric' | 'headers'`.
- These interfaces live in `src/types/grid.ts` and must stay consistent with this specification; updates to one require updating the other.

### 5.3 Data Assumptions
- All rows share a uniform height unless future features override per-row measurements.
- Column widths are computed internally based on content heuristics; consumers cannot override widths via props. Heuristics include header text measurement and sampling up to N body rows (configurable internally only).
- Row height follows the same principle: measured from typography heuristics (header + sample rows), clamped to `MIN_ROW_HEIGHT` / `MAX_ROW_HEIGHT`, and not overrideable from the outside.
- When `headerType === 'headers'`, the component treats the first row of `data` as header labels. Rendering only includes rows `data.slice(1)`.
- Dataset is considered immutable for phase 1; re-render is triggered when props change.

## 6. Functional Behaviour
### 6.1 Rendering
- The viewport renders only visible rows/columns plus overscan margins.
- The scrollable viewport stretches to the height supplied by the parent container; the component itself does not enforce a fixed pixel height.
- Cell content placeholders are shown immediately; cell value retrieval must be synchronous in phase 1.
- Headers (top and left) remain in sync with scrolling and are virtualized if needed.
- Frozen columns (if `isFrozen`) remain fixed while the rest of the grid scrolls horizontally.
 - 先頭列に行番号を常時表示する。行番号列は凍結扱いで左端に固定し、ビューポート内の行インデックス（1 始まり）を表示する。
- Header presets operate as follows:
  - `'alpha'`: header labels follow spreadsheet-style alphabetical increments.
  - `'numeric'`: header labels increment numerically.
  - `'headers'`: header labels come directly from `data[0]`, with blank values falling back to alphabetical labels.

### 6.2 Scrolling
- Scroll container exposes native scrollbars.
- Reacts to wheel, touchpad, keyboard (↑ ↓ ← → PgUp PgDn Home End), and scrollbar drag events.
- Applies bouncing guardrails to prevent negative indices or overshooting total counts.
- On every scroll, compute visible row/column window and trigger re-render with new slice.
- Fires `onViewportChange` after throttling to animation frame to avoid excessive callbacks.

### 6.3 Keyboard navigation
- Arrow keys and PgUp/PgDn adjust the scroll position by one row/column or viewport height.
- Home/End jump to start/end of dataset.
- Virtual focus ring (placeholder) is acceptable until cell selection is implemented.

### 6.4 Column & Row Metrics
- At mount and whenever `data` or `headerType` change, the grid measures header cells and the first `sampleRowCount` body rows to determine column widths.
- Row height is derived from typography metrics (header text + sampled cells) and cached as a single value (`ComputedRowMetrics.height`).
- Width calculation clamps to internal `MIN_COLUMN_WIDTH` / `MAX_COLUMN_WIDTH`; row height clamps to `MIN_ROW_HEIGHT` / `MAX_ROW_HEIGHT`.
- Computed metrics are cached and diffed to avoid unnecessary renders, and shared with virtualization logic.
- When asynchronous measurement is required (e.g., font loading), placeholders use interim baseline metrics until measurement resolves.
- For `'headers'`, metrics leverage the extracted header row alongside body samples to ensure consistent sizing.
- 行番号列の幅は行数に応じた文字幅を内部で算出し、常に可視化する（横スクロールしても消えない）。

### 6.5 Accessibility
- The grid container uses ARIA roles (`role="grid"`) and exposes visible row/column counts via `aria-rowcount` and `aria-colcount`.
- Ensure tabbable entry point; use `tabIndex=0` on the scroll container.
- Provide assistive text for users when data is loading or when no data is available.

### 6.6 Empty and Loading States
- When `data.length === 0`, render an empty state message inside the grid frame.
- Future async loading will display a spinner overlay (placeholder spec; implementation deferred).

## 7. Performance Requirements
- Vertical scrolling of 100k rows must stay under 16 ms per frame on a mid-tier laptop (Chrome 120+).
- Horizontal scrolling across 200 columns must remain smooth; overscan renders at most +20% extra cells.
- React component renders must avoid re-rendering off-screen cells by leveraging memoization keyed by row/column indices.
- Avoid measuring DOM synchronously; precompute height/width from props or configuration.

## 8. Error Handling
- Throw descriptive errors when `data` is empty while `headerType === 'headers'`, or when inferred column IDs differ between rows.
- Validate prop types in development using TypeScript (planned) or PropTypes fallback.
- Guard against negative scroll positions and dataset bounds internally.

## 9. Extension Points & Future Work
- Editing: integrate cell editors while preserving virtualization boundaries.
- Selection: share the viewport state with selection manager.
- Table operations: row/column insertion must trigger virtualization recalculation.
- Async data: support function-based cell retrieval with loading indicators.
- Theming: allow custom CSS variables / className injection.

## 10. Milestone Acceptance Criteria
1. Demo page renders 1,000,000 rows × 100 columns without exceeding 200 ms initial load.
2. Scroll interactions produce no white gaps or visible reflow jank.
3. `onViewportChange` emits accurate indices consistent with rendered cells.
4. Storybook or sandbox example demonstrates horizontal + vertical virtualization, frozen column, keyboard navigation.
5. Auto column width measurement handles heterogeneous content, including extreme wide/narrow values, without breaking viewport calculations.
6. Row height measurement adapts to text-heavy datasets without clipping or excessive whitespace.
7. Column presets (`'alpha'`, `'numeric'`, `'headers'`) behave as specified, with `'headers'` excluding the first row from the rendered body.
8. Vitest + React Testing Library cover viewport calculation logic, overscan clamping, keyboard scroll behaviour, and column/row metrics computation.
