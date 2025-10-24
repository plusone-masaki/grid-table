import { useMemo } from 'react'
import type { ComputedRowMetrics, GridDataset } from 'types/grid'

const DEFAULT_SAMPLE_SIZE = 50
const BASE_ROW_HEIGHT = 22
const MIN_ROW_HEIGHT = 22
const MAX_ROW_HEIGHT = 80
const CHAR_PER_LINE = 30
const EXTRA_LINE_HEIGHT = 12

interface ColumnDefinitionInput {
  id: string
  header: string
}

interface UseRowMetricsParams {
  columns: ColumnDefinitionInput[]
  data: GridDataset
  sampleSize?: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const useRowMetrics = ({
  columns,
  data,
  sampleSize = DEFAULT_SAMPLE_SIZE,
}: UseRowMetricsParams): ComputedRowMetrics =>
  useMemo(() => {
    if (data.length === 0) {
      return { height: BASE_ROW_HEIGHT }
    }

    const sampleRows = data.slice(0, sampleSize)
    const headerMax = columns.reduce(
      (maxLength, column) => Math.max(maxLength, column.header.length),
      0,
    )

    const bodyMax = sampleRows.reduce((outerMax, row) => {
      const rowMax = columns.reduce((innerMax, column) => {
        const cellValue = row[column.id]
        const cellLength =
          cellValue === null || cellValue === undefined
            ? 0
            : String(cellValue).length
        return Math.max(innerMax, cellLength)
      }, 0)

      return Math.max(outerMax, rowMax)
    }, 0)

    const dominantLength = Math.max(headerMax, bodyMax)
    const extraLines = Math.floor(dominantLength / CHAR_PER_LINE)
    const computedHeight = BASE_ROW_HEIGHT + extraLines * EXTRA_LINE_HEIGHT

    return {
      height: clamp(computedHeight, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT),
    }
  }, [columns, data, sampleSize])

export default useRowMetrics
