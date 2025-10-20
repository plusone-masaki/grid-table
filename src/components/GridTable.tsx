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
} from 'types/grid'
import './GridTable.css'

type ResolvedColumn = ColumnMetricsInput

const DEFAULT_OVERSCAN: OverscanConfig = {
  rows: 5,
  columns: 2,
}

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
  } = useVirtualGrid({
    rowCount: bodyRows.length,
    columnMetrics,
    rowHeight: rowMetrics.height,
    overscan: overscan ?? DEFAULT_OVERSCAN,
    scrollRef,
    onViewportChange,
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
  const renderColumnMetrics = hasVisibleColumns ? visibleColumnMetrics : columnMetrics
  const renderRows = hasVisibleRows ? visibleRows : bodyRows
  const renderRowStartIndex = hasVisibleRows ? range.rowStart : 0
  const offsetLeft = hasVisibleColumns ? range.offsetLeft : 0
  const spacerColumnWidth = hasVisibleColumns ? offsetLeft : 0

  const spacerStyle = {
    width: contentWidth ? `${contentWidth + rowIndexWidth}px` : '100%',
    height: contentHeight ? `${contentHeight + HEADER_HEIGHT}px` : '100%',
  }

  const tableStyle = {
    top: '0px',
    left: '0px',
    width: 'max-content',
  }

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
            <table className="grid-table__table" style={tableStyle}>
              <colgroup>
                <col
                  style={{
                    width: rowIndexWidth,
                    minWidth: rowIndexWidth,
                    maxWidth: rowIndexWidth,
                  }}
                />
                {spacerColumnWidth > 0 && (
                  <col
                    style={{
                      width: spacerColumnWidth,
                      minWidth: spacerColumnWidth,
                      maxWidth: spacerColumnWidth,
                    }}
                  />
                )}
                {renderColumnMetrics.map((metric) => (
                  <col
                    key={`col-${metric.id}`}
                    style={{ width: metric.width, minWidth: metric.width }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr role="row">
                  <th
                    role="columnheader"
                    className="grid-table__row-index-cell grid-table__row-index-header"
                    style={{
                      width: rowIndexWidth,
                      minWidth: rowIndexWidth,
                      maxWidth: rowIndexWidth,
                    }}
                  />
                  {spacerColumnWidth > 0 && (
                    <th
                      aria-hidden="true"
                      className="grid-table__column-spacer"
                      role="presentation"
                    />
                  )}
                  {renderColumns.map((column) => (
                    <th key={`header-${column.id}`} role="columnheader">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowCount === 0 ? (
                  <tr
                    role="row"
                    className="grid-table__empty-row"
                  >
                    <td colSpan={totalRenderedColumns} role="gridcell">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  <>
                    {topSpacerHeight > 0 && (
                      <tr
                        aria-hidden="true"
                        className="grid-table__row-spacer"
                        role="presentation"
                      >
                        <td
                          colSpan={totalRenderedColumns}
                          role="presentation"
                          style={{ height: `${topSpacerHeight}px` }}
                        />
                      </tr>
                    )}
                    {renderRows.map((row, rowIndex) => (
                      <tr
                        key={`row-${renderRowStartIndex + rowIndex}`}
                        role="row"
                        style={{ height: `${rowMetrics.height}px` }}
                      >
                        <th
                          role="gridcell"
                          className="grid-table__row-index-cell"
                          style={{
                            width: rowIndexWidth,
                            minWidth: rowIndexWidth,
                            maxWidth: rowIndexWidth,
                          }}
                        >
                          {renderRowStartIndex + rowIndex + 1}
                        </th>
                        {spacerColumnWidth > 0 && (
                          <td
                            aria-hidden="true"
                            className="grid-table__column-spacer"
                            role="presentation"
                          />
                        )}
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
                    ))}
                    {bottomSpacerHeight > 0 && (
                      <tr
                        aria-hidden="true"
                        className="grid-table__row-spacer"
                        role="presentation"
                      >
                        <td
                          colSpan={totalRenderedColumns}
                          role="presentation"
                          style={{ height: `${bottomSpacerHeight}px` }}
                        />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default GridTable
