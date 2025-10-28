import { useMemo } from 'react'
import type {
  ComputedColumnMetrics,
  ComputedRowMetrics,
  GridDataset,
  GridCellValue,
} from 'types/grid'
import {
  BASE_ROW_HEIGHT,
  CHAR_PIXEL_WIDTH,
  DEFAULT_SAMPLE_SIZE,
  EXTRA_LINE_HEIGHT,
  MAX_ROW_HEIGHT,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
} from '../constants/grid-table'

interface ColumnDefinitionInput {
  id: string
  header: string
}

interface UseRowMetricsParams {
  columns: ColumnDefinitionInput[]
  columnMetrics: ComputedColumnMetrics[]
  data: GridDataset
  sampleSize?: number
  priorityRowIndices?: number[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const computeHeightFromLineCount = (lineCount: number): number => {
  const extraLines = Math.max(lineCount - 1, 0)
  const computedHeight = BASE_ROW_HEIGHT + extraLines * EXTRA_LINE_HEIGHT
  return clamp(computedHeight, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT)
}

const MIN_CONTENT_WIDTH = 8
const CELL_CONTENT_GUTTER = 8
const FALLBACK_FONT =
  '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

interface MeasurementCache {
  context: CanvasRenderingContext2D
  letterSpacing: number
  horizontalPadding: number
  signature: string
}

let measurementCache: MeasurementCache | null = null

const resolveMeasurementCache = (): MeasurementCache | null => {
  if (typeof document === 'undefined') {
    return null
  }

  if (!measurementCache) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }
    measurementCache = {
      context,
      letterSpacing: 0,
      horizontalPadding: CELL_CONTENT_GUTTER,
      signature: '',
    }
  }

  if (typeof window === 'undefined') {
    return measurementCache
  }

  const referenceCell = document.querySelector(
    '.grid-table__table tbody td',
  ) as HTMLElement | null

  if (!referenceCell) {
    return measurementCache
  }

  const computed = window.getComputedStyle(referenceCell)
  const fontValue =
    computed.font && computed.font !== 'normal'
      ? computed.font
      : [
          computed.fontStyle,
          computed.fontVariant,
          computed.fontWeight,
          computed.fontSize,
          computed.fontFamily,
        ]
          .filter(Boolean)
          .join(' ')

  const resolvedFont = fontValue || FALLBACK_FONT
  const letterSpacing =
    computed.letterSpacing === 'normal'
      ? 0
      : Number.parseFloat(computed.letterSpacing || '0') || 0

  const paddingLeft = Number.parseFloat(computed.paddingLeft || '0') || 0
  const paddingRight = Number.parseFloat(computed.paddingRight || '0') || 0
  const totalPadding = paddingLeft + paddingRight
  const resolvedPadding =
    Number.isFinite(totalPadding) && totalPadding >= 0
      ? totalPadding
      : CELL_CONTENT_GUTTER

  const signature = [
    resolvedFont,
    letterSpacing,
    resolvedPadding,
  ].join('|')

  if (measurementCache.signature !== signature) {
    measurementCache.context.font = resolvedFont
    measurementCache.letterSpacing = letterSpacing
    measurementCache.horizontalPadding = resolvedPadding
    measurementCache.signature = signature
  }

  return measurementCache
}

const measureSegmentWidth = (segment: string): number => {
  if (!segment) {
    return 0
  }

  const cache = resolveMeasurementCache()
  if (cache) {
    const metrics = cache.context.measureText(segment)
    const spacingCompensation =
      cache.letterSpacing !== 0 && segment.length > 1
        ? cache.letterSpacing * (segment.length - 1)
        : 0
    const measuredWidth = metrics.width + spacingCompensation
    if (Number.isFinite(measuredWidth)) {
      return measuredWidth
    }
  }

  return segment.length * CHAR_PIXEL_WIDTH
}

const computeMultilineDisplayLines = (
  value: string,
  metric: ComputedColumnMetrics | undefined,
): number => {
  const cache = resolveMeasurementCache()
  const padding = cache ? cache.horizontalPadding : CELL_CONTENT_GUTTER
  const segments = value.split(/\r?\n/)
  const columnWidth = metric?.width ?? MIN_COLUMN_WIDTH
  const availableWidth = Math.max(
    columnWidth - padding,
    MIN_CONTENT_WIDTH,
  )

  let totalLines = 0
  for (const segment of segments) {
    if (segment.length === 0) {
      totalLines += 1
      continue
    }

    const segmentWidth = measureSegmentWidth(segment)
    const wrappedLines = Math.max(
      1,
      Math.ceil(segmentWidth / availableWidth),
    )
    totalLines += wrappedLines
  }

  return Math.max(totalLines, 1)
}

const computeCellLineCount = (
  value: GridCellValue,
  metric: ComputedColumnMetrics | undefined,
): number => {
  const text =
    value === null || value === undefined ? '' : String(value)

  if (text.length === 0) {
    return 1
  }

  const hasExplicitBreak = /\r?\n/.test(text)
  if (!hasExplicitBreak) {
    return 1
  }

  return computeMultilineDisplayLines(text, metric)
}

export const useRowMetrics = ({
  columns,
  columnMetrics,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  priorityRowIndices,
}: UseRowMetricsParams): ComputedRowMetrics =>
  useMemo(() => {
    const headerMaxLines = columns.reduce((maxLines, column) => {
      const columnLines = column.header
        ? column.header.split(/\r?\n/).length
        : 1
      return Math.max(maxLines, columnLines)
    }, 1)
    const sampleIndices: number[] = []
    const maxInitialSample = Math.min(sampleSize, data.length)

    for (let index = 0; index < maxInitialSample; index += 1) {
      sampleIndices.push(index)
    }

    if (priorityRowIndices) {
      priorityRowIndices.forEach((rowIndex) => {
        if (
          Number.isInteger(rowIndex) &&
          rowIndex >= 0 &&
          rowIndex < data.length &&
          !sampleIndices.includes(rowIndex)
        ) {
          sampleIndices.push(rowIndex)
        }
      })
    }

    const sampleRows = sampleIndices.map((index) => data[index]).filter(Boolean)

    const bodyMaxLines = sampleRows.reduce((outerMax, row) => {
      const rowLines = columns.reduce((rowMax, column, columnIndex) => {
        const cellLines = computeCellLineCount(
          row[column.id],
          columnMetrics[columnIndex],
        )
        return Math.max(rowMax, cellLines)
      }, 1)

      return Math.max(outerMax, rowLines)
    }, 1)

    const dominantLines = Math.max(headerMaxLines, bodyMaxLines)
    const dominantHeight = computeHeightFromLineCount(dominantLines)

    if (data.length === 0) {
      return {
        defaultHeight: dominantHeight,
        heights: [],
        offsets: [],
        totalHeight: 0,
      }
    }

    const rowHeights = data.map((row) => {
      if (!row) {
        return dominantHeight
      }

      const rowLines = columns.reduce((rowMax, column, columnIndex) => {
        const cellLines = computeCellLineCount(
          row[column.id],
          columnMetrics[columnIndex],
        )
        return Math.max(rowMax, cellLines)
      }, 1)

      const effectiveLines = Math.max(headerMaxLines, rowLines)
      return computeHeightFromLineCount(effectiveLines)
    })

    const rowOffsets: number[] = new Array(rowHeights.length)
    let runningOffset = 0
    for (let index = 0; index < rowHeights.length; index += 1) {
      rowOffsets[index] = runningOffset
      runningOffset += rowHeights[index]
    }

    return {
      defaultHeight: dominantHeight,
      heights: rowHeights,
      offsets: rowOffsets,
      totalHeight: runningOffset,
    }
  }, [columns, columnMetrics, data, sampleSize, priorityRowIndices])

export default useRowMetrics
