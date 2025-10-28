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
  '14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

let measurementElement: HTMLSpanElement | null = null
let measurementStyleSignature = ''
let horizontalPadding = CELL_CONTENT_GUTTER

const ensureMeasurementElement = (): HTMLSpanElement | null => {
  if (typeof document === 'undefined') {
    return null
  }

  if (!measurementElement) {
    const element = document.createElement('span')
    element.setAttribute('data-grid-table-measure', 'true')
    element.style.position = 'absolute'
    element.style.visibility = 'hidden'
    element.style.pointerEvents = 'none'
    element.style.userSelect = 'none'
    element.style.whiteSpace = 'pre'
    element.style.padding = '0'
    element.style.margin = '0'
    element.style.border = '0'
    element.style.top = '-9999px'
    element.style.left = '-9999px'
    element.style.font = FALLBACK_FONT
    element.style.letterSpacing = 'normal'
    element.style.fontKerning = 'auto'
    document.body.appendChild(element)
    measurementElement = element
    measurementStyleSignature = ''
  }

  if (!measurementElement) {
    return null
  }

  if (typeof window !== 'undefined') {
    const referenceCell = document.querySelector(
      '.grid-table__table tbody td',
    ) as HTMLElement | null

    if (referenceCell) {
      const computed = window.getComputedStyle(referenceCell)
      const signature = [
        computed.font,
        computed.letterSpacing,
        computed.fontKerning,
        computed.paddingLeft,
        computed.paddingRight,
      ].join('|')

      if (signature !== measurementStyleSignature) {
        measurementElement.style.font =
          computed.font && computed.font !== 'normal'
            ? computed.font
            : FALLBACK_FONT
        measurementElement.style.letterSpacing =
          computed.letterSpacing ?? 'normal'
        measurementElement.style.fontKerning =
          computed.fontKerning ?? 'auto'

        const paddingLeft =
          Number.parseFloat(computed.paddingLeft || '0') || 0
        const paddingRight =
          Number.parseFloat(computed.paddingRight || '0') || 0
        const resolvedPadding = paddingLeft + paddingRight
        horizontalPadding =
          Number.isFinite(resolvedPadding) && resolvedPadding >= 0
            ? resolvedPadding
            : CELL_CONTENT_GUTTER

        measurementStyleSignature = signature
      }
    }
  }

  return measurementElement
}

const measureSegmentWidth = (
  segment: string,
): number => {
  if (!segment) {
    return 0
  }

  const probe = ensureMeasurementElement()
  if (probe) {
    probe.textContent = segment.replace(/\s/g, (char) =>
      char === ' ' ? '\u00a0' : char,
    )
    const width = probe.getBoundingClientRect().width
    probe.textContent = ''
    if (Number.isFinite(width)) {
      return width
    }
  }

  return segment.length * CHAR_PIXEL_WIDTH
}

const computeMultilineDisplayLines = (
  value: string,
  metric: ComputedColumnMetrics | undefined,
): number => {
  ensureMeasurementElement()

  const segments = value.split(/\r?\n/)
  const columnWidth = metric?.width ?? MIN_COLUMN_WIDTH
  const availableWidth = Math.max(
    columnWidth - horizontalPadding,
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
