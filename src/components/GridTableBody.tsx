import type {
  CellCoordinate,
  ComputedColumnMetrics,
  GridDataset,
  NormalizedSelectionRange,
} from 'types/grid'
import type { PointerEvent } from 'react'
import type { ColumnDefinitionInput } from '../hooks/useColumnMetrics'

interface GridTableBodyProps {
  rows: GridDataset
  columns: ColumnDefinitionInput[]
  columnMetrics: ComputedColumnMetrics[]
  rowCount: number
  rowHeight: number
  rowIndexWidth: number
  spacerColumnWidth: number
  totalRenderedColumns: number
  topSpacerHeight: number
  bottomSpacerHeight: number
  renderRowStartIndex: number
  renderColumnStartIndex: number
  selectionRange: NormalizedSelectionRange | null
  anchorCell: CellCoordinate | null
  activeCell: CellCoordinate | null
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
}

const GridTableBody = ({
  rows,
  columns,
  columnMetrics,
  rowCount,
  rowHeight,
  rowIndexWidth,
  spacerColumnWidth,
  totalRenderedColumns,
  topSpacerHeight,
  bottomSpacerHeight,
  renderRowStartIndex,
  renderColumnStartIndex,
  selectionRange,
  anchorCell,
  activeCell,
  onCellPointerDown,
  onCellPointerMove,
  onCellPointerUp,
  onCellPointerCancel,
}: GridTableBodyProps) => (
  <table className="grid-table__table --master">
    <colgroup>
      <col style={{ width: rowIndexWidth }} />
      {spacerColumnWidth > 0 && (
        <col style={{ width: spacerColumnWidth }} />
      )}
      {columnMetrics.map((metric) => (
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
          style={{ width: rowIndexWidth }}
        />
        {spacerColumnWidth > 0 && (
          <th
            aria-hidden="true"
            className="grid-table__column-spacer"
            role="presentation"
          />
        )}
        {columns.map((column) => (
          <th key={`header-${column.id}`} role="columnheader">
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
          {rows.map((row, rowIndex) => (
            <tr
              key={`row-${renderRowStartIndex + rowIndex}`}
          role="row"
          style={{ height: `${rowHeight}px` }}
        >
          <th
            role="gridcell"
            className={
              anchorCell?.rowIndex === renderRowStartIndex + rowIndex
                ? 'grid-table__row-index-cell grid-table__row-index-cell--anchor'
                : 'grid-table__row-index-cell'
            }
            style={{ width: rowIndexWidth }}
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
              {columns.map((column, columnIndex) => {
                const cellValue = row[column.id]
                const absoluteRowIndex = renderRowStartIndex + rowIndex
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
                ]
                  .filter(Boolean)
                  .join(' ') || undefined

                return (
                  <td
                    key={`${renderRowStartIndex + rowIndex}-${column.id}`}
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
)

export default GridTableBody
