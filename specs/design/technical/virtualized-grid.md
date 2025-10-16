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
- Rows: compute `rowWindow` from `scrollTop`, dividing by `rowHeight` (uniform for phase 1).
- Columns: support variable widths by precomputing cumulative offsets (`prefixWidths`). Determine `columnWindow` by binary searching the prefix array against `scrollLeft` and viewport width.
- Apply overscan to reduce blanking during fast scrolls while clamping to dataset bounds.
- Maintain `contentHeight = totalRows * rowHeight` and `contentWidth = sum(columnWidths)`.
- Use CSS transform (`translateY`, `translateX`) to position visible slice relative to total scroll offset; horizontal translate uses the accumulated width up to `columnWindow.start`.
- Store the last render's window; only re-render when window indices change.
- For frozen columns, render them in a separate layer within the same row to prevent unnecessary reflow.

## 4. Hooks & Utilities
- `useVirtualization({ totalRows, totalColumns, rowHeight, columnWidths, defaultColumnWidth, overscan })`
  - Returns `{ rowWindow, columnWindow, columnOffsets, contentSize, onScroll, scrollTo }`.
  - `onScroll` throttled with `requestAnimationFrame`.
  - Handles clamping (0 ≤ start ≤ end ≤ total).
- `useResizeObserver(ref, handler)` Monitor container size to re-evaluate visible counts.
- Utility `clampWindow(start, count, total)` for bounds checking, covered by unit tests.

## 5. Scroll Synchronization
- Scroll container uses native scrollbars; `onScroll` updates virtualization state.
- Header horizontal scroll linked via `scrollLeft` sync (use `useLayoutEffect` to mirror value).
- Programmatic scroll uses `scrollTo({ top, left, behavior })` with `behavior: 'auto'` to avoid platform-specific glitches.

## 6. Styling & Layout
- Root container establishes a CSS grid: fixed header row, flexible body row.
- Body adopts `overflow: auto`.
- Inner body uses `position: relative` with `height`/`width` sized to full content (`contentHeight`, `contentWidth`) to ensure scrollbar fidelity.
- Each `GridRow` uses `display: flex` to minimize DOM depth; cells share class names for styling.
- Provide CSS variables: `--grid-row-height` and optional `--grid-default-column-width`; per-column widths apply inline styles or data attributes for frozen columns.

## 7. Keyboard Handling
- Attach keydown listener to scroll container.
- Map keys to `scrollTop`/`scrollLeft` adjustments (arrow keys: ±rowHeight / current column width, PgUp/PgDn: viewportHeight/width).
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
- Integration tests via React Testing Library:
  - Render 10,000-row dataset and assert only visible rows exist in DOM,
  - Simulate scroll event and verify window updates, `onViewportChange` invocation,
  - Keyboard navigation adjusts scroll offsets.
- Visual regression (future): use Playwright screenshot tests for scroll continuity.

## 10. Performance Budget & Instrumentation
- Use `useEffect` with `performance.now()` instrumentation (development only) to log render durations when virtualization window changes.
- Ensure no synchronous data fetching in scroll handler; keep operations O(1).
- Memoize row and cell components with `React.memo` to prevent prop diffusion.

## 11. Deliverables
- Components: `GridTable`, `GridHeaderRow`, `GridBody`, `GridRow`, `GridCell`.
- Hooks: `useVirtualization`, `useResizeObserver`.
- Types: `GridDataset`, `GridRow`, `GridColumnDefinition`, `ViewportRange`.
- Demo page under `src/App.tsx` or Storybook entry showing million-row rendering.
- Test suite under `src/__tests__/` verifying virtualization logic.
