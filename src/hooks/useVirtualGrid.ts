import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import type {
  ComputedColumnMetrics,
  OverscanConfig,
  ViewportRange,
} from '../types/grid'
import { useResizeObserver } from './useResizeObserver'

const DEFAULT_OVERSCAN_ROWS = 5
const DEFAULT_OVERSCAN_COLUMNS = 2

interface VirtualRange {
  rowStart: number
  rowEnd: number
  columnStart: number
  columnEnd: number
  offsetTop: number
  offsetLeft: number
}

interface UseVirtualGridParams {
  rowCount: number
  columnMetrics: ComputedColumnMetrics[]
  rowHeight: number
  overscan?: OverscanConfig
  scrollRef: RefObject<HTMLDivElement | null>
  onViewportChange?: (viewport: ViewportRange) => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const findColumnIndex = (
  metrics: ComputedColumnMetrics[],
  scrollPosition: number,
): number => {
  let low = 0
  let high = metrics.length - 1
  let candidate = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const metric = metrics[mid]
    if (metric.offset + metric.width > scrollPosition) {
      candidate = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return clamp(candidate, 0, Math.max(metrics.length - 1, 0))
}

export interface VirtualGridState {
  range: VirtualRange
  contentWidth: number
  contentHeight: number
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void
  scrollTop: number
  scrollLeft: number
}

export const useVirtualGrid = ({
  rowCount,
  columnMetrics,
  rowHeight,
  overscan,
  scrollRef,
  onViewportChange,
}: UseVirtualGridParams): VirtualGridState => {
  const overscanRows = overscan?.rows ?? DEFAULT_OVERSCAN_ROWS
  const overscanColumns = overscan?.columns ?? DEFAULT_OVERSCAN_COLUMNS

  const viewportSize = useResizeObserver(scrollRef)
  const [range, setRange] = useState<VirtualRange>({
    rowStart: 0,
    rowEnd: 0,
    columnStart: 0,
    columnEnd: 0,
    offsetTop: 0,
    offsetLeft: 0,
  })
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 })
  const contentWidth = useMemo(() => {
    if (columnMetrics.length === 0) {
      return 0
    }
    const lastMetric = columnMetrics[columnMetrics.length - 1]
    return lastMetric.offset + lastMetric.width
  }, [columnMetrics])

  const contentHeight = useMemo(
    () => rowCount * rowHeight,
    [rowCount, rowHeight],
  )

  const computeRange = useCallback(
    (scrollTop: number, scrollLeft: number): VirtualRange => {
      if (rowCount === 0 || columnMetrics.length === 0) {
        return {
          rowStart: 0,
          rowEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          offsetTop: 0,
          offsetLeft: 0,
        }
      }

      const viewportRowCapacity =
        viewportSize.height > 0
          ? Math.ceil(viewportSize.height / rowHeight)
          : rowCount

      const tentativeRowStart = Math.floor(scrollTop / rowHeight)
      const rowStart = clamp(tentativeRowStart - overscanRows, 0, rowCount - 1)
      const rowEnd = clamp(
        rowStart + viewportRowCapacity + overscanRows * 2,
        0,
        rowCount,
      )

      const columnStart = findColumnIndex(columnMetrics, scrollLeft)
      const viewportWidth = viewportSize.width > 0 ? viewportSize.width : contentWidth
      const viewportRight = scrollLeft + viewportWidth

      let columnEnd = columnStart
      while (
        columnEnd < columnMetrics.length &&
        columnMetrics[columnEnd].offset +
          columnMetrics[columnEnd].width <
          viewportRight
      ) {
        columnEnd += 1
      }

      const baseEnd = clamp(columnEnd + 1, columnStart + 1, columnMetrics.length)

      const overscannedStart = Math.max(columnStart - overscanColumns, 0)
      const overscannedEnd = clamp(
        baseEnd + overscanColumns,
        overscannedStart + 1,
        columnMetrics.length,
      )

      const isAtStart = scrollLeft <= 0
      const isAtEnd = viewportRight >= contentWidth

      const effectiveStart = isAtStart ? 0 : overscannedStart
      const effectiveEnd = isAtEnd ? columnMetrics.length : overscannedEnd

      const maxOffset = Math.max(contentWidth - viewportWidth, 0)
      const firstMetric = columnMetrics[effectiveStart]
      let offsetLeft = firstMetric ? firstMetric.offset : 0

      if (isAtStart) {
        offsetLeft = 0
      }

      offsetLeft = clamp(offsetLeft, 0, maxOffset)

      return {
        rowStart,
        rowEnd,
        columnStart: effectiveStart,
        columnEnd: effectiveEnd,
        offsetTop: rowStart * rowHeight,
        offsetLeft: Math.max(offsetLeft, 0),
      }
    },
    [
      rowCount,
      columnMetrics,
      viewportSize.height,
      viewportSize.width,
      rowHeight,
      overscanRows,
      overscanColumns,
      contentWidth,
    ],
  )

  const emitViewportChange = useCallback(
    (nextRange: VirtualRange, scrollTop: number, scrollLeft: number) => {
      if (!onViewportChange) {
        return
      }

      onViewportChange({
        rowStart: nextRange.rowStart,
        rowEnd: nextRange.rowEnd,
        columnStart: nextRange.columnStart,
        columnEnd: nextRange.columnEnd,
        top: scrollTop,
        left: scrollLeft,
      })
    },
    [onViewportChange],
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollLeft } = event.currentTarget
      const nextRange = computeRange(scrollTop, scrollLeft)
      setRange(nextRange)
      emitViewportChange(nextRange, scrollTop, scrollLeft)
      setScrollPosition({ top: scrollTop, left: scrollLeft })
    },
    [computeRange, emitViewportChange],
  )

  useEffect(() => {
    const node = scrollRef.current
    if (!node) {
      return
    }

    const nextRange = computeRange(node.scrollTop, node.scrollLeft)
    setRange(nextRange)
    emitViewportChange(nextRange, node.scrollTop, node.scrollLeft)
    setScrollPosition({ top: node.scrollTop, left: node.scrollLeft })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRange, scrollRef, viewportSize.height, viewportSize.width])

  return {
    range,
    contentWidth,
    contentHeight,
    handleScroll,
    scrollTop: scrollPosition.top,
    scrollLeft: scrollPosition.left,
  }
}

export default useVirtualGrid
