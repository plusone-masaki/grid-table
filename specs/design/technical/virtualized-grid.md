# Virtualized Grid Table – Technical Specification

## 1. Architecture Overview
- **Rendering layer**: React + TypeScript function components (`GridTable`, `GridViewport`, `GridRow`, `GridCell`) manage DOM output.
- **Virtualization engine**: A custom hook `useVirtualization` calculates visible row/column windows and scroll offsets based on container dimensions and scroll positions.
- **State management**: Local component state with `useState`/`useReducer`; external props remain the single source of truth for data.
- **Measurement**: Container size observed via `ResizeObserver`; scroll offsets read from the scroll container (`scrollTop`, `scrollLeft`).
- **Layout**: CSS Grid for headers and body alignment; inner body uses a single absolutely positioned `<div>` with translated slices to avoid layout thrash.

## 2. Component Tree
```
<GridTable>
  <GridHeaderRow> (column headers, optional freeze handling)
  <GridBodyScrollContainer>
    <GridBodyInner> (absolute positioned, renders visible rows)
      <GridRow>*
        <GridCell>*
```

## 3. Virtualization Strategy
- Rows: consume the computed row height from `useRowMetrics`. Divide `scrollTop` by this value to derive row indices.
- Columns: resolve preset or explicit column definitions before generating metrics. When using presets, derive column keys from the header row (`'headers'`) or the first data row (`'alpha'` / `'numeric'`), then compute cumulative widths and offsets. Determine `columnWindow` by binary searching the offsets array against `scrollLeft` and viewport width.
  - 行番号列は別途メトリクスを算出し、常に可視・凍結状態とする。水平スクロールの対象はデータ列のみで、行番号列は sticky で左端に貼り付ける。
- Apply overscan to reduce blanking during fast scrolls while clamping to dataset bounds.
- Maintain `contentHeight = totalRows * rowMetrics.height` and `contentWidth = columnMetrics.at(-1)?.offset + columnMetrics.at(-1)?.width ?? 0`.
- Use CSS transform (`translateY`, `translateX`) to position visible slice relative to total scroll offset; horizontal translate uses the accumulated offset up to `columnWindow.start`.
- Store the last render's window; only re-render when window indices change.
- For frozen columns, render them in a separate layer within the same row to prevent unnecessary reflow.

- `useColumnPreset({ headerType, data, frozenColumnCount })`
  - Normalises the `headerType` preset into resolved column descriptors, extracts the header row when using `'headers'`, applies the `frozenColumnCount` fallback、かつ行番号列を自動追加する。
- `useColumnMetrics({ columns, data })`
  - Measures header content synchronously, samples the first `sampleRowCount` rows for body content, clamps widths within `[MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH]`, and returns `ComputedColumnMetrics[]`.
  - Exposes `isMeasuring` flag so the renderer can show interim placeholder widths.
- `useRowMetrics({ columns, data })`
  - Evaluates typography heuristics (maximum line length, presence of multi-byte characters) across headers and sample rows to determine a uniform row height within `[MIN_ROW_HEIGHT, MAX_ROW_HEIGHT]`.
  - Returns `{ height, isMeasuring }`.
- `useVirtualization({ totalRows, totalColumns, rowMetrics, columnMetrics, overscan })`
  - Returns `{ rowWindow, columnWindow, columnMetrics, rowMetrics, contentSize, onScroll, scrollTo }`.
  - `onScroll` throttled with `requestAnimationFrame`.
  - Handles clamping (0 ≤ start ≤ end ≤ total).
- `useResizeObserver(ref, handler)` Monitor container size to re-evaluate visible counts.
- Utility `clampWindow(start, count, total)` for bounds checking, covered by unit tests.
- Utility `binarySearchOffset(offsets, value)` to resolve column indices from cumulative offsets.

## 5. Scroll Synchronization
- Scroll container uses native scrollbars; `onScroll` updates virtualization state.
- Header horizontal scroll linked via `scrollLeft` sync (use `useLayoutEffect` to mirror value).
- Programmatic scroll uses `scrollTo({ top, left, behavior })` with `behavior: 'auto'` to avoid platform-specific glitches.

## 6. Styling & Layout
- Root container establishes a CSS grid: fixed header row, flexible body row.
- Body adopts `overflow: auto` and stretches to fill the available height supplied by the parent container.
- Inner body uses `position: relative` with `height`/`width` sized to full content (`contentHeight`, `contentWidth`) to ensure scrollbar fidelity.
- Each `GridRow` uses `display: flex` to minimize DOM depth; cells share class names for styling.
- Provide CSS variables: `--grid-row-height` and optional `--grid-default-column-width`; per-column widths apply inline styles or data attributes for frozen columns.

## 7. Keyboard Handling
- Attach keydown listener to scroll container.
- Map keys to `scrollTop`/`scrollLeft` adjustments (arrow keys: ±rowMetrics.height / current column width, PgUp/PgDn: viewportHeight/width).
- Prevent default behaviour when custom scroll applied to avoid double movement.
- Wrap handler in `useCallback` and memoize dependencies.

## 8. Error & Edge Case Handling
- If `totalRows` or `totalColumns` is 0, skip virtualization calculations and render empty state.
- Guard against non-integer heights/widths; coerce to numbers.
- If dataset size changes, reset scroll position to top-left unless `preserveScroll` flag is introduced later.

## 9. Testing Strategy
- Unit tests for `useVirtualization`:
  - window calculations for various scroll offsets,
  - overscan clamping,
  - frozen column segmentation.
- Unit tests for `useColumnMetrics`:
  - header/body measurement fallback when content is shorter than minimum width,
  - extreme cases with very long text or very narrow content ensuring clamping works,
  - stability when dataset updates without altering column definitions.
- Unit tests for `useRowMetrics`:
  - datasets with varying character widths (ASCII / CJK) produce expected height within bounds,
  - extremely long strings increase height while respecting `MAX_ROW_HEIGHT`,
  - empty dataset returns baseline height.
- Unit tests for column presets:
  - `'alpha'` / `'numeric'` generate deterministic labels even as dataset shape changes,
  - `'headers'` extracts labels from `data[0]`, drops the first row from the rendered body, and falls back to alphabetical labels for blank cells,
  - explicit column definitions bypass the preset logic and honour pre-set `isFrozen` flags.
- Integration tests via React Testing Library:
  - Render 10,000-row dataset and assert only visible rows exist in DOM,
  - Simulate scroll event and verify window updates, `onViewportChange` invocation,
  - Keyboard navigation adjusts scroll offsets,
  - Extremely wide column content still renders without horizontal gaps (validating virtualization + metrics coupling),
  - Switching between presets at runtime updates headers without unmounting the grid.
- Visual regression (future): use Playwright screenshot tests for scroll continuity.

## 10. Performance Budget & Instrumentation
- Use `useEffect` with `performance.now()` instrumentation (development only) to log render durations when virtualization window changes.
- Ensure no synchronous data fetching in scroll handler; keep operations O(1).
- Memoize row and cell components with `React.memo` to prevent prop diffusion.

## 11. Deliverables
- Components: `GridTable`, `GridHeaderRow`, `GridBody`, `GridRow`, `GridCell`.
- Hooks: `useColumnPreset`, `useColumnMetrics`, `useRowMetrics`, `useVirtualization`, `useResizeObserver`.
- Types (stored under `src/types/grid.ts`): `GridDataset`, `GridRow`, `ComputedColumnMetrics`, `ComputedRowMetrics`, `ViewportRange`, `ColumnPreset`, `GridTableProps`.
- Demo page under `src/App.tsx` or Storybook entry showing million-row rendering.
- Test suite under `src/__tests__/` verifying virtualization logic.

## Coding Standards

- CSS プロパティはアルファベット順に並べること。
