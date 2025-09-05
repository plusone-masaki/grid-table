/**
 * Rendering utilities
 */

import type { CellPosition } from '@/types/data-display-edit'

/**
 * Calculate cell position in pixels
 * @param position - Cell position
 * @param cellWidth - Width of each cell
 * @param cellHeight - Height of each cell
 * @returns Pixel position object
 */
export const calculateCellPixelPosition = (
  position: CellPosition,
  cellWidth: number,
  cellHeight: number
): { x: number; y: number } => {
  return {
    x: position.col * cellWidth,
    y: position.row * cellHeight
  }
}

/**
 * Calculate cell position from pixel coordinates
 * @param x - X pixel coordinate
 * @param y - Y pixel coordinate
 * @param cellWidth - Width of each cell
 * @param cellHeight - Height of each cell
 * @returns Cell position
 */
export const calculateCellPositionFromPixels = (
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number
): CellPosition => {
  return {
    row: Math.floor(y / cellHeight),
    col: Math.floor(x / cellWidth)
  }
}

/**
 * Check if a cell is visible in viewport
 * @param position - Cell position
 * @param viewport - Viewport bounds
 * @returns True if cell is visible
 */
export const isCellVisible = (
  position: CellPosition,
  viewport: {
    startRow: number
    endRow: number
    startCol: number
    endCol: number
  }
): boolean => {
  return (
    position.row >= viewport.startRow &&
    position.row <= viewport.endRow &&
    position.col >= viewport.startCol &&
    position.col <= viewport.endCol
  )
}

/**
 * Calculate viewport bounds for virtualization
 * @param scrollTop - Scroll top position
 * @param scrollLeft - Scroll left position
 * @param containerHeight - Container height
 * @param containerWidth - Container width
 * @param cellHeight - Height of each cell
 * @param cellWidth - Width of each cell
 * @param buffer - Buffer size in cells
 * @returns Viewport bounds
 */
export const calculateViewportBounds = (
  scrollTop: number,
  scrollLeft: number,
  containerHeight: number,
  containerWidth: number,
  cellHeight: number,
  cellWidth: number,
  buffer: number = 5
): {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
} => {
  const startRow = Math.max(0, Math.floor(scrollTop / cellHeight) - buffer)
  const endRow = Math.floor((scrollTop + containerHeight) / cellHeight) + buffer
  const startCol = Math.max(0, Math.floor(scrollLeft / cellWidth) - buffer)
  const endCol = Math.floor((scrollLeft + containerWidth) / cellWidth) + buffer
  
  return { startRow, endRow, startCol, endCol }
}

/**
 * Generate unique key for cell element
 * @param position - Cell position
 * @returns Unique key string
 */
export const generateCellKey = (position: CellPosition): string => {
  return `cell-${position.row}-${position.col}`
}

/**
 * Debounce function for performance optimization
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}
