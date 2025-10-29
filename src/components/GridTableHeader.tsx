import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ComputedColumnMetrics } from 'types/grid'
import type { ColumnDefinitionInput } from '../hooks/useColumnMetrics'

export interface GridTableHeaderProps {
  columns: ColumnDefinitionInput[]
  columnMetrics: ComputedColumnMetrics[]
  rowIndexWidth: number
  spacerWidth: number
  onColumnHeaderClick?: (columnIndex: number | null) => void
  onSelectAll?: () => void
  columnOffset?: number
  selectedColumns?: Set<number>
  isAllSelected?: boolean
  onColumnHeaderPointerDown?: (
    event: ReactPointerEvent<HTMLTableCellElement>,
    columnIndex: number,
  ) => void
  onColumnHeaderPointerMove?: (event: ReactPointerEvent<HTMLTableCellElement>) => void
  onColumnHeaderPointerUp?: (event: ReactPointerEvent<HTMLTableCellElement>) => void
  onColumnHeaderPointerCancel?: (event: ReactPointerEvent<HTMLTableCellElement>) => void
}

const GridTableHeader = ({
  columns,
  columnMetrics,
  rowIndexWidth,
  spacerWidth,
  onColumnHeaderClick,
  onSelectAll,
  columnOffset = 0,
  selectedColumns,
  isAllSelected,
  onColumnHeaderPointerDown,
  onColumnHeaderPointerMove,
  onColumnHeaderPointerUp,
  onColumnHeaderPointerCancel,
}: GridTableHeaderProps) => (
  <table className="grid-table__table --header">
    <colgroup>
      <col style={{ width: rowIndexWidth }} />
      {spacerWidth > 0 && (
        <col style={{ width: spacerWidth }} />
      )}
      {columnMetrics.map((metric) => (
        <col key={`col-${metric.id}`} style={{ width: metric.width }} />
      ))}
    </colgroup>
    <thead>
      <tr role="row">
        <th
          role="columnheader"
          className={
            isAllSelected
              ? 'grid-table__row-index-cell grid-table__row-index-header grid-table__corner-header--selected'
              : 'grid-table__row-index-cell grid-table__row-index-header'
          }
          data-column-index={-1}
          onPointerDown={(event) => onColumnHeaderPointerDown?.(event, -1)}
          onPointerMove={onColumnHeaderPointerMove}
          onPointerUp={onColumnHeaderPointerUp}
          onPointerCancel={onColumnHeaderPointerCancel}
          onClick={() => onSelectAll?.()}
        />
        {spacerWidth > 0 && (
          <th
            aria-hidden="true"
            className="grid-table__column-spacer"
            role="presentation"
          />
        )}
        {columns.map((column, columnIndex) => {
          const absoluteColumnIndex = columnOffset + columnIndex
          const isSelected = selectedColumns?.has(absoluteColumnIndex)
          const headerClassName = isSelected
            ? 'grid-table__column-header grid-table__column-header--selected'
            : 'grid-table__column-header'
          return (
            <th
              key={`header-${column.id}`}
              role="columnheader"
              className={headerClassName}
              data-column-index={absoluteColumnIndex}
              onPointerDown={(event) =>
                onColumnHeaderPointerDown?.(event, absoluteColumnIndex)
              }
              onPointerMove={onColumnHeaderPointerMove}
              onPointerUp={onColumnHeaderPointerUp}
              onPointerCancel={onColumnHeaderPointerCancel}
              onClick={() => onColumnHeaderClick?.(absoluteColumnIndex)}
            >
              {column.header}
            </th>
          )
        })}
      </tr>
    </thead>
  </table>
)

export default GridTableHeader
