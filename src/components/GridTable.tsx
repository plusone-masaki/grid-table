import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import useColumnMetrics, {
  type ColumnDefinitionInput as ColumnMetricsInput,
} from '../hooks/useColumnMetrics'
import useRowMetrics from '../hooks/useRowMetrics'
import useVirtualGrid from '../hooks/useVirtualGrid'
import {
  type ColumnPreset,
  type GridDataset,
  type CellCoordinate,
  type GridRow,
  type GridTableProps,
  type NormalizedSelectionRange,
  type SelectionRange,
} from 'types/grid'
import {
  DEFAULT_OVERSCAN,
  EMPTY_DATASET_FALLBACK,
  HEADER_HEIGHT,
  MIN_ROW_INDEX_WIDTH,
  ROW_INDEX_CHAR_WIDTH,
  ROW_INDEX_PADDING,
} from '../constants/grid-table'
import GridTableBody from './GridTableBody'
import GridTableHeader from './GridTableHeader'
import GridTableRowIndex from './GridTableRowIndex'
import CellSelection from './CellSelection'
import './GridTable.css'

type ResolvedColumn = ColumnMetricsInput

const cloneCellCoordinate = (coordinate: CellCoordinate): CellCoordinate => ({
  rowIndex: coordinate.rowIndex,
  columnIndex: coordinate.columnIndex,
})

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

export const GridTable = ({
  data: rawData = EMPTY_DATASET_FALLBACK,
  headerType = 'alpha',
  overscan,
  className,
  style,
}: GridTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const data = rawData.length === 0 ? EMPTY_DATASET_FALLBACK : rawData
  const isFallbackData = rawData.length === 0
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(
    null,
  )
  const [anchorCell, setAnchorCell] = useState<CellCoordinate | null>(null)
  const [activeCell, setActiveCell] = useState<CellCoordinate | null>(null)
  const pointerStateRef = useRef<{ isSelecting: boolean; pointerId: number | null }>({
    isSelecting: false,
    pointerId: null,
  })
  const anchorRef = useRef<CellCoordinate | null>(null)
  const lastFocusRef = useRef<CellCoordinate | null>(null)

  const { headerRow, bodyRows } = useMemo(() => {
    if (headerType === 'headers' && rawData.length > 0) {
      const [firstRow, ...restRows] = rawData
      return {
        headerRow: firstRow,
        bodyRows: restRows,
      }
    }

    return {
      headerRow: undefined,
      bodyRows: data,
    }
  }, [headerType, rawData, data])

  const resolvedColumns: ResolvedColumn[] = useMemo(() => {
    const columnKeys = resolveColumnKeys(headerRow, bodyRows)

    return columnKeys.map((key, index) => ({
      id: key,
      header: resolveHeaderLabel(headerType, index, key, headerRow),
      isFrozen: false,
    }))
  }, [headerType, headerRow, bodyRows])

  const columnMetrics = useColumnMetrics({
    columns: resolvedColumns,
    data: bodyRows,
  })
  const rowMetrics = useRowMetrics({
    columns: resolvedColumns.map(({ id, header }) => ({ id, header })),
    data: bodyRows,
  })

  const {
    range,
    contentWidth,
    contentHeight,
    handleScroll,
  } = useVirtualGrid({
    rowCount: bodyRows.length,
    columnMetrics,
    rowHeight: rowMetrics.height,
    overscan: overscan ?? DEFAULT_OVERSCAN,
    scrollRef,
  })

  const rowIndexMaxLength = Math.max(
    1,
    bodyRows.length > 0 ? String(bodyRows.length).length : 1,
  )
  const rowIndexMeasuredWidth =
    rowIndexMaxLength * ROW_INDEX_CHAR_WIDTH + ROW_INDEX_PADDING
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
    () => bodyRows.slice(range.rowStart, range.rowEnd),
    [bodyRows, range.rowStart, range.rowEnd],
  )

  const hasVisibleColumns = visibleColumnMetrics.length > 0
  const hasVisibleRows = visibleRows.length > 0

  const renderColumns = hasVisibleColumns ? visibleColumns : resolvedColumns
  const renderColumnMetrics = hasVisibleColumns
    ? visibleColumnMetrics
    : columnMetrics
  const renderRows = hasVisibleRows ? visibleRows : bodyRows
  const renderRowStartIndex = hasVisibleRows ? range.rowStart : 0
  const renderColumnStartIndex = hasVisibleColumns ? range.columnStart : 0
  const offsetLeft = hasVisibleColumns ? range.offsetLeft : 0
  const spacerColumnWidth = hasVisibleColumns ? offsetLeft : 0

  const topSpacerHeight = hasVisibleRows ? range.offsetTop : 0
  const renderedRowCount = renderRows.length
  const renderedRowsHeight = renderedRowCount * rowMetrics.height
  const bottomSpacerHeight = Math.max(
    contentHeight - topSpacerHeight - renderedRowsHeight,
    0,
  )
  const totalRenderedColumns =
    1 + (spacerColumnWidth > 0 ? 1 : 0) + renderColumns.length

  const rowCount = bodyRows.length
  const columnCount = resolvedColumns.length
  const totalColumnCount = columnCount + 1
  const selectionEnabled =
    !isFallbackData && rowCount > 0 && columnCount > 0 && columnMetrics.length > 0

  const resetSelectionState = useCallback(() => {
    setSelectionRange(null)
    setAnchorCell(null)
    setActiveCell(null)
    pointerStateRef.current = {
      isSelecting: false,
    pointerId: null,
  }
  anchorRef.current = null
  lastFocusRef.current = null
}, [])

  useEffect(() => {
    if (!selectionEnabled) {
      resetSelectionState()
      return
    }

    if (selectionRange === null) {
      return
    }

    const { anchor, focus } = selectionRange
    const rows = [anchor.rowIndex, focus.rowIndex]
    const columns = [anchor.columnIndex, focus.columnIndex]
    const isRowInRange = rows.every(
      (row) => row >= 0 && row < rowCount,
    )
    const isColumnInRange = columns.every(
      (columnIndexValue) =>
        columnIndexValue >= 0 && columnIndexValue < columnCount,
    )

    if (!isRowInRange || !isColumnInRange) {
      resetSelectionState()
    }
  }, [
    selectionEnabled,
    selectionRange,
    rowCount,
    columnCount,
    resetSelectionState,
  ])

  const updateSelectionState = useCallback(
    (anchor: CellCoordinate, focus: CellCoordinate) => {
      const anchorClone = cloneCellCoordinate(anchor)
      const focusClone = cloneCellCoordinate(focus)

      setSelectionRange({
        anchor: anchorClone,
        focus: focusClone,
      })
      setAnchorCell(anchorClone)
      setActiveCell(focusClone)

      anchorRef.current = anchorClone
      lastFocusRef.current = focusClone
    },
    [],
  )

  const resolveCellFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>): CellCoordinate | null => {
      const element = document.elementFromPoint(
        event.clientX,
        event.clientY,
      ) as HTMLElement | null

      if (!element) {
        return null
      }

      const cellElement = element.closest(
        '[data-cell-coordinate="true"]',
      ) as HTMLElement | null

      if (!cellElement) {
        return null
      }

      const rowAttr = cellElement.getAttribute('data-row-index')
      const columnAttr = cellElement.getAttribute('data-column-index')

      if (rowAttr === null || columnAttr === null) {
        return null
      }

      const rowIndex = Number(rowAttr)
      const columnIndex = Number(columnAttr)

      if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
        return null
      }

      return { rowIndex, columnIndex }
    },
    [],
  )

  const handleCellPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLTableCellElement>,
      rowIndex: number,
      columnIndex: number,
    ) => {
      if (!selectionEnabled) {
        return
      }

      if (!event.isPrimary) {
        return
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      const cell: CellCoordinate = {
        rowIndex,
        columnIndex,
      }

      const anchor =
        event.shiftKey && anchorRef.current
          ? anchorRef.current
          : cell

      updateSelectionState(anchor, cell)
      pointerStateRef.current = {
        isSelecting: true,
        pointerId: event.pointerId,
      }
      lastFocusRef.current = cloneCellCoordinate(cell)

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // 一部環境で setPointerCapture が失敗する可能性があるため握りつぶす
      }
    },
    [selectionEnabled, updateSelectionState],
  )

  const handleCellPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!selectionEnabled) {
        return
      }

      if (!pointerStateRef.current.isSelecting) {
        return
      }

      const anchor = anchorRef.current
      if (!anchor) {
        return
      }

      const nextFocus =
        resolveCellFromEvent(event) ?? lastFocusRef.current

      if (!nextFocus) {
        return
      }

      if (
        lastFocusRef.current &&
        lastFocusRef.current.rowIndex === nextFocus.rowIndex &&
        lastFocusRef.current.columnIndex === nextFocus.columnIndex
      ) {
        return
      }

      if (
        nextFocus.rowIndex < 0 ||
        nextFocus.rowIndex >= rowCount ||
        nextFocus.columnIndex < 0 ||
        nextFocus.columnIndex >= columnCount
      ) {
        return
      }

      lastFocusRef.current = cloneCellCoordinate(nextFocus)
      updateSelectionState(anchor, nextFocus)
    },
    [
      selectionEnabled,
      resolveCellFromEvent,
      rowCount,
      columnCount,
      updateSelectionState,
    ],
  )

  const releasePointerCapture = (
    target: EventTarget & HTMLTableCellElement,
    pointerId: number,
  ) => {
    try {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId)
      }
    } catch {
      // releasePointerCapture が失敗しても処理継続
    }
  }

  const stopPointerSelection = () => {
    pointerStateRef.current = {
      isSelecting: false,
      pointerId: null,
    }
  }

  const handleCellPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!selectionEnabled) {
        return
      }

      if (!pointerStateRef.current.isSelecting) {
        return
      }

      if (
        pointerStateRef.current.pointerId !== null &&
        event.pointerId === pointerStateRef.current.pointerId
      ) {
        releasePointerCapture(event.currentTarget, event.pointerId)
      }

      const anchor = anchorRef.current
      const focus = lastFocusRef.current ?? anchor

      if (anchor && focus) {
        updateSelectionState(anchor, focus)
      }

      stopPointerSelection()
    },
    [selectionEnabled, updateSelectionState],
  )

  const handleCellPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!selectionEnabled) {
        return
      }

      if (
        pointerStateRef.current.pointerId !== null &&
        event.pointerId === pointerStateRef.current.pointerId
      ) {
        releasePointerCapture(event.currentTarget, event.pointerId)
      }

      const anchor = anchorRef.current
      const focus = lastFocusRef.current ?? anchor

      if (anchor && focus) {
        updateSelectionState(anchor, focus)
      }

      stopPointerSelection()
    },
    [selectionEnabled, updateSelectionState],
  )

  const normalizedSelectionRange = useMemo<NormalizedSelectionRange | null>(() => {
    if (!selectionEnabled || selectionRange === null) {
      return null
    }

    const { anchor, focus } = selectionRange

    return {
      topRow: Math.min(anchor.rowIndex, focus.rowIndex),
      bottomRow: Math.max(anchor.rowIndex, focus.rowIndex),
      leftColumn: Math.min(anchor.columnIndex, focus.columnIndex),
      rightColumn: Math.max(anchor.columnIndex, focus.columnIndex),
    }
  }, [selectionEnabled, selectionRange])

  const selectionBounds = useMemo(() => {
    if (!selectionEnabled || normalizedSelectionRange === null) {
      return null
    }

    const { topRow, bottomRow, leftColumn, rightColumn } =
      normalizedSelectionRange

    const leftMetric = columnMetrics[leftColumn]
    const rightMetric = columnMetrics[rightColumn]

    if (!leftMetric || !rightMetric) {
      return null
    }

    const top = Math.max(HEADER_HEIGHT + topRow * rowMetrics.height + 1, 0)
    const height = (bottomRow - topRow + 1) * rowMetrics.height
    const left = Math.max(rowIndexWidth + leftMetric.offset + 1, 0)
    const width = rightMetric.offset + rightMetric.width - leftMetric.offset

    return {
      top,
      left,
      width,
      height,
    }
  }, [
    selectionEnabled,
    normalizedSelectionRange,
    columnMetrics,
    rowMetrics.height,
    rowIndexWidth,
  ])

  const anchorBounds = useMemo(() => {
    if (!selectionEnabled || !anchorCell) {
      return null
    }

    const columnMetric = columnMetrics[anchorCell.columnIndex]
    if (!columnMetric) {
      return null
    }

    const top = Math.max(HEADER_HEIGHT + anchorCell.rowIndex * rowMetrics.height + 1, 0)
    const left = Math.max(rowIndexWidth + columnMetric.offset + 1, 0)

    return {
      top,
      left,
      width: columnMetric.width,
      height: rowMetrics.height,
    }
  }, [selectionEnabled, anchorCell, columnMetrics, rowMetrics.height, rowIndexWidth])

  const isSingleCellSelection = useMemo(() => {
    if (!normalizedSelectionRange) {
      return false
    }

    const { topRow, bottomRow, leftColumn, rightColumn } = normalizedSelectionRange
    return topRow === bottomRow && leftColumn === rightColumn
  }, [normalizedSelectionRange])

  return (
    <section
      className={className ? `grid-table ${className}` : 'grid-table'}
      aria-colcount={totalColumnCount}
      aria-label="Grid preview"
      aria-rowcount={rowCount}
      role="grid"
      style={style}
    >
      <div
        className="grid-table__scroll"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        {/* データ */}
        <div
          className="grid-table__spacer"
          style={{
            width: contentWidth ? `${contentWidth + rowIndexWidth}px` : '100%',
            height: contentHeight ? `${contentHeight + HEADER_HEIGHT}px` : '100%',
          }}
        >
          <GridTableBody
            bottomSpacerHeight={bottomSpacerHeight}
            columnMetrics={renderColumnMetrics}
            columns={renderColumns}
            renderRowStartIndex={renderRowStartIndex}
            renderColumnStartIndex={renderColumnStartIndex}
            rowCount={rowCount}
            rowHeight={rowMetrics.height}
            rowIndexWidth={rowIndexWidth}
            rows={renderRows}
            spacerColumnWidth={spacerColumnWidth}
            topSpacerHeight={topSpacerHeight}
            totalRenderedColumns={totalRenderedColumns}
            selectionRange={
              selectionEnabled ? normalizedSelectionRange : null
            }
            anchorCell={selectionEnabled ? anchorCell : null}
            activeCell={selectionEnabled ? activeCell : null}
            onCellPointerDown={handleCellPointerDown}
            onCellPointerMove={handleCellPointerMove}
            onCellPointerUp={handleCellPointerUp}
            onCellPointerCancel={handleCellPointerCancel}
          />
        </div>

        {selectionBounds && (
          <>
            {!isSingleCellSelection && (
              <>
                <CellSelection
                  variant="fill"
                  top={selectionBounds.top}
                  left={selectionBounds.left}
                  width={selectionBounds.width}
                  height={selectionBounds.height}
                />
                <CellSelection
                  variant="outline"
                  top={selectionBounds.top}
                  left={selectionBounds.left}
                  width={selectionBounds.width}
                  height={selectionBounds.height}
                />
              </>
            )}
            {anchorBounds && (
              <CellSelection
                variant="anchor"
                top={anchorBounds.top}
                left={anchorBounds.left}
                width={anchorBounds.width}
                height={anchorBounds.height}
              />
            )}
          </>
        )}

        {/* ヘッダー */}
        <div
          className="grid-table__spacer"
          style={{
            width: contentWidth ? `${contentWidth + rowIndexWidth}px` : '100%',
            height: contentHeight ? `${contentHeight + HEADER_HEIGHT}px` : '100%',
          }}
        >
          <GridTableHeader
            columns={renderColumns}
            columnMetrics={renderColumnMetrics}
            rowIndexWidth={rowIndexWidth}
            spacerColumnWidth={spacerColumnWidth}
          />
        </div>

        {/* 行番号 */}
        <div
          className="grid-table__spacer"
          style={{
            width: contentWidth ? `${contentWidth + rowIndexWidth}px` : '100%',
            height: contentHeight ? `${contentHeight + HEADER_HEIGHT}px` : '100%',
          }}
        >
          <GridTableRowIndex
            renderRowStartIndex={renderRowStartIndex}
            rowHeight={rowMetrics.height}
            rowIndexWidth={rowIndexWidth}
            rows={renderRows}
            topSpacerHeight={topSpacerHeight}
            totalRenderedColumns={totalRenderedColumns}
          />
        </div>
      </div>
    </section>
  )
}

export default GridTable
