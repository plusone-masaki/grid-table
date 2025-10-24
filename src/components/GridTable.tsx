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
  const [selection, setSelection] = useState<CellCoordinate | null>(null)

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

  useEffect(() => {
    if (!selectionEnabled) {
      if (selection !== null) {
        setSelection(null)
      }
      return
    }

    if (selection === null) {
      return
    }

    const isRowInRange = selection.rowIndex >= 0 && selection.rowIndex < rowCount
    const isColumnInRange =
      selection.columnIndex >= 0 && selection.columnIndex < columnCount

    if (!isRowInRange || !isColumnInRange) {
      setSelection(null)
    }
  }, [selectionEnabled, selection, rowCount, columnCount, setSelection])

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

      setSelection({
        rowIndex,
        columnIndex,
      })
    },
    [selectionEnabled],
  )

  const selectionBounds = useMemo(() => {
    if (!selectionEnabled || selection === null) {
      return null
    }

    const columnMetric = columnMetrics[selection.columnIndex]
    if (!columnMetric) {
      return null
    }

    const top = Math.max(
      HEADER_HEIGHT + selection.rowIndex * rowMetrics.height,
      0,
    )
    const left = Math.max(rowIndexWidth + columnMetric.offset, 0)

    return {
      top,
      left,
      width: columnMetric.width,
      height: rowMetrics.height,
    }
  }, [
    selectionEnabled,
    selection,
    columnMetrics,
    rowMetrics.height,
    rowIndexWidth,
  ])

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
            selection={selectionEnabled ? selection : null}
            onCellPointerDown={handleCellPointerDown}
          />
        </div>

        {selectionBounds && (
          <CellSelection
            top={selectionBounds.top}
            left={selectionBounds.left}
            width={selectionBounds.width}
            height={selectionBounds.height}
          />
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
