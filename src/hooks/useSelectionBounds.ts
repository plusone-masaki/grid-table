import { useMemo } from 'react'
import {
  HEADER_HEIGHT,
  MIN_ROW_HEIGHT,
} from '../constants/grid-table'
import type {
  CellCoordinate,
  NormalizedSelectionRange,
  SelectionRectangle,
  ComputedColumnMetrics,
} from 'types/grid'

const SELECTION_BORDER_OFFSET = 1

interface GeometryContext {
  columnMetrics: ComputedColumnMetrics[]
  rowOffsets: number[]
  rowHeights: number[]
  fallbackRowHeight: number
  rowIndexWidth: number
}

interface UseSelectionBoundsParams extends GeometryContext {
  normalizedSelectionRange: NormalizedSelectionRange | null
  editingCell: CellCoordinate | null
  anchorCell: CellCoordinate | null
}

const resolveRowOffset = (
  rowIndex: number,
  { rowOffsets, fallbackRowHeight }: GeometryContext,
): number => rowOffsets[rowIndex] ?? rowIndex * fallbackRowHeight

const resolveRowHeight = (
  rowIndex: number,
  { rowHeights, fallbackRowHeight }: GeometryContext,
): number => rowHeights[rowIndex] ?? fallbackRowHeight

const calculateCellBounds = (
  cell: CellCoordinate,
  geometry: GeometryContext,
  options?: { includeBorderOffset?: boolean },
): SelectionRectangle | null => {
  const columnMetric = geometry.columnMetrics[cell.columnIndex]
  if (!columnMetric) {
    return null
  }

  const rowTop = resolveRowOffset(cell.rowIndex, geometry)
  const rowHeight = resolveRowHeight(cell.rowIndex, geometry)
  const borderOffset = options?.includeBorderOffset ? SELECTION_BORDER_OFFSET : 0

  const top = Math.max(0, HEADER_HEIGHT + rowTop + borderOffset)
  const left = Math.max(
    0,
    geometry.rowIndexWidth + columnMetric.offset + borderOffset,
  )

  return {
    top,
    left,
    width: columnMetric.width,
    height: rowHeight,
  }
}

const calculateSelectionBounds = (
  range: NormalizedSelectionRange | null,
  geometry: GeometryContext,
): SelectionRectangle | null => {
  if (!range) {
    return null
  }

  const leftMetric = geometry.columnMetrics[range.leftColumn]
  const rightMetric = geometry.columnMetrics[range.rightColumn]

  if (!leftMetric || !rightMetric) {
    return null
  }

  const topOffset = resolveRowOffset(range.topRow, geometry)
  const bottomOffsetBase = resolveRowOffset(range.bottomRow, geometry)
  const bottomOffset =
    bottomOffsetBase + resolveRowHeight(range.bottomRow, geometry)

  const top = Math.max(
    0,
    HEADER_HEIGHT + topOffset + SELECTION_BORDER_OFFSET,
  )
  const height = Math.max(bottomOffset - topOffset, geometry.fallbackRowHeight)
  const left = Math.max(
    0,
    geometry.rowIndexWidth + leftMetric.offset + SELECTION_BORDER_OFFSET,
  )
  const width = rightMetric.offset + rightMetric.width - leftMetric.offset

  return {
    top,
    left,
    width,
    height,
  }
}

const useSelectionBounds = ({
  columnMetrics,
  rowOffsets,
  rowHeights,
  fallbackRowHeight,
  rowIndexWidth,
  normalizedSelectionRange,
  editingCell,
  anchorCell,
}: UseSelectionBoundsParams) => {
  const geometry = useMemo<GeometryContext>(
    () => ({
      columnMetrics,
      rowOffsets,
      rowHeights,
      fallbackRowHeight: Math.max(fallbackRowHeight, MIN_ROW_HEIGHT),
      rowIndexWidth,
    }),
    [columnMetrics, rowOffsets, rowHeights, fallbackRowHeight, rowIndexWidth],
  )

  const selectionBounds = useMemo(
    () => calculateSelectionBounds(normalizedSelectionRange, geometry),
    [normalizedSelectionRange, geometry],
  )

  const editingBounds = useMemo(
    () =>
      editingCell
        ? calculateCellBounds(editingCell, geometry)
        : null,
    [editingCell, geometry],
  )

  const anchorBounds = useMemo(
    () =>
      anchorCell
        ? calculateCellBounds(anchorCell, geometry, {
            includeBorderOffset: true,
          })
        : null,
    [anchorCell, geometry],
  )

  return {
    selectionBounds,
    editingBounds,
    anchorBounds,
  }
}

export default useSelectionBounds
