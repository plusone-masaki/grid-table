import { useMemo } from 'react'
import type {
  ComputedColumnMetrics,
  ComputedRowMetrics,
  GridDataset,
  GridCellValue,
} from 'types/grid'
import {
  DEFAULT_SAMPLE_SIZE,
  MAX_ROW_HEIGHT,
  MIN_ROW_HEIGHT,
} from '../constants/grid-table'
import { getCellContentInsets } from '../utils/text-measurement'

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
  manualRowHeights?: Map<number, number>
}

const countExplicitLines = (value: string): number =>
  Math.max(value.split(/\r?\n/).length, 1)

const clampHeight = (value: number): number =>
  Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, value))

export const useRowMetrics = ({
  columns,
  columnMetrics: _columnMetrics,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  priorityRowIndices,
  manualRowHeights,
}: UseRowMetricsParams): ComputedRowMetrics =>
  useMemo(() => {
    const { baseLineHeight, lineIncrement } = getCellContentInsets()
    const effectiveBaseLineHeight = Math.max(baseLineHeight, MIN_ROW_HEIGHT)
    const effectiveLineIncrement = lineIncrement > 0 ? lineIncrement : effectiveBaseLineHeight

    const computeHeightFromLineCount = (lineCount: number): number => {
      const extraLines = Math.max(lineCount - 1, 0)
      const height =
        effectiveBaseLineHeight + extraLines * effectiveLineIncrement
      return clampHeight(height)
    }

    const headerBaselineHeight = columns.reduce((maxHeight, column) => {
      const text = column.header ?? ''
      const lineCount = countExplicitLines(text)
      const height = computeHeightFromLineCount(lineCount)
      return Math.max(maxHeight, height)
    }, effectiveBaseLineHeight)

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

    const computeCellHeight = (value: GridCellValue): number => {
      const text = value === null || value === undefined ? '' : String(value)
      const lineCount = countExplicitLines(text)
      return computeHeightFromLineCount(lineCount)
    }

    const sampleMaxHeight = sampleRows.reduce((outerMax, row) => {
      const rowHeight = columns.reduce((rowMax, column) => {
        const cellHeight = computeCellHeight(row[column.id])
        return Math.max(rowMax, cellHeight)
      }, headerBaselineHeight)

      return Math.max(outerMax, rowHeight)
    }, headerBaselineHeight)

    const dominantHeight = Math.max(
      effectiveBaseLineHeight,
      headerBaselineHeight,
      sampleMaxHeight,
    )

    if (data.length === 0) {
      return {
        heights: [],
        offsets: [],
        totalHeight: 0,
      }
    }

    const rowHeights = data.map((row, rowIndex) => {
      if (!row) {
        const manualHeight = manualRowHeights?.get(rowIndex)
        if (manualHeight !== undefined) {
          return clampHeight(manualHeight)
        }
        return clampHeight(dominantHeight)
      }

      const manualHeight = manualRowHeights?.get(rowIndex)
      if (manualHeight !== undefined) {
        return clampHeight(manualHeight)
      }

      const rowHeight = columns.reduce((rowMax, column) => {
        const cellHeight = computeCellHeight(row[column.id])
        return Math.max(rowMax, cellHeight)
      }, effectiveBaseLineHeight)

      return clampHeight(
        Math.max(rowHeight, headerBaselineHeight, effectiveBaseLineHeight),
      )
    })

    const rowOffsets: number[] = new Array(rowHeights.length)
    let runningOffset = 0
    for (let index = 0; index < rowHeights.length; index += 1) {
      rowOffsets[index] = runningOffset
      runningOffset += rowHeights[index]
    }

    return {
      heights: rowHeights,
      offsets: rowOffsets,
      totalHeight: runningOffset,
    }
  }, [columns, data, sampleSize, priorityRowIndices, manualRowHeights])

export default useRowMetrics
