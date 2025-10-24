import type { ComputedColumnMetrics, GridDataset } from 'types/grid'
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
                className="grid-table__row-index-cell"
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
              {columns.map((column) => {
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
)

export default GridTableBody
