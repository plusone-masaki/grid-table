/**
 * Data normalization utilities
 */

import type { CellPosition } from '@/types/data-display-edit'

/**
 * Normalize 2D array data to ensure consistent column count
 * @param data - Input 2D string array
 * @returns Normalized 2D string array with consistent column count
 */
export const normalizeData = (data: string[][]): string[][] => {
  if (!data || data.length === 0) {
    return [['']]
  }

  // Find maximum column count
  const maxCols = Math.max(...data.map(row => row.length))

  // Normalize each row to have the same column count
  return data.map(row => {
    const normalizedRow = [...row]
    while (normalizedRow.length < maxCols) {
      normalizedRow.push('')
    }
    return normalizedRow
  })
}

/**
 * Get dimensions of 2D array data
 * @param data - 2D string array
 * @returns Object with rows and cols count
 */
export const getDataDimensions = (data: string[][]): { rows: number; cols: number } => {
  if (!data || data.length === 0) {
    return { rows: 0, cols: 0 }
  }

  const rows = data.length
  const cols = Math.max(...data.map(row => row.length))
  
  return { rows, cols }
}

/**
 * Validate cell position is within data bounds
 * @param position - Cell position to validate
 * @param dimensions - Data dimensions
 * @returns True if position is valid
 */
export const isValidPosition = (
  position: CellPosition, 
  dimensions: { rows: number; cols: number }
): boolean => {
  return (
    position.row >= 0 &&
    position.row < dimensions.rows &&
    position.col >= 0 &&
    position.col < dimensions.cols
  )
}

/**
 * Create empty 2D array with specified dimensions
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @returns Empty 2D string array
 */
export const createEmptyData = (rows: number, cols: number): string[][] => {
  return Array(rows).fill(null).map(() => Array(cols).fill(''))
}

/**
 * Clone 2D array data
 * @param data - 2D string array to clone
 * @returns Cloned 2D string array
 */
export const cloneData = (data: string[][]): string[][] => {
  return data.map(row => [...row])
}
