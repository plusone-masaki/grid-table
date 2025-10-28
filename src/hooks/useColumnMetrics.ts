import { useMemo } from 'react'
import type {
  ComputedColumnMetrics,
  GridDataset,
  GridCellValue,
} from '../types/grid'
import {
  DEFAULT_SAMPLE_SIZE,
  MIN_COLUMN_WIDTH,
} from '../constants/grid-table'
import {
  getCellContentInsets,
  measureTextContentWidth,
} from '../utils/text-measurement'

export interface ColumnDefinitionInput {
  id: string
  header: string
  isFrozen: boolean
}

interface UseColumnMetricsParams {
  columns: ColumnDefinitionInput[]
  data: GridDataset
  sampleSize?: number
  priorityRowIndices?: number[]
}

const measureValueContentWidth = (value: GridCellValue): number => {
  if (value === null || value === undefined) {
    return measureTextContentWidth('')
  }

  const text = String(value)
  const lines = text.split(/\r?\n/)

  let maxWidth = 0
  for (const line of lines) {
    const width = measureTextContentWidth(line)
    if (width > maxWidth) {
      maxWidth = width
    }
  }

  return maxWidth
}

export const useColumnMetrics = ({
  columns,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  priorityRowIndices,
}: UseColumnMetricsParams): ComputedColumnMetrics[] =>
  useMemo(() => {
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
    const { total: horizontalInset } = getCellContentInsets()
    let offset = 0

    return columns.map((column) => {
      const headerContentWidth = measureValueContentWidth(column.header)
      const bodyWidth = sampleRows.reduce((maxWidth, row) => {
        const cellWidth = measureValueContentWidth(row[column.id])
        return Math.max(maxWidth, cellWidth)
      }, headerContentWidth)

      const width = Math.max(
        Math.ceil(bodyWidth + horizontalInset),
        MIN_COLUMN_WIDTH,
      )
      const metric: ComputedColumnMetrics = {
        id: column.id,
        width,
        offset,
        isFrozen: column.isFrozen,
      }

      offset += width
      return metric
    })
  }, [columns, data, sampleSize, priorityRowIndices])

export default useColumnMetrics
