import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GridDataset } from 'types/grid'
import { HEADER_HEIGHT, MIN_ROW_HEIGHT } from '../constants/grid-table';

export interface GridTableRowIndexProps {
  rows: GridDataset
  rowHeights: number[]
  rowIndexWidth: number
  spacerHeight: number
  contentWidth: number
  contentHeight: number
  totalRenderedColumns: number
  renderRowStartIndex: number
  onRowHeaderClick?: (rowIndex: number | null) => void
  selectedRows?: Set<number>
  isAllSelected?: boolean
  activeRowIndex?: number | null
  highlightedRows?: Set<number>
  onRowHeaderPointerDown?: (
    event: ReactPointerEvent<HTMLTableCellElement>,
    rowIndex: number,
  ) => void
  onRowHeaderPointerMove?: (
    event: ReactPointerEvent<HTMLTableCellElement>,
  ) => void
  onRowHeaderPointerUp?: (
    event: ReactPointerEvent<HTMLTableCellElement>,
  ) => void
  onRowHeaderPointerCancel?: (
    event: ReactPointerEvent<HTMLTableCellElement>,
  ) => void
}

const ROW_INDEX_HEADER_CLASS =
  'grid-table__row-index-cell grid-table__row-index-header'
const ROW_INDEX_CELL_CLASS = 'grid-table__row-index-cell'

const GridTableRowIndex = ({
  rows,
  rowHeights,
  rowIndexWidth,
  spacerHeight,
  contentWidth,
  contentHeight,
  totalRenderedColumns,
  renderRowStartIndex,
  onRowHeaderClick,
  selectedRows,
  isAllSelected,
  activeRowIndex,
  highlightedRows,
  onRowHeaderPointerDown,
  onRowHeaderPointerMove,
  onRowHeaderPointerUp,
  onRowHeaderPointerCancel,
}: GridTableRowIndexProps) => {
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
      <table className="grid-table__table --number">
        <colgroup>
          <col style={{ width: rowIndexWidth }} />
        </colgroup>
        <thead>
          <tr role="row">
            <th
              role="columnheader"
              className={
                isAllSelected
                  ? `${ROW_INDEX_HEADER_CLASS} grid-table__row-index-cell--selected`
                  : highlightedRows && highlightedRows.size > 0
                    ? `${ROW_INDEX_HEADER_CLASS} grid-table__row-index-cell--active`
                    : ROW_INDEX_HEADER_CLASS
              }
              data-row-index={-1}
              onClick={() => onRowHeaderClick?.(null)}
              onPointerDown={(event) => onRowHeaderPointerDown?.(event, -1)}
              onPointerMove={onRowHeaderPointerMove}
              onPointerUp={onRowHeaderPointerUp}
              onPointerCancel={onRowHeaderPointerCancel}
            />
          </tr>
        </thead>
        <tbody>
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
          {rows.map((_, rowIndex) => {
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
                  className={(() => {
                    if (selectedRows?.has(absoluteRowIndex)) {
                      return `${ROW_INDEX_CELL_CLASS} grid-table__row-index-cell--selected`
                    }
                    if (
                      highlightedRows?.has(absoluteRowIndex) ||
                      activeRowIndex === absoluteRowIndex
                    ) {
                      return `${ROW_INDEX_CELL_CLASS} grid-table__row-index-cell--active`
                    }
                    return ROW_INDEX_CELL_CLASS
                  })()}
                  data-row-index={absoluteRowIndex}
                  onClick={() => onRowHeaderClick?.(absoluteRowIndex)}
                  onPointerDown={(event) =>
                    onRowHeaderPointerDown?.(event, absoluteRowIndex)
                  }
                  onPointerMove={onRowHeaderPointerMove}
                  onPointerUp={onRowHeaderPointerUp}
                  onPointerCancel={onRowHeaderPointerCancel}
                >
                  {absoluteRowIndex + 1}
                </th>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default GridTableRowIndex
