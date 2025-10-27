import { useMemo } from 'react'
import type { ComputedRowMetrics, GridDataset } from 'types/grid'
import {
  BASE_ROW_HEIGHT,
  CHAR_PER_LINE,
  DEFAULT_SAMPLE_SIZE,
  EXTRA_LINE_HEIGHT,
  MAX_ROW_HEIGHT,
  MIN_ROW_HEIGHT,
} from '../constants/grid-table'

interface ColumnDefinitionInput {
  id: string
  header: string
}

interface UseRowMetricsParams {
  columns: ColumnDefinitionInput[]
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

const computeWrappedLineCount = (value: string): number => {
  if (value.length === 0) {
    return 1
  }

  return value
    .split('\n')
    .reduce((lineCount, segment) => {
      const normalizedLength = segment.length
      const wrappedLines = Math.max(
        1,
        Math.ceil(normalizedLength / CHAR_PER_LINE),
      )
      return lineCount + wrappedLines
    }, 0)
}

export const useRowMetrics = ({
  columns,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  priorityRowIndices,
}: UseRowMetricsParams): ComputedRowMetrics =>
  useMemo(() => {
    const headerMaxLines = columns.reduce((maxLines, column) => {
      const columnLines = computeWrappedLineCount(column.header)
      return Math.max(maxLines, columnLines)
    }, 1)
    const headerBaselineHeight = computeHeightFromLineCount(headerMaxLines)

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
      const rowLines = columns.reduce((rowMax, column) => {
        const cellValue = row[column.id]
        const cellText = cellValue === null || cellValue === undefined
          ? ''
          : String(cellValue)
        const cellLines = computeWrappedLineCount(cellText)
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

      const rowLines = columns.reduce((rowMax, column) => {
        const cellValue = row[column.id]
        const cellText = cellValue === null || cellValue === undefined
          ? ''
          : String(cellValue)
        const cellLines = computeWrappedLineCount(cellText)
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
  }, [columns, data, sampleSize, priorityRowIndices])

export default useRowMetrics
