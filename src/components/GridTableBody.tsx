import type {
  CellCoordinate,
  ComputedColumnMetrics,
  GridDataset,
  NormalizedSelectionRange,
} from 'types/grid'
import { HEADER_HEIGHT, MIN_ROW_HEIGHT } from '../constants/grid-table'
import type { FC, PointerEvent } from 'react'
import type { ColumnDefinitionInput } from '../hooks/useColumnMetrics'

export interface GridTableBodyProps {
  rows: GridDataset
  columns: ColumnDefinitionInput[]
  columnMetrics: ComputedColumnMetrics[]
  rowCount: number
  rowHeights: number[]
  rowIndexWidth: number
  spacerWidth: number
  totalRenderedColumns: number
  spacerHeight: number
  renderRowStartIndex: number
  renderColumnStartIndex: number
  selectionRange: NormalizedSelectionRange | null
  anchorCell: CellCoordinate | null
  activeCell: CellCoordinate | null
  contentWidth: number
  contentHeight: number
  onCellPointerDown?: (
    event: PointerEvent<HTMLTableCellElement>,
    rowIndex: number,
    columnIndex: number,
  ) => void
  onCellPointerMove?: (
    event: PointerEvent<HTMLTableCellElement>,
  ) => void
  onCellPointerUp?: (
    event: PointerEvent<HTMLTableCellElement>,
  ) => void
  onCellPointerCancel?: (
    event: PointerEvent<HTMLTableCellElement>,
  ) => void
  onCellDoubleClick?: (rowIndex: number, columnIndex: number) => void
  onCornerHeaderClick?: () => void
  columnOffset?: number
  isAllSelected?: boolean
  onColumnHeaderClick?: (columnIndex: number) => void
}

const ROW_INDEX_HEADER_CLASS =
  'grid-table__row-index-cell grid-table__row-index-header'
const ROW_INDEX_CELL_CLASS = 'grid-table__row-index-cell'
const ROW_INDEX_CELL_ANCHOR_CLASS =
  'grid-table__row-index-cell grid-table__row-index-cell--anchor'

const GridTableBody: FC<GridTableBodyProps> = ({
  rows,
  columns,
  columnMetrics,
  rowCount,
  rowHeights,
  rowIndexWidth,
  spacerWidth,
  totalRenderedColumns,
  spacerHeight,
  renderRowStartIndex,
  renderColumnStartIndex,
  selectionRange,
  anchorCell,
  activeCell,
  contentWidth,
  contentHeight,
  onCellPointerDown,
  onCellPointerMove,
  onCellPointerUp,
  onCellPointerCancel,
  onCellDoubleClick,
  onCornerHeaderClick,
  columnOffset = 0,
  isAllSelected,
  onColumnHeaderClick,
}) => {
  const fallbackRowHeight =
    rowHeights.find((height) => Number.isFinite(height) && height > 0) ??
    MIN_ROW_HEIGHT

  return (
    <div
      className="grid-table__spacer"
      style={{
        width: contentWidth
          ? `${contentWidth + rowIndexWidth}px`
          : '100%',
        height: contentHeight
          ? `${contentHeight + HEADER_HEIGHT}px`
          : '100%',
      }}
    >
      <table className="grid-table__table --master">
        <colgroup>
          <col style={{ width: rowIndexWidth }} />
          {spacerWidth > 0 && (
            <col style={{ width: spacerWidth }} />
          )}
          {columnMetrics.map((metric) => (
            <col
              key={`col-${metric.id}`}
              style={{ width: metric.width }}
            />
          ))}
        </colgroup>
        <thead>
          <tr role="row">
            <th
              role="columnheader"
              className={
                isAllSelected
                  ? `${ROW_INDEX_HEADER_CLASS} grid-table__corner-header--selected`
                  : ROW_INDEX_HEADER_CLASS
              }
              onClick={onCornerHeaderClick}
            />
            {spacerWidth > 0 && (
              <th
                aria-hidden="true"
                className="grid-table__column-spacer"
                role="presentation"
              />
            )}
            {columns.map((column, columnIndex) => (
              <th
                key={`header-${column.id}`}
                role="columnheader"
                onClick={() =>
                  onColumnHeaderClick?.(columnOffset + columnIndex)
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowCount === 0 ? (
            <tr role="row" className="grid-table__empty-row">
              <td colSpan={totalRenderedColumns} role="gridcell">
                データがありません
              </td>
            </tr>
          ) : (
            <>
              {spacerHeight > 0 && (
                <tr
                  aria-hidden="true"
                  className="grid-table__row-spacer"
                  role="presentation"
                >
                  <td
                    colSpan={totalRenderedColumns}
                    role="presentation"
                    style={{ height: `${spacerHeight}px` }}
                  />
                </tr>
              )}
              {rows.map((row, rowIndex) => {
                const absoluteRowIndex = renderRowStartIndex + rowIndex
                const currentRowHeight =
                  rowHeights[absoluteRowIndex] ?? fallbackRowHeight
                return (
                  <tr
                    key={`row-${absoluteRowIndex}`}
                    role="row"
                    style={{
                      height: `${currentRowHeight}px`,
                    }}
                  >
                    <th
                      role="gridcell"
                      className={
                        anchorCell?.rowIndex === absoluteRowIndex
                          ? ROW_INDEX_CELL_ANCHOR_CLASS
                          : ROW_INDEX_CELL_CLASS
                      }
                    >
                      {absoluteRowIndex + 1}
                    </th>
                    {spacerWidth > 0 && (
                      <td
                        aria-hidden="true"
                        className="grid-table__column-spacer"
                        role="presentation"
                      />
                    )}
                    {columns.map((column, columnIndex) => {
                      const cellValue = row[column.id]
                      const cellText =
                        cellValue === null || cellValue === undefined
                          ? ''
                          : String(cellValue)
                      const isMultiline = /\r?\n/.test(cellText)
                      const absoluteColumnIndex =
                        renderColumnStartIndex + columnIndex
                      const isSelected =
                        selectionRange !== null &&
                        absoluteRowIndex >= selectionRange.topRow &&
                        absoluteRowIndex <= selectionRange.bottomRow &&
                        absoluteColumnIndex >= selectionRange.leftColumn &&
                        absoluteColumnIndex <= selectionRange.rightColumn
                      const isAnchor =
                        anchorCell?.rowIndex === absoluteRowIndex &&
                        anchorCell?.columnIndex === absoluteColumnIndex
                      const isActive =
                        activeCell?.rowIndex === absoluteRowIndex &&
                        activeCell?.columnIndex === absoluteColumnIndex

                      const cellClassName = [
                        isSelected ? 'grid-table__cell--selected' : '',
                        isAnchor ? 'grid-table__cell--anchor' : '',
                        isMultiline
                          ? 'grid-table__cell--multiline'
                          : 'grid-table__cell--singleline',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined

                      return (
                        <td
                          key={`${absoluteRowIndex}-${column.id}`}
                          role="gridcell"
                          className={cellClassName}
                          aria-selected={isSelected ? 'true' : undefined}
                          data-cell-coordinate="true"
                          data-row-index={absoluteRowIndex}
                          data-column-index={absoluteColumnIndex}
                          data-active-cell={isActive ? 'true' : undefined}
                          tabIndex={-1}
                          onPointerDown={
                            onCellPointerDown
                              ? (event) =>
                                  onCellPointerDown(
                                    event,
                                    absoluteRowIndex,
                                    absoluteColumnIndex,
                                  )
                              : undefined
                          }
                          onPointerMove={
                            onCellPointerMove
                              ? (event) => onCellPointerMove(event)
                              : undefined
                          }
                          onPointerUp={
                            onCellPointerUp
                              ? (event) => onCellPointerUp(event)
                              : undefined
                          }
                          onPointerCancel={
                            onCellPointerCancel
                              ? (event) => onCellPointerCancel(event)
                              : undefined
                          }
                          onDoubleClick={
                            onCellDoubleClick
                              ? () =>
                                  onCellDoubleClick(
                                    absoluteRowIndex,
                                    absoluteColumnIndex,
                                  )
                              : undefined
                          }
                        >
                          {cellText}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  )

}

export default GridTableBody
