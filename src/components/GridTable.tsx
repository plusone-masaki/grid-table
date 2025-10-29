import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from 'react'
import type {
  PointerEvent as ReactPointerEvent,
} from 'react'
import useColumnMetrics, {
  type ColumnDefinitionInput as ColumnMetricsInput,
} from '../hooks/useColumnMetrics'
import useRowMetrics from '../hooks/useRowMetrics'
import useHeaderSelection from '../hooks/useHeaderSelection'
import useSelectionControls from '../hooks/useSelectionControls'
import useVirtualGrid from '../hooks/useVirtualGrid'
import {
  type ColumnPreset,
  type GridDataset,
  type CellCoordinate,
  type GridRow,
  type GridTableProps,
  type SelectionRectangle,
} from 'types/grid'
import {
  DEFAULT_OVERSCAN,
  EMPTY_DATASET_FALLBACK,
  HEADER_HEIGHT,
  MIN_ROW_HEIGHT,
  MIN_ROW_INDEX_WIDTH,
  ROW_INDEX_CHAR_WIDTH,
  ROW_INDEX_PADDING,
} from '../constants/grid-table'
import type GridTableHandle from '../types/grid-table'
import GridTableBody from './GridTableBody'
import GridTableHeader from './GridTableHeader'
import GridTableRowIndex from './GridTableRowIndex'
import CellSelection from './CellSelection'
import './GridTable.css'

const SELECTION_BORDER_OFFSET = 1

type ResolvedColumn = ColumnMetricsInput

const toColumnHeader = (index: number): string => {
  let result = ''
  let num = index

  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }

  return result
}

const resolveColumnKeys = (
  headerRow: GridRow | undefined,
  rows: GridDataset,
): string[] => {
  if (headerRow) {
    return Object.keys(headerRow)
  }

  if (rows.length > 0) {
    return Object.keys(rows[0])
  }

  return []
}

const resolveHeaderLabel = (
  preset: ColumnPreset,
  index: number,
  columnKey: string,
  headerRow?: GridRow,
): string => {
  if (preset === 'numeric') {
    return String(index + 1)
  }

  if (preset === 'headers') {
    const rawValue = headerRow?.[columnKey]
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return toColumnHeader(index)
    }
    return String(rawValue)
  }

  return toColumnHeader(index)
}

const GridTableComponent = (
  {
    data: rawData = EMPTY_DATASET_FALLBACK,
    headerType = 'alpha',
    overscan,
    className,
    style,
  }: GridTableProps,
  ref: ForwardedRef<GridTableHandle>,
) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const editingValueRef = useRef('')
  const { headerRow, bodyRows } = useMemo(() => {
    if (headerType === 'headers' && rawData.length > 0) {
      const [firstRow, ...restRows] = rawData
      return {
        headerRow: firstRow,
        bodyRows: restRows,
      }
    }

    if (rawData.length === 0) {
      return {
        headerRow: undefined,
        bodyRows: EMPTY_DATASET_FALLBACK,
      }
    }

    return {
      headerRow: undefined,
      bodyRows: rawData,
    }
  }, [headerType, rawData])
  const headerSelectionApiRef = useRef<{
    reset: () => void
    sync: (anchor: CellCoordinate) => void
  }>({
    reset: () => {},
    sync: () => {},
  })
  const selectionUpdateRef = useRef<
    (anchor: CellCoordinate, focus: CellCoordinate) => void
  >(() => {})
  const handleHeaderAnchorSync = useCallback(
    (anchor: CellCoordinate) => {
      headerSelectionApiRef.current.sync(anchor)
    },
    [],
  )
  const handleHeaderReset = useCallback(() => {
    headerSelectionApiRef.current.reset()
  }, [])

  const resolvedColumns: ResolvedColumn[] = useMemo(() => {
    const columnKeys = resolveColumnKeys(headerRow, bodyRows)

    return columnKeys.map((key, index) => ({
      id: key,
      header: resolveHeaderLabel(headerType, index, key, headerRow),
      isFrozen: false,
    }))
  }, [headerType, headerRow, bodyRows])
  const [internalRows, setInternalRows] = useState<GridDataset>(bodyRows)
  const [editingCell, setEditingCell] = useState<CellCoordinate | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [
    recentSampleRowIndex,
    setRecentSampleRowIndex,
  ] = useState<number | null>(null)
  const prioritySampleRows = useMemo(
    () => (recentSampleRowIndex === null ? undefined : [recentSampleRowIndex]),
    [recentSampleRowIndex],
  )
  const previousBodyRowsRef = useRef(bodyRows)
  useEffect(() => {
    if (previousBodyRowsRef.current === bodyRows) {
      return
    }

    previousBodyRowsRef.current = bodyRows
    setInternalRows(bodyRows)
    setEditingCell(null)
    setEditingValue('')
    editingValueRef.current = ''
    setRecentSampleRowIndex(null)
  }, [bodyRows])

  const columnMetrics = useColumnMetrics({
    columns: resolvedColumns,
    data: internalRows,
    priorityRowIndices: prioritySampleRows,
  })
  const rowMetrics = useRowMetrics({
    columns: resolvedColumns.map(({ id, header }) => ({ id, header })),
    columnMetrics,
    data: internalRows,
    priorityRowIndices: prioritySampleRows,
  })
  const { heights: rowHeights, offsets: rowOffsets } = rowMetrics
  const fallbackRowHeight =
    rowHeights.find((height) => Number.isFinite(height) && height > 0) ??
    MIN_ROW_HEIGHT

  const {
    range,
    contentWidth,
    contentHeight,
    handleScroll,
  } = useVirtualGrid({
    rowCount: internalRows.length,
    columnMetrics,
    rowHeights: rowMetrics.heights,
    overscan: overscan ?? DEFAULT_OVERSCAN,
    scrollRef,
  })

  const rowIndexMaxLength = Math.max(1, internalRows.length > 0 ? String(internalRows.length).length : 1)
  const rowIndexMeasuredWidth = rowIndexMaxLength * ROW_INDEX_CHAR_WIDTH + ROW_INDEX_PADDING
  const rowIndexWidth = Math.max(MIN_ROW_INDEX_WIDTH, rowIndexMeasuredWidth)

  const visibleColumns = useMemo(
    () => resolvedColumns.slice(range.columnStart, range.columnEnd),
    [resolvedColumns, range.columnStart, range.columnEnd],
  )

  const visibleColumnMetrics = useMemo(
    () => columnMetrics.slice(range.columnStart, range.columnEnd),
    [columnMetrics, range.columnStart, range.columnEnd],
  )

  const visibleRows = useMemo(
    () => internalRows.slice(range.rowStart, range.rowEnd),
    [internalRows, range.rowStart, range.rowEnd],
  )

  const spacerWidth = range.offsetLeft
  const spacerHeight = range.offsetTop
  const totalRenderedColumns = 1 + visibleColumns.length + (spacerWidth > 0 ? 1 : 0)

  const rowCount = internalRows.length
  const columnCount = resolvedColumns.length
  const totalColumnCount = columnCount + 1

  const commitEditing = useCallback(
    (
      options?: {
        nextSelection?: CellCoordinate | null
        skipSelectionUpdate?: boolean
      },
    ) => {
      if (!editingCell) {
        return
      }

      const column = resolvedColumns[editingCell.columnIndex]
      if (!column) {
        setEditingCell(null)
        setEditingValue('')
        return
      }

      setInternalRows((prevRows) => {
        const targetRow = prevRows[editingCell.rowIndex]
        if (!targetRow) {
          return prevRows
        }

        const currentValue = targetRow[column.id]
        const domValue = editorRef.current ? editorRef.current.value : null
        const nextValue = domValue !== null ? domValue : editingValue
        editingValueRef.current = nextValue
        if (String(currentValue ?? '') === nextValue) {
          return prevRows
        }

        const nextRows = [...prevRows]
        nextRows[editingCell.rowIndex] = {
          ...targetRow,
          [column.id]: nextValue,
        }
        return nextRows
      })

      const selectionTarget = options?.nextSelection ?? editingCell

      setRecentSampleRowIndex(editingCell.rowIndex)

      setEditingCell(null)
      setEditingValue('')
      editingValueRef.current = ''

      if (!options?.skipSelectionUpdate && selectionTarget) {
        selectionUpdateRef.current(selectionTarget, selectionTarget)
      }
    },
    [
      editingCell,
      editingValue,
      resolvedColumns,
      selectionUpdateRef,
      editorRef,
    ],
  )

  const selectionControls = useSelectionControls({
    rowCount,
    columnCount,
    editingCell,
    commitEditing,
    onAnchorChange: handleHeaderAnchorSync,
    onResetSelection: handleHeaderReset,
  })
  const {
    selectRow,
    selectColumn,
    selectAll,
    selectRowRange,
    selectColumnRange,
    selectionRange,
    normalizedSelectionRange,
    anchorCell,
    activeCell,
    highlightedColumns,
    highlightedRows,
    fullySelectedColumns,
    fullySelectedRows,
    isAllSelected,
    updateSelection,
    handleCellPointerDown,
    handleCellPointerMove,
    handleCellPointerUp,
    handleCellPointerCancel,
  } = selectionControls
  selectionUpdateRef.current = updateSelection

  const {
    handleColumnHeaderPointerDown,
    handleColumnHeaderPointerMove,
    handleColumnHeaderPointerEnd,
    handleRowHeaderPointerDown,
    handleRowHeaderPointerMove,
    handleRowHeaderPointerEnd,
    handleColumnHeaderClick,
    handleRowHeaderClick,
    syncSelectionAnchors,
    resetHeaderSelection,
  } = useHeaderSelection({
    rowCount,
    columnCount,
    selectionRange,
    selectColumn,
    selectRow,
    selectColumnRange,
    selectRowRange,
    selectAll,
  })

  headerSelectionApiRef.current.reset = resetHeaderSelection
  headerSelectionApiRef.current.sync = syncSelectionAnchors

  const startEditing = useCallback(
    (cell: CellCoordinate) => {
      const column = resolvedColumns[cell.columnIndex]
      const row = internalRows[cell.rowIndex]
      if (!column || !row) {
        return
      }

      const rawValue = row[column.id]
      const value = rawValue == null ? '' : String(rawValue)

      updateSelection(cell, cell)
      setEditingCell(cell)
      setEditingValue(value)
      editingValueRef.current = value
    },
    [resolvedColumns, internalRows, updateSelection],
  )

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, columnIndex: number) => {
      startEditing({ rowIndex, columnIndex })
    },
    [startEditing],
  )

  const handleEditorBlur = useCallback(() => {
    commitEditing()
  }, [commitEditing])

  const hasRangeSelection = normalizedSelectionRange !== null &&
    (
      normalizedSelectionRange.topRow !== normalizedSelectionRange.bottomRow ||
      normalizedSelectionRange.leftColumn !== normalizedSelectionRange.rightColumn
    )

  const selectionBounds = useMemo<SelectionRectangle | null>(() => {
    if (normalizedSelectionRange === null) {
      return null
    }

    const { topRow, bottomRow, leftColumn, rightColumn } =
      normalizedSelectionRange

    const leftMetric = columnMetrics[leftColumn]
    const rightMetric = columnMetrics[rightColumn]

    if (!leftMetric || !rightMetric) {
      return null
    }

    const topOffset = rowOffsets[topRow] ?? topRow * fallbackRowHeight
    const bottomOffsetBase = rowOffsets[bottomRow] ?? bottomRow * fallbackRowHeight
    const bottomOffset = bottomOffsetBase + (rowHeights[bottomRow] ?? fallbackRowHeight)
    const top = Math.max(0, HEADER_HEIGHT + topOffset + SELECTION_BORDER_OFFSET)
    const height = Math.max(bottomOffset - topOffset, fallbackRowHeight)
    const left = Math.max(0, rowIndexWidth + leftMetric.offset + SELECTION_BORDER_OFFSET)
    const width = rightMetric.offset + rightMetric.width - leftMetric.offset

    return {
      top,
      left,
      width,
      height,
    }
  }, [
    normalizedSelectionRange,
    columnMetrics,
    rowHeights,
    rowOffsets,
    fallbackRowHeight,
    rowIndexWidth,
  ])

  const editingBounds = useMemo<SelectionRectangle | null>(() => {
    if (!editingCell) {
      return null
    }

    const columnMetric = columnMetrics[editingCell.columnIndex]
    if (!columnMetric) {
      return null
    }

    const rowTop = rowOffsets[editingCell.rowIndex] ?? editingCell.rowIndex * fallbackRowHeight
    const rowHeight = rowHeights[editingCell.rowIndex] ?? fallbackRowHeight
    const top = Math.max(0, HEADER_HEIGHT + rowTop)
    const left = Math.max(0, rowIndexWidth + columnMetric.offset)

    return {
      top,
      left,
      width: columnMetric.width,
      height: rowHeight,
    }
  }, [
    editingCell,
    columnMetrics,
    rowHeights,
    rowOffsets,
    fallbackRowHeight,
    rowIndexWidth,
  ])

  const editorSessionKey = useMemo(() => {
    if (!editingCell) {
      return 'inactive'
    }
    return `${editingCell.rowIndex}-${editingCell.columnIndex}`
  }, [editingCell])

  const anchorBounds = useMemo<SelectionRectangle | null>(() => {
    if (!anchorCell) {
      return null
    }

    const columnMetric = columnMetrics[anchorCell.columnIndex]
    if (!columnMetric) {
      return null
    }

    const rowTop =
      rowOffsets[anchorCell.rowIndex] ??
      anchorCell.rowIndex * fallbackRowHeight
    const rowHeight = rowHeights[anchorCell.rowIndex] ?? fallbackRowHeight
    const top = Math.max(
      HEADER_HEIGHT + rowTop + SELECTION_BORDER_OFFSET,
      0,
    )
    const left = Math.max(
      rowIndexWidth + columnMetric.offset + SELECTION_BORDER_OFFSET,
      0,
    )

    return {
      top,
      left,
      width: columnMetric.width,
      height: rowHeight,
    }
  }, [
    anchorCell,
    columnMetrics,
    rowHeights,
    rowOffsets,
    fallbackRowHeight,
    rowIndexWidth,
  ])

  const handleGridScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (editingCell) {
        commitEditing()
      }

      handleScroll(event)
    },
    [editingCell, commitEditing, handleScroll],
  )

  const handleRootPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!editingCell) {
        return
      }

      const target = event.target as HTMLElement
      if (target.closest('.grid-table__cell-editor')) {
        return
      }

      commitEditing()
    },
    [editingCell, commitEditing],
  )

  useImperativeHandle(ref, () => selectionControls, [selectionControls])

  return (
    <section
      className={className ? `grid-table ${className}` : 'grid-table'}
      aria-colcount={totalColumnCount}
      aria-label="Grid preview"
      aria-rowcount={rowCount}
      role="grid"
      style={style}
      onPointerDownCapture={handleRootPointerDownCapture}
    >
      <div
        className="grid-table__scroll"
        onScroll={handleGridScroll}
        ref={scrollRef}
      >
        <GridTableBody
          anchorCell={anchorCell}
          activeCell={activeCell}
          columnMetrics={visibleColumnMetrics}
          columns={visibleColumns}
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          renderRowStartIndex={range.rowStart}
          renderColumnStartIndex={range.columnStart}
          rowCount={rowCount}
          rowHeights={rowHeights}
          rowIndexWidth={rowIndexWidth}
          rows={visibleRows}
          selectionRange={normalizedSelectionRange}
          spacerWidth={spacerWidth}
          totalRenderedColumns={totalRenderedColumns}
          spacerHeight={spacerHeight}
          onCellPointerDown={handleCellPointerDown}
          onCellPointerMove={handleCellPointerMove}
          onCellPointerUp={handleCellPointerUp}
          onCellPointerCancel={handleCellPointerCancel}
          onCellDoubleClick={handleCellDoubleClick}
          onCornerHeaderClick={selectAll}
          columnOffset={range.columnStart}
          isAllSelected={isAllSelected}
          highlightedColumns={highlightedColumns}
          highlightedRows={highlightedRows}
          onColumnHeaderClick={handleColumnHeaderClick}
          onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
          onColumnHeaderPointerMove={handleColumnHeaderPointerMove}
          onColumnHeaderPointerUp={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerCancel={handleColumnHeaderPointerEnd}
        />

        <CellSelection
          anchorBounds={anchorBounds}
          editingBounds={editingBounds}
          editorValue={editingValue}
          onEditorBlur={handleEditorBlur}
          selectionBounds={selectionBounds}
          hasRangeSelection={hasRangeSelection}
          editorRef={editorRef}
          editorSessionKey={editorSessionKey}
          onEditorInput={(value) => {
            editingValueRef.current = value
            setEditingValue((prev) => (prev === value ? prev : value))
          }}
        />

        <GridTableRowIndex
          renderRowStartIndex={range.rowStart}
          rows={visibleRows}
          rowHeights={rowHeights}
          rowIndexWidth={rowIndexWidth}
          spacerHeight={spacerHeight}
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          totalRenderedColumns={totalRenderedColumns}
          onRowHeaderClick={handleRowHeaderClick}
          selectedRows={fullySelectedRows}
          isAllSelected={isAllSelected}
          activeRowIndex={activeCell?.rowIndex ?? null}
          highlightedRows={highlightedRows}
          onRowHeaderPointerDown={handleRowHeaderPointerDown}
          onRowHeaderPointerMove={handleRowHeaderPointerMove}
          onRowHeaderPointerUp={handleRowHeaderPointerEnd}
          onRowHeaderPointerCancel={handleRowHeaderPointerEnd}
        />

        <GridTableHeader
          columns={visibleColumns}
          columnMetrics={visibleColumnMetrics}
          rowIndexWidth={rowIndexWidth}
          spacerWidth={spacerWidth}
          onColumnHeaderClick={handleColumnHeaderClick}
          onSelectAll={selectAll}
          columnOffset={range.columnStart}
          selectedColumns={fullySelectedColumns}
          isAllSelected={isAllSelected}
          activeColumnIndex={activeCell?.columnIndex ?? null}
          highlightedColumns={highlightedColumns}
          onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
          onColumnHeaderPointerMove={handleColumnHeaderPointerMove}
          onColumnHeaderPointerUp={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerCancel={handleColumnHeaderPointerEnd}
        />
      </div>
    </section>
  )
}

export const GridTable = forwardRef<GridTableHandle, GridTableProps>(
  GridTableComponent,
)

export default GridTable
