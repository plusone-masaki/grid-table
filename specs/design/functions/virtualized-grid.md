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
### 5.1 Props
- `data: GridDataset`
  - Abstracts the table data. The initial implementation accepts an in-memory array of rows (`Array<GridRow>`), but the API must anticipate lazy data loaders (function-based access) for later phases.
- `columns: GridColumnDefinition[]`
  - Contains column metadata (id, header label, width, fixed column flag).
- `rowHeight?: number` (default: 32 px)
- `defaultColumnWidth?: number` (default: 120 px) – applied when a column definition omits `width`.
- `overscan?: { rows?: number; columns?: number }` (default: 5 rows, 2 columns)
- `onViewportChange?: (viewport: ViewportRange) => void`
- `initialScrollPosition?: { top?: number; left?: number }`

### 5.2 Types (conceptual)
- `GridRow` – array or record of cell values.
- `GridColumnDefinition` – `{ id: string; header: string; width?: number; isFrozen?: boolean }`.
- `ViewportRange` – `{ rowStart: number; rowEnd: number; columnStart: number; columnEnd: number; top: number; left: number }`.

### 5.3 Data Assumptions
- All rows share a uniform height unless future features override per-row measurements.
- Column widths can vary per column; unspecified widths fallback to `defaultColumnWidth`.
- Dataset is considered immutable for phase 1; re-render is triggered when props change.

## 6. Functional Behaviour
### 6.1 Rendering
- The viewport renders only visible rows/columns plus overscan margins.
- Cell content placeholders are shown immediately; cell value retrieval must be synchronous in phase 1.
- Headers (top and left) remain in sync with scrolling and are virtualized if needed.
- Frozen columns (if `isFrozen`) remain fixed while the rest of the grid scrolls horizontally.

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

### 6.4 Accessibility
- The grid container uses ARIA roles (`role="grid"`) and exposes visible row/column counts via `aria-rowcount` and `aria-colcount`.
- Ensure tabbable entry point; use `tabIndex=0` on the scroll container.
- Provide assistive text for users when data is loading or when no data is available.

### 6.5 Empty and Loading States
- When `data.length === 0`, render an empty state message inside the grid frame.
- Future async loading will display a spinner overlay (placeholder spec; implementation deferred).

## 7. Performance Requirements
- Vertical scrolling of 100k rows must stay under 16 ms per frame on a mid-tier laptop (Chrome 120+).
- Horizontal scrolling across 200 columns must remain smooth; overscan renders at most +20% extra cells.
- React component renders must avoid re-rendering off-screen cells by leveraging memoization keyed by row/column indices.
- Avoid measuring DOM synchronously; precompute height/width from props or configuration.

## 8. Error Handling
- Throw descriptive errors when `data` or `columns` have mismatching lengths or missing `id`.
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
5. Vitest + React Testing Library cover viewport calculation logic, overscan clamping, and keyboard scroll behaviour.
