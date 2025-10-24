import type { ComputedColumnMetrics } from 'types/grid'
import type { ColumnDefinitionInput } from '../hooks/useColumnMetrics'

export interface GridTableHeaderProps {
  columns: ColumnDefinitionInput[]
  columnMetrics: ComputedColumnMetrics[]
  rowIndexWidth: number
  spacerWidth: number
}

const GridTableHeader = ({
  columns,
  columnMetrics,
  rowIndexWidth,
  spacerWidth,
}: GridTableHeaderProps) => (
  <table className="grid-table__table --header">
    <colgroup>
      <col style={{ width: rowIndexWidth }} />
      {spacerWidth > 0 && (
        <col style={{ width: spacerWidth }} />
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
        {spacerWidth > 0 && (
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
  </table>
)

export default GridTableHeader
