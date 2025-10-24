import type { GridDataset } from 'types/grid'

interface GridTableRowIndexProps {
  rows: GridDataset
  rowHeight: number
  rowIndexWidth: number
  topSpacerHeight: number
  totalRenderedColumns: number
  renderRowStartIndex: number
}

const GridTableRowIndex = ({
  rows,
  rowHeight,
  rowIndexWidth,
  topSpacerHeight,
  totalRenderedColumns,
  renderRowStartIndex,
}: GridTableRowIndexProps) => (
  <table className="grid-table__table --number">
    <colgroup>
      <col style={{ width: rowIndexWidth }} />
    </colgroup>
    <thead>
      <tr role="row">
        <th
          role="columnheader"
          className="grid-table__row-index-cell grid-table__row-index-header"
          style={{ width: rowIndexWidth }}
        />
      </tr>
    </thead>
    <tbody>
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
      {rows.map((_, rowIndex) => (
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
        </tr>
      ))}
    </tbody>
  </table>
)

export default GridTableRowIndex
