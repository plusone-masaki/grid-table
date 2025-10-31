import type { FC, PointerEvent as ReactPointerEvent } from 'react'
import type { ComputedColumnMetrics } from 'types/grid'
import { HEADER_HEIGHT } from '../constants/grid-table'

interface GridTableResizeHandlesProps {
  columnMetrics: ComputedColumnMetrics[]
  columnHandleIndex: number | null
  rowHandleIndex: number | null
  rowIndexWidth: number
  rowOffsets: number[]
  rowHeights: number[]
  onColumnResizePointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    columnIndex: number,
  ) => void
  onColumnResizePointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onColumnResizePointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onColumnResizePointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowResizePointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    rowIndex: number,
  ) => void
  onRowResizePointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowResizePointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRowResizePointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void
  scrollTop: number
  scrollLeft: number
  onColumnHandlePointerLeave?: () => void
  onRowHandlePointerLeave?: () => void
}

const COLUMN_HANDLE_WIDTH = 5
const ROW_HANDLE_HEIGHT = 5
const BORDER_OFFSET = 0
const COLUMN_HANDLE_HEIGHT = Math.max(0, HEADER_HEIGHT - BORDER_OFFSET * 2)

const GridTableResizeHandles: FC<GridTableResizeHandlesProps> = ({
  columnMetrics,
  columnHandleIndex,
  rowHandleIndex,
  rowIndexWidth,
  rowOffsets,
  rowHeights,
  onColumnResizePointerDown,
  onColumnResizePointerMove,
  onColumnResizePointerUp,
  onColumnResizePointerCancel,
  onRowResizePointerDown,
  onRowResizePointerMove,
  onRowResizePointerUp,
  onRowResizePointerCancel,
  scrollTop,
  scrollLeft,
  onColumnHandlePointerLeave,
  onRowHandlePointerLeave,
}) => {
  const columnMetric =
    columnHandleIndex !== null ? columnMetrics[columnHandleIndex] : undefined
  const columnLeft = (() => {
    if (!columnMetric) {
      return null
    }
    const columnStart =
      rowIndexWidth + columnMetric.offset - scrollLeft
    const columnEnd =
      rowIndexWidth + columnMetric.offset + columnMetric.width - scrollLeft
    const idealLeft = columnEnd - COLUMN_HANDLE_WIDTH - BORDER_OFFSET
    const adjustedLeft = Math.max(columnStart, idealLeft)
    return Number.isFinite(adjustedLeft) ? adjustedLeft : null
  })()

  const rowOffset =
    rowHandleIndex !== null ? rowOffsets[rowHandleIndex] : undefined
  const rowHeight =
    rowHandleIndex !== null ? rowHeights[rowHandleIndex] : undefined
  const rowTop = (() => {
    if (
      rowOffset === undefined ||
      rowHeight === undefined
    ) {
      return null
    }
    const rowStart = HEADER_HEIGHT + rowOffset - scrollTop
    const rowEnd = HEADER_HEIGHT + rowOffset + rowHeight - scrollTop
    const idealTop = rowEnd - ROW_HANDLE_HEIGHT - BORDER_OFFSET
    const adjustedTop = Math.max(rowStart, idealTop)
    return Number.isFinite(adjustedTop) ? adjustedTop : null
  })()

  return (
    <div className="grid-table__resize-handles-layer">
      {columnHandleIndex !== null && columnMetric && columnLeft !== null && (
        <div
          role="presentation"
          aria-hidden="true"
          className="grid-table__column-resize-handle"
          style={{
            height: `${COLUMN_HANDLE_HEIGHT}px`,
            left: `${columnLeft}px`,
            top: `${BORDER_OFFSET}px`,
          }}
          onPointerDown={(event) =>
            onColumnResizePointerDown?.(event, columnHandleIndex)
          }
          onPointerMove={onColumnResizePointerMove}
          onPointerUp={onColumnResizePointerUp}
          onPointerCancel={onColumnResizePointerCancel}
          onPointerLeave={(event) => {
            const next = event.relatedTarget as HTMLElement | null
            if (
              next?.classList.contains('grid-table__column-resize-handle') ||
              next?.closest('[data-column-index]')
            ) {
              return
            }
            onColumnHandlePointerLeave?.()
          }}
        />
      )}
      {rowHandleIndex !== null &&
        rowTop !== null && (
          <div
            role="presentation"
            aria-hidden="true"
            className="grid-table__row-resize-handle"
            style={{
              top: `${rowTop}px`,
              left: `${BORDER_OFFSET}px`,
              width: `${Math.max(0, rowIndexWidth - BORDER_OFFSET * 2)}px`,
            }}
            onPointerDown={(event) => onRowResizePointerDown?.(event, rowHandleIndex)}
            onPointerMove={onRowResizePointerMove}
            onPointerUp={onRowResizePointerUp}
            onPointerCancel={onRowResizePointerCancel}
            onPointerLeave={(event) => {
              const next = event.relatedTarget as HTMLElement | null
              if (
                next?.classList.contains('grid-table__row-resize-handle') ||
                next?.closest('[data-row-index]')
              ) {
                return
              }
              onRowHandlePointerLeave?.()
            }}
          />
        )}
    </div>
  )
}

export default GridTableResizeHandles
