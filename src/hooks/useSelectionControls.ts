import { useCallback, useMemo } from 'react'
import type { CellCoordinate } from 'types/grid'
import type GridTableHandle from '../types/grid-table'

interface CommitEditingOptions {
  nextSelection?: CellCoordinate | null
  skipSelectionUpdate?: boolean
}

type CommitEditingFn = (options?: CommitEditingOptions) => void

export interface UseSelectionControlsParams {
  rowCount: number
  columnCount: number
  editingCell: CellCoordinate | null
  commitEditing: CommitEditingFn
  updateSelectionState: (anchor: CellCoordinate, focus: CellCoordinate) => void
  resetSelectionState: () => void
}

export type SelectionControls = GridTableHandle & {
  selectRowRange: (startRow: number, endRow: number) => void
  selectColumnRange: (startColumn: number, endColumn: number) => void
}

const useSelectionControls = ({
  rowCount,
  columnCount,
  editingCell,
  commitEditing,
  updateSelectionState,
  resetSelectionState,
}: UseSelectionControlsParams): SelectionControls => {
  const selectRowRange = useCallback(
    (startRow: number, endRow: number) => {
      if (!Number.isInteger(startRow) || !Number.isInteger(endRow)) {
        return
      }

      if (rowCount === 0 || columnCount === 0) {
        resetSelectionState()
        return
      }

      const clampedStart = Math.max(0, Math.min(startRow, rowCount - 1))
      const clampedEnd = Math.max(0, Math.min(endRow, rowCount - 1))
      const rangeStart = Math.min(clampedStart, clampedEnd)
      const rangeEnd = Math.max(clampedStart, clampedEnd)

      if (editingCell) {
        commitEditing({ skipSelectionUpdate: true })
      }

      const anchorCell: CellCoordinate = {
        rowIndex: rangeStart,
        columnIndex: 0,
      }
      const focusCell: CellCoordinate = {
        rowIndex: rangeEnd,
        columnIndex: columnCount - 1,
      }

      updateSelectionState(anchorCell, focusCell)
    },
    [
      rowCount,
      columnCount,
      editingCell,
      commitEditing,
      updateSelectionState,
      resetSelectionState,
    ],
  )

  const selectColumnRange = useCallback(
    (startColumn: number, endColumn: number) => {
      if (!Number.isInteger(startColumn) || !Number.isInteger(endColumn)) {
        return
      }

      if (rowCount === 0 || columnCount === 0) {
        resetSelectionState()
        return
      }

      const clampedStart = Math.max(0, Math.min(startColumn, columnCount - 1))
      const clampedEnd = Math.max(0, Math.min(endColumn, columnCount - 1))
      const rangeStart = Math.min(clampedStart, clampedEnd)
      const rangeEnd = Math.max(clampedStart, clampedEnd)

      if (editingCell) {
        commitEditing({ skipSelectionUpdate: true })
      }

      const anchorCell: CellCoordinate = {
        rowIndex: 0,
        columnIndex: rangeStart,
      }
      const focusCell: CellCoordinate = {
        rowIndex: rowCount - 1,
        columnIndex: rangeEnd,
      }

      updateSelectionState(anchorCell, focusCell)
    },
    [
      rowCount,
      columnCount,
      editingCell,
      commitEditing,
      updateSelectionState,
      resetSelectionState,
    ],
  )

  const selectRow = useCallback(
    (rowIndex: number) => {
      selectRowRange(rowIndex, rowIndex)
    },
    [selectRowRange],
  )

  const selectColumn = useCallback(
    (columnIndex: number) => {
      selectColumnRange(columnIndex, columnIndex)
    },
    [selectColumnRange],
  )

  const selectAll = useCallback(() => {
    if (rowCount === 0 || columnCount === 0) {
      resetSelectionState()
      return
    }

    if (editingCell) {
      commitEditing({ skipSelectionUpdate: true })
    }

    const anchorCell: CellCoordinate = {
      rowIndex: 0,
      columnIndex: 0,
    }
    const focusCell: CellCoordinate = {
      rowIndex: rowCount - 1,
      columnIndex: columnCount - 1,
    }

    updateSelectionState(anchorCell, focusCell)
  }, [
    rowCount,
    columnCount,
    editingCell,
    commitEditing,
    updateSelectionState,
    resetSelectionState,
  ])

  return useMemo(
    () => ({
      selectRow,
      selectColumn,
      selectAll,
      selectRowRange,
      selectColumnRange,
    }),
    [selectRow, selectColumn, selectAll, selectRowRange, selectColumnRange],
  )
}

export default useSelectionControls
