import { useMemo } from 'react'
import type {
  ComputedColumnMetrics,
  GridDataset,
  GridCellValue,
} from '../types/grid'
import {
  CELL_HORIZONTAL_PADDING,
  CHAR_PIXEL_WIDTH,
  DEFAULT_SAMPLE_SIZE,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from '../constants/grid-table'

export interface ColumnDefinitionInput {
  id: string
  header: string
  isFrozen: boolean
}

interface UseColumnMetricsParams {
  columns: ColumnDefinitionInput[]
  data: GridDataset
  sampleSize?: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const estimateTextWidth = (value: GridCellValue): number => {
  if (value === null || value === undefined) {
    return MIN_COLUMN_WIDTH
  }

  const text = String(value)
  return text.length * CHAR_PIXEL_WIDTH + CELL_HORIZONTAL_PADDING
}

export const useColumnMetrics = ({
  columns,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
}: UseColumnMetricsParams): ComputedColumnMetrics[] =>
  useMemo(() => {
    const sampleRows = data.slice(0, sampleSize)
    let offset = 0

    return columns.map((column) => {
      const headerWidth = estimateTextWidth(column.header)
      const bodyWidth = sampleRows.reduce((maxWidth, row) => {
        const cellWidth = estimateTextWidth(row[column.id])
        return Math.max(maxWidth, cellWidth)
      }, headerWidth)

      const width = clamp(bodyWidth, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH)
      const metric: ComputedColumnMetrics = {
        id: column.id,
        width,
        offset,
        isFrozen: column.isFrozen,
      }

      offset += width
      return metric
    })
  }, [columns, data, sampleSize])

export default useColumnMetrics
