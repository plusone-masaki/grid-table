import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type {
  ComputedColumnMetrics,
  OverscanConfig,
  ViewportRange,
} from '../types/grid'
import { useResizeObserver } from './useResizeObserver'
import {
  DEFAULT_OVERSCAN_COLUMNS,
  DEFAULT_OVERSCAN_ROWS,
  MIN_ROW_HEIGHT,
} from '../constants/grid-table'

interface VirtualRange {
  rowStart: number
  rowEnd: number
  columnStart: number
  columnEnd: number
  offsetTop: number
  offsetLeft: number
}

interface ScrollPosition {
  top: number
  left: number
}

interface UseVirtualGridParams {
  rowCount: number
  columnMetrics: ComputedColumnMetrics[]
  rowHeights: number[]
  overscan?: OverscanConfig
  scrollRef: RefObject<HTMLDivElement | null>
  onViewportChange?: (viewport: ViewportRange) => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const areRangesEqual = (a: VirtualRange, b: VirtualRange) =>
  a.rowStart === b.rowStart &&
  a.rowEnd === b.rowEnd &&
  a.columnStart === b.columnStart &&
  a.columnEnd === b.columnEnd &&
  a.offsetTop === b.offsetTop &&
  a.offsetLeft === b.offsetLeft

const areScrollPositionsEqual = (a: ScrollPosition, b: ScrollPosition) =>
  a.top === b.top && a.left === b.left

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
  rowHeights,
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
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    top: 0,
    left: 0,
  })
  const rangeRef = useRef(range)
  const scrollPositionRef = useRef(scrollPosition)
  const contentWidth = useMemo(() => {
    if (columnMetrics.length === 0) {
      return 0
    }
    const lastMetric = columnMetrics[columnMetrics.length - 1]
    return lastMetric.offset + lastMetric.width
  }, [columnMetrics])

  const {
    effectiveRowHeights,
    rowOffsets,
    contentHeight,
  } = useMemo(() => {
    if (rowCount === 0) {
      return {
        effectiveRowHeights: [] as number[],
        rowOffsets: [] as number[],
        contentHeight: 0,
      }
    }

    const normalizedHeights: number[] = new Array(rowCount)
    const fallbackHeight =
      rowHeights.find((height) => Number.isFinite(height) && height > 0) ??
      MIN_ROW_HEIGHT

    for (let index = 0; index < rowCount; index += 1) {
      const height = rowHeights[index]
      normalizedHeights[index] =
        Number.isFinite(height) && height > 0 ? height : fallbackHeight
    }

    const offsets: number[] = new Array(rowCount)
    let runningOffset = 0
    for (let index = 0; index < rowCount; index += 1) {
      offsets[index] = runningOffset
      runningOffset += normalizedHeights[index]
    }

    return {
      effectiveRowHeights: normalizedHeights,
      rowOffsets: offsets,
      contentHeight: runningOffset,
    }
  }, [rowCount, rowHeights])

  const findRowIndex = useCallback(
    (value: number): number => {
      if (rowCount === 0) {
        return 0
      }

      let low = 0
      let high = rowCount - 1

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const rowStart = rowOffsets[mid]
        const rowEnd = rowStart + effectiveRowHeights[mid]

        if (value < rowStart) {
          high = mid - 1
        } else if (value >= rowEnd) {
          low = mid + 1
        } else {
          return mid
        }
      }

      return clamp(low, 0, Math.max(rowCount - 1, 0))
    },
    [rowCount, rowOffsets, effectiveRowHeights],
  )

  const computeRange = useCallback(
    (scrollTop: number, scrollLeft: number): VirtualRange => {
      if (
        rowCount === 0 ||
        columnMetrics.length === 0 ||
        effectiveRowHeights.length === 0
      ) {
        return {
          rowStart: 0,
          rowEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          offsetTop: 0,
          offsetLeft: 0,
        }
      }

      const viewportHeight =
        viewportSize.height > 0 ? viewportSize.height : contentHeight
      const maxScrollTop = Math.max(contentHeight - viewportHeight, 0)
      const clampedScrollTop = clamp(scrollTop, 0, maxScrollTop)
      const viewportBottom = clampedScrollTop + viewportHeight
      const baseRowStart = findRowIndex(clampedScrollTop)

      let baseRowEnd = baseRowStart
      let coveredBottom =
        rowOffsets[baseRowStart] + effectiveRowHeights[baseRowStart]

      while (
        baseRowEnd + 1 < rowCount &&
        coveredBottom < viewportBottom
      ) {
        baseRowEnd += 1
        coveredBottom =
          rowOffsets[baseRowEnd] + effectiveRowHeights[baseRowEnd]
      }

      const baseRowEndExclusive = Math.min(baseRowEnd + 1, rowCount)
      const overscannedStart = Math.max(baseRowStart - overscanRows, 0)
      const overscannedEnd = Math.min(
        Math.max(baseRowEndExclusive + overscanRows, overscannedStart + 1),
        rowCount,
      )

      const offsetTop = rowOffsets[overscannedStart] ?? 0

      const columnStart = findColumnIndex(columnMetrics, scrollLeft)
      const viewportWidth =
        viewportSize.width > 0 ? viewportSize.width : contentWidth
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

      const overscannedColumnStart = Math.max(columnStart - overscanColumns, 0)
      const overscannedColumnEnd = clamp(
        baseEnd + overscanColumns,
        overscannedColumnStart + 1,
        columnMetrics.length,
      )

      const isAtStart = scrollLeft <= 0
      const isAtEnd = viewportRight >= contentWidth

      const effectiveColumnStart = isAtStart ? 0 : overscannedColumnStart
      const effectiveColumnEnd = isAtEnd
        ? columnMetrics.length
        : overscannedColumnEnd

      const maxOffset = Math.max(contentWidth - viewportWidth, 0)
      const firstMetric = columnMetrics[effectiveColumnStart]
      let offsetLeft = firstMetric ? firstMetric.offset : 0

      if (isAtStart) {
        offsetLeft = 0
      }

      offsetLeft = clamp(offsetLeft, 0, maxOffset)

      return {
        rowStart: overscannedStart,
        rowEnd: overscannedEnd,
        columnStart: effectiveColumnStart,
        columnEnd: effectiveColumnEnd,
        offsetTop,
        offsetLeft: Math.max(offsetLeft, 0),
      }
    },
    [
      rowCount,
      columnMetrics,
      effectiveRowHeights,
      viewportSize.height,
      viewportSize.width,
      contentHeight,
      findRowIndex,
      rowOffsets,
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

  const updateViewportState = useCallback(
    (nextRange: VirtualRange, scrollTop: number, scrollLeft: number) => {
      const nextScrollPosition: ScrollPosition = {
        top: scrollTop,
        left: scrollLeft,
      }

      const hasRangeChanged = !areRangesEqual(rangeRef.current, nextRange)
      const hasScrollChanged = !areScrollPositionsEqual(
        scrollPositionRef.current,
        nextScrollPosition,
      )

      if (!hasRangeChanged && !hasScrollChanged) {
        return false
      }

      if (hasRangeChanged) {
        rangeRef.current = nextRange
        setRange(nextRange)
      }

      if (hasScrollChanged) {
        scrollPositionRef.current = nextScrollPosition
        setScrollPosition(nextScrollPosition)
      }

      return true
    },
    [setRange, setScrollPosition],
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollLeft } = event.currentTarget
      const nextRange = computeRange(scrollTop, scrollLeft)
      const didUpdate = updateViewportState(nextRange, scrollTop, scrollLeft)

      if (didUpdate) {
        emitViewportChange(nextRange, scrollTop, scrollLeft)
      }
    },
    [computeRange, emitViewportChange, updateViewportState],
  )

  useEffect(() => {
    const node = scrollRef.current
    if (!node) {
      return
    }

    const { scrollTop, scrollLeft } = node
    const nextRange = computeRange(scrollTop, scrollLeft)
    const didUpdate = updateViewportState(nextRange, scrollTop, scrollLeft)

    if (didUpdate) {
      emitViewportChange(nextRange, scrollTop, scrollLeft)
    }
  }, [
    computeRange,
    emitViewportChange,
    scrollRef,
    updateViewportState,
    viewportSize.height,
    viewportSize.width,
  ])

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
