# Virtualized Grid Table – Technical Specification

## 1. Architecture Overview
- **Rendering layer**: A single React + TypeScript function component (`GridTable`) renders the headers, row index, and body.
- **Virtualization engine**: A custom hook (`useVirtualGrid`) derives the visible window from the container size and scroll offsets.
- **State management**: External props remain the source of truth; internal state relies on minimal `useMemo` / `useState` usage.
- **Measurement**: `useResizeObserver` tracks viewport size, while `useColumnMetrics` and `useRowMetrics` measure column widths and row heights via heuristics.
- **Layout**: Three `<table>` elements (header, row index, body) sit in an absolutely positioned container and stay aligned through sticky positioning.

## 2. Component Tree
`GridTable` renders a single section element with the class `grid-table`. Inside that section, a scrollable div (`grid-table__scroll`) owns all virtualization state and wires the `onScroll` handler. The div contains three absolutely positioned spacer wrappers (`grid-table__spacer`). Each wrapper hosts one table: the header table (`grid-table__table --header`), the row index table (`grid-table__table --number`), and the main data table (`grid-table__table --master`). Every table shares the same column and row slices so that the header cells, row numbers, and body cells stay aligned while scrolling. Sticky positioning ensures the header remains at the top and the row index column remains on the left.

## 3. Virtualization Strategy
- When `rowCount === 0` or `columnMetrics.length === 0`, `useVirtualGrid` returns an empty range with zero offsets so the renderer can short-circuit to empty states.
- Rows:
  - Derive `viewportRowCapacity` as `ceil(viewportHeight / rowHeight)` whenever a measured height is available; fall back to rendering the entire dataset until the observer reports dimensions.
  - Compute `tentativeRowStart = floor(scrollTop / rowHeight)`, subtract `overscan.rows` (default 5), and clamp the result to `[0, rowCount - 1]`.
  - Determine `rowEnd` as `rowStart + viewportRowCapacity + overscan.rows * 2`, clamped to `[0, rowCount]`. The value is exclusive, and `offsetTop` is `rowStart * rowHeight`.
- Columns:
  - Run the `findColumnIndex` helper (binary search) to locate the first column whose right edge exceeds `scrollLeft`.
  - Use the measured viewport width when available; otherwise fall back to `contentWidth` so initial renders still calculate a window. Compute `viewportRight = scrollLeft + viewportWidth`.
  - Walk forward from `columnStart` while each column's right edge remains left of `viewportRight`. Clamp the resulting `columnEnd` so at least one column is returned.
  - Apply `overscan.columns` (default 2) on the start/end indices and clamp to dataset bounds. If `scrollLeft <= 0`, force the start index and `offsetLeft` to `0`. If the viewport reaches or surpasses `contentWidth`, force the end index to `columnMetrics.length`.
  - Derive `offsetLeft` from the offset of the first rendered column and clamp it between `0` and `contentWidth - viewportWidth`.
- The row index column stays sticky outside of the metric array; it renders alongside the same row slice but is not part of the computed column window.
- `contentHeight` equals `rowCount * rowHeight`. `contentWidth` is sourced from the final column metric (`offset + width`) and sizes the absolute spacer layers.
- `useVirtualGrid` returns `{ range, contentWidth, contentHeight, handleScroll, scrollTop, scrollLeft }`, where `range` contains `rowStart`, `rowEnd`, `columnStart`, `columnEnd`, `offsetTop`, and `offsetLeft`.
- `resolveColumnKeys` infers column keys from the dataset and `resolveHeaderLabel` supplies header strings according to the preset (alpha / numeric / headers). The row index column is not part of this list and is rendered separately as a `<th>`.
- `useColumnMetrics({ columns, data, sampleSize = 50 })` inspects the headers and the first 50 rows, estimates width as `textLength * 8 + 24`, clamps to `[80, 320]`, and returns metrics `{ id, width, offset, isFrozen }`.
- `useRowMetrics({ columns, data, sampleSize = 50 })` looks at the maximum character count across headers and sampled rows, starts from `BASE_ROW_HEIGHT = 22`, adds 12 px for every 30 characters, and clamps the height to `[22, 80]`.
- `useResizeObserver(ref)` tracks the scroll container's `clientWidth` / `clientHeight` and feeds those values into the visible window calculation.

## 5. Scroll Synchronization
- The scroll container uses native scrollbars and routes `onScroll` directly to `handleScroll`.
- `handleScroll` recomputes the `range` on every event via `useVirtualGrid` and fires `onViewportChange` immediately.
- The header, row index, and data tables all consume the same `range` data (`renderColumns` / `renderRows`) to stay aligned.

## 6. Styling & Layout
- The root `.grid-table` section uses flex layout to reserve vertical space for the scroll region.
- `.grid-table__scroll` is an `overflow: auto` div containing three absolutely positioned `.grid-table__spacer` wrappers.
- Each table uses `table-layout: fixed` with a `colgroup` so column widths match the metrics from `useColumnMetrics`.
- Row index cells render with `position: sticky; left: 0` and bold typography, while header stacking is managed through explicit `z-index` values.
- Cell horizontal padding is 4 px, the row index column shares consistent insets, and spacer rows are transparent cells sized only by height.

## 7. Keyboard Handling
- Keyboard events are not yet implemented; scrolling currently depends on pointer devices and will be extended alongside future cell-selection work.

## 8. Error & Edge Case Handling
- If `totalRows` or `totalColumns` is 0, skip virtualization calculations and render empty state.
- Guard against non-integer heights/widths; coerce to numbers.
- If dataset size changes, reset scroll position to top-left unless `preserveScroll` flag is introduced later.

## 9. Testing Strategy
- Unit tests for `useVirtualGrid`:
  - verify `range` calculations for different scroll offsets across rows and columns
  - ensure overscan clamping respects dataset bounds
  - confirm `contentWidth` and `contentHeight` mirror the totals derived from the metrics
- Unit tests for `useColumnMetrics`:
  - assert the estimated widths clamp to `[80, 320]`
  - verify that adjusting the sample size influences width calculation
  - ensure null or empty cells resolve to the minimum width
- Unit tests for `useRowMetrics`:
  - confirm the character-count heuristic produces the expected height adjustments
  - ensure an empty dataset returns the baseline 22 px height
- Unit tests for header preset helpers:
  - check that `'alpha'` and `'numeric'` generate deterministic sequences
  - verify that `'headers'` uses the first data row for labels and omits it from the body
- Integration tests via React Testing Library:
  - render large datasets and confirm only visible cells mount
  - simulate scroll events and assert `onViewportChange` fires on every scroll
  - ensure the row index column remains visible during horizontal scroll
  - confirm the empty-state message appears when `data.length === 0`
- Visual regression (future): use Playwright screenshot tests for scroll continuity.

## 10. Performance Budget & Instrumentation
- Use `useEffect` with `performance.now()` instrumentation (development only) to log render durations when the virtualization window changes.
- Ensure no synchronous data fetching occurs in the scroll handler; keep operations O(1).
- Memoize row and cell components with `React.memo` to prevent unnecessary prop diffusion.

## 11. Deliverables
- Components: `GridTable` encapsulating the header, row index, and body tables.
- Hooks: `useColumnMetrics`, `useRowMetrics`, `useVirtualGrid`, `useResizeObserver`.
- Utility functions: `resolveColumnKeys`, `resolveHeaderLabel`, `toColumnHeader`, `findColumnIndex`.
- Types (stored under `src/types/grid.ts`): `GridDataset`, `GridRow`, `ComputedColumnMetrics`, `ComputedRowMetrics`, `ViewportRange`, `ColumnPreset`, `GridTableProps`.
- Demo page under `src/App.tsx` or a Storybook entry showcasing million-row rendering.
- Test suite under `src/__tests__/` verifying virtualization logic.

## Coding Standards

- List CSS properties in alphabetical order.
