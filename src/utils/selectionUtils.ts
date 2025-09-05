/**
 * Selection utilities
 */

import type { CellPosition, SelectionRange } from '@/types/data-display-edit'

/**
 * Normalize selection range to ensure start is top-left, end is bottom-right
 * @param range - Selection range to normalize
 * @returns Normalized selection range
 */
export const normalizeSelectionRange = (range: SelectionRange): SelectionRange => {
  const start: CellPosition = {
    row: Math.min(range.start.row, range.end.row),
    col: Math.min(range.start.col, range.end.col)
  }
  
  const end: CellPosition = {
    row: Math.max(range.start.row, range.end.row),
    col: Math.max(range.start.col, range.end.col)
  }
  
  return { start, end }
}

/**
 * Check if a cell position is within a selection range
 * @param position - Cell position to check
 * @param range - Selection range
 * @returns True if position is within range
 */
export const isPositionInRange = (position: CellPosition, range: SelectionRange): boolean => {
  const normalizedRange = normalizeSelectionRange(range)
  
  return (
    position.row >= normalizedRange.start.row &&
    position.row <= normalizedRange.end.row &&
    position.col >= normalizedRange.start.col &&
    position.col <= normalizedRange.end.col
  )
}

/**
 * Calculate the area of a selection range
 * @param range - Selection range
 * @returns Area in number of cells
 */
export const getSelectionArea = (range: SelectionRange): number => {
  const normalizedRange = normalizeSelectionRange(range)
  const rows = normalizedRange.end.row - normalizedRange.start.row + 1
  const cols = normalizedRange.end.col - normalizedRange.start.col + 1
  
  return rows * cols
}

/**
 * Get all cell positions within a selection range
 * @param range - Selection range
 * @returns Array of cell positions
 */
export const getCellsInRange = (range: SelectionRange): CellPosition[] => {
  const normalizedRange = normalizeSelectionRange(range)
  const cells: CellPosition[] = []
  
  for (let row = normalizedRange.start.row; row <= normalizedRange.end.row; row++) {
    for (let col = normalizedRange.start.col; col <= normalizedRange.end.col; col++) {
      cells.push({ row, col })
    }
  }
  
  return cells
}

/**
 * Check if two selection ranges overlap
 * @param range1 - First selection range
 * @param range2 - Second selection range
 * @returns True if ranges overlap
 */
export const doRangesOverlap = (range1: SelectionRange, range2: SelectionRange): boolean => {
  const norm1 = normalizeSelectionRange(range1)
  const norm2 = normalizeSelectionRange(range2)
  
  return !(
    norm1.end.row < norm2.start.row ||
    norm1.start.row > norm2.end.row ||
    norm1.end.col < norm2.start.col ||
    norm1.start.col > norm2.end.col
  )
}
