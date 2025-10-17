import { useMemo, useRef } from 'react'
import useColumnMetrics, {
  type ColumnDefinitionInput as ColumnMetricsInput,
} from '../hooks/useColumnMetrics'
import useRowMetrics from '../hooks/useRowMetrics'
import useVirtualGrid from '../hooks/useVirtualGrid'
import {
  type ColumnPreset,
  type GridDataset,
  type GridRow,
  type GridTableProps,
  type OverscanConfig,
} from '../types/grid'
import './GridTable.css'

type ResolvedColumn = ColumnMetricsInput

const DEFAULT_OVERSCAN: OverscanConfig = {
  rows: 5,
  columns: 2,
}

const ROW_INDEX_HEADER = '#'
const ROW_INDEX_CHAR_WIDTH = 8
const ROW_INDEX_PADDING = 24
const MIN_ROW_INDEX_WIDTH = 48
const HEADER_HEIGHT = 24

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

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
  data,
  headerType = 'alpha',
  frozenColumnCount = 0,
  overscan,
  onViewportChange,
  className,
  style,
}: GridTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { headerRow, bodyRows } = useMemo(() => {
    if (headerType === 'headers' && data.length > 0) {
      const [firstRow, ...restRows] = data
      return {
        headerRow: firstRow,
        bodyRows: restRows,
      }
    }

    return {
      headerRow: undefined,
      bodyRows: data,
    }
  }, [headerType, data])

  const resolvedColumns: ResolvedColumn[] = useMemo(() => {
    const columnKeys = resolveColumnKeys(headerRow, bodyRows)
    const safeFrozen = clamp(frozenColumnCount, 0, columnKeys.length)

    return columnKeys.map((key, index) => ({
      id: key,
      header: resolveHeaderLabel(headerType, index, key, headerRow),
      isFrozen: index < safeFrozen,
    }))
  }, [headerType, headerRow, bodyRows, frozenColumnCount])

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
    scrollTop,
  } = useVirtualGrid({
    rowCount: bodyRows.length,
    columnMetrics,
    rowHeight: rowMetrics.height,
    overscan: overscan ?? DEFAULT_OVERSCAN,
    scrollRef,
    onViewportChange,
  })

  const rowIndexMaxLength = Math.max(
    ROW_INDEX_HEADER.length,
    bodyRows.length > 0 ? String(bodyRows.length).length : 1,
  )
  const rowIndexWidth = Math.max(
    MIN_ROW_INDEX_WIDTH,
    rowIndexMaxLength * ROW_INDEX_CHAR_WIDTH + ROW_INDEX_PADDING,
  )

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
  const renderColumnMetrics = hasVisibleColumns ? visibleColumnMetrics : columnMetrics
  const renderRows = hasVisibleRows ? visibleRows : bodyRows
  const renderRowStartIndex = hasVisibleRows ? range.rowStart : 0
  const offsetLeft = hasVisibleColumns ? range.offsetLeft : 0
  const scrollOffsetY = range.offsetTop - scrollTop

  const spacerStyle = {
    width: contentWidth ? `${contentWidth + rowIndexWidth}px` : '100%',
    height: contentHeight ? `${contentHeight + HEADER_HEIGHT}px` : '100%',
  }

  const rowIndexBodyStyle = {
    top: `${HEADER_HEIGHT + scrollTop}px`,
    left: '0px',
    width: `${rowIndexWidth}px`,
    transform: `translateY(${scrollOffsetY}px)`,
  }

  const headerTableStyle = {
    top: `${scrollTop}px`,
    left: '0px',
    transform: `translateX(${offsetLeft}px)`,
  }

  const bodyTableStyle = {
    top: `${HEADER_HEIGHT + scrollTop}px`,
    left: `${rowIndexWidth}px`,
    transform: `translate(${offsetLeft}px, ${scrollOffsetY}px)`,
  }

  const rowCount = bodyRows.length
  const columnCount = resolvedColumns.length
  const totalColumnCount = columnCount + 1

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
        {columnCount === 0 ? (
          <div className="grid-table__empty">データがありません</div>
        ) : (
          <div className="grid-table__spacer" style={spacerStyle}>
            <table className="grid-table__inner-table" style={bodyTableStyle}>
              <colgroup>
                {renderColumnMetrics.map((metric) => (
                  <col
                    key={`col-${metric.id}`}
                    style={{ minWidth: metric.width, width: metric.width }}
                  />
                ))}
              </colgroup>
              <tbody>
                {rowCount === 0 ? (
                  <tr role="row" className="grid-table__empty-row">
                    <td colSpan={renderColumns.length}>データがありません</td>
                  </tr>
                ) : (
                  renderRows.map((row, rowIndex) => (
                    <tr
                      key={`row-${renderRowStartIndex + rowIndex}`}
                      role="row"
                      style={{ height: `${rowMetrics.height}px` }}
                    >
                      {renderColumns.map((column) => {
                        const cellValue = row[column.id]
                        return (
                          <td
                            key={`${renderRowStartIndex + rowIndex}-${column.id}`}
                            role="gridcell"
                          >
                            {cellValue ?? ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <table className="grid-table__row-index" style={rowIndexBodyStyle}>
              <tbody>
                {renderRows.map((_, rowIndex) => (
                  <tr
                    key={`row-index-${renderRowStartIndex + rowIndex}`}
                    role="row"
                    style={{ height: `${rowMetrics.height}px` }}
                  >
                    <th role="gridcell">
                      {renderRowStartIndex + rowIndex + 1}
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="grid-table__header-table" style={headerTableStyle}>
              <colgroup>
                  <col style={{ width: `${rowIndexWidth}px` }} />
                  {renderColumnMetrics.map((metric) => (
                      <col
                          key={`header-col-${metric.id}`}
                          style={{ minWidth: metric.width, width: metric.width }}
                      />
                  ))}
              </colgroup>
              <thead>
                <tr role="row">
                  <th
                    role="columnheader"
                    className="grid-table__corner-cell"
                  >
                    {ROW_INDEX_HEADER}
                  </th>
                  {renderColumns.map((column) => (
                    <th key={`header-${column.id}`} role="columnheader">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default GridTable
