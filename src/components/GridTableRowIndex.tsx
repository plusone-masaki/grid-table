import type { GridDataset } from 'types/grid'
import { HEADER_HEIGHT } from '../constants/grid-table';

export interface GridTableRowIndexProps {
  rows: GridDataset
  rowHeights: number[]
  defaultRowHeight: number
  rowIndexWidth: number
  spacerHeight: number
  contentWidth: number
  contentHeight: number
  totalRenderedColumns: number
  renderRowStartIndex: number
}

const GridTableRowIndex = ({
  rows,
  rowHeights,
  defaultRowHeight,
  rowIndexWidth,
  spacerHeight,
  contentWidth,
  contentHeight,
  totalRenderedColumns,
  renderRowStartIndex,
}: GridTableRowIndexProps) => (
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
            className="grid-table__row-index-cell grid-table__row-index-header"
            style={{ width: rowIndexWidth }}
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
            rowHeights[absoluteRowIndex] ?? defaultRowHeight

          return (
            <tr
              key={`row-${absoluteRowIndex}`}
              role="row"
              style={{ height: `${currentRowHeight}px` }}
            >
              <th
                role="gridcell"
                className="grid-table__row-index-cell"
                style={{ width: rowIndexWidth }}
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

export default GridTableRowIndex
