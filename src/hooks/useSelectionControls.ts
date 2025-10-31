import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type {
  CellCoordinate,
  NormalizedSelectionRange,
  SelectionRange,
} from 'types/grid'
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
  onAnchorChange?: (anchor: CellCoordinate) => void
  onResetSelection?: () => void
}

type PointerState = { isSelecting: boolean; pointerId: number | null }

const cloneCellCoordinate = (coordinate: CellCoordinate): CellCoordinate => ({
  rowIndex: coordinate.rowIndex,
  columnIndex: coordinate.columnIndex,
})

const resolveCellFromEvent = (
  event: ReactPointerEvent<HTMLTableCellElement>,
): CellCoordinate | null => {
  const element = document.elementFromPoint(
    event.clientX,
    event.clientY,
  ) as HTMLElement | null

  if (!element) {
    return null
  }

  const cellElement = element.closest(
    '[data-cell-coordinate="true"]',
  ) as HTMLElement | null

  if (!cellElement) {
    return null
  }

  const rowAttr = cellElement.getAttribute('data-row-index')
  const columnAttr = cellElement.getAttribute('data-column-index')

  if (rowAttr === null || columnAttr === null) {
    return null
  }

  const rowIndex = Number(rowAttr)
  const columnIndex = Number(columnAttr)

  if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
    return null
  }

  return { rowIndex, columnIndex }
}

const releasePointerCapture = (
  target: EventTarget & HTMLTableCellElement,
  pointerId: number,
) => {
  try {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
  } catch {
    // releasePointerCapture が失敗しても処理継続
  }
}

export type SelectionControls = GridTableHandle & {
  selectionRange: SelectionRange | null
  normalizedSelectionRange: NormalizedSelectionRange | null
  anchorCell: CellCoordinate | null
  activeCell: CellCoordinate | null
  highlightedColumns: Set<number>
  highlightedRows: Set<number>
  fullySelectedColumns: Set<number>
  fullySelectedRows: Set<number>
  isAllSelected: boolean
  updateSelection: (anchor: CellCoordinate, focus: CellCoordinate) => void
  resetSelection: () => void
  handleCellPointerDown: (
    event: ReactPointerEvent<HTMLTableCellElement>,
    rowIndex: number,
    columnIndex: number,
  ) => void
  handleCellPointerMove: (
    event: ReactPointerEvent<HTMLTableCellElement>,
  ) => void
  handleCellPointerUp: (event: ReactPointerEvent<HTMLTableCellElement>) => void
  handleCellPointerCancel: (
    event: ReactPointerEvent<HTMLTableCellElement>,
  ) => void
  selectRowRange: (startRow: number, endRow: number) => void
  selectColumnRange: (startColumn: number, endColumn: number) => void
}

const useSelectionControls = ({
  rowCount,
  columnCount,
  editingCell,
  commitEditing,
  onAnchorChange,
  onResetSelection,
}: UseSelectionControlsParams): SelectionControls => {
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)
  const [anchorCell, setAnchorCell] = useState<CellCoordinate | null>(null)
  const [activeCell, setActiveCell] = useState<CellCoordinate | null>(null)
  const pointerStateRef = useRef<PointerState>({
    isSelecting: false,
    pointerId: null,
  })
  const anchorRef = useRef<CellCoordinate | null>(null)
  const lastFocusRef = useRef<CellCoordinate | null>(null)

  const resetSelection = useCallback(() => {
    setSelectionRange(null)
    setAnchorCell(null)
    setActiveCell(null)
    pointerStateRef.current = {
      isSelecting: false,
      pointerId: null,
    }
    anchorRef.current = null
    lastFocusRef.current = null
    if (onResetSelection) {
      onResetSelection()
    }
  }, [onResetSelection])

  const updateSelection = useCallback(
    (anchor: CellCoordinate, focus: CellCoordinate) => {
      const anchorClone = cloneCellCoordinate(anchor)
      const focusClone = cloneCellCoordinate(focus)

      setSelectionRange((prev) => {
        if (
          prev &&
          prev.anchor.rowIndex === anchorClone.rowIndex &&
          prev.anchor.columnIndex === anchorClone.columnIndex &&
          prev.focus.rowIndex === focusClone.rowIndex &&
          prev.focus.columnIndex === focusClone.columnIndex
        ) {
          return prev
        }
        return {
          anchor: anchorClone,
          focus: focusClone,
        }
      })

      setAnchorCell((prev) => {
        if (
          prev &&
          prev.rowIndex === anchorClone.rowIndex &&
          prev.columnIndex === anchorClone.columnIndex
        ) {
          return prev
        }
        return anchorClone
      })

      setActiveCell((prev) => {
        if (
          prev &&
          prev.rowIndex === focusClone.rowIndex &&
          prev.columnIndex === focusClone.columnIndex
        ) {
          return prev
        }
        return focusClone
      })

      anchorRef.current = anchorClone
      lastFocusRef.current = focusClone
      if (onAnchorChange) {
        onAnchorChange(anchorClone)
      }
    },
    [onAnchorChange],
  )

  useEffect(() => {
    if (selectionRange === null) {
      return
    }

    const { anchor, focus } = selectionRange
    const isRowInRange =
      anchor.rowIndex >= 0 &&
      anchor.rowIndex < rowCount &&
      focus.rowIndex >= 0 &&
      focus.rowIndex < rowCount
    const isColumnInRange =
      anchor.columnIndex >= 0 &&
      anchor.columnIndex < columnCount &&
      focus.columnIndex >= 0 &&
      focus.columnIndex < columnCount

    if (!isRowInRange || !isColumnInRange) {
      resetSelection()
    }
  }, [selectionRange, rowCount, columnCount, resetSelection])

  const normalizedSelectionRange = useMemo<NormalizedSelectionRange | null>(() => {
    if (selectionRange === null) {
      return null
    }

    const { anchor, focus } = selectionRange

    return {
      topRow: Math.min(anchor.rowIndex, focus.rowIndex),
      bottomRow: Math.max(anchor.rowIndex, focus.rowIndex),
      leftColumn: Math.min(anchor.columnIndex, focus.columnIndex),
      rightColumn: Math.max(anchor.columnIndex, focus.columnIndex),
    }
  }, [selectionRange])

  const fullySelectedColumns = useMemo(() => {
    if (
      !normalizedSelectionRange ||
      rowCount === 0 ||
      columnCount === 0 ||
      normalizedSelectionRange.topRow !== 0 ||
      normalizedSelectionRange.bottomRow !== rowCount - 1
    ) {
      return new Set<number>()
    }

    const selected = new Set<number>()
    for (
      let columnIndex = normalizedSelectionRange.leftColumn;
      columnIndex <= normalizedSelectionRange.rightColumn;
      columnIndex += 1
    ) {
      selected.add(columnIndex)
    }
    return selected
  }, [normalizedSelectionRange, rowCount, columnCount])

  const fullySelectedRows = useMemo(() => {
    if (
      !normalizedSelectionRange ||
      rowCount === 0 ||
      columnCount === 0 ||
      normalizedSelectionRange.leftColumn !== 0 ||
      normalizedSelectionRange.rightColumn !== columnCount - 1
    ) {
      return new Set<number>()
    }

    const selected = new Set<number>()
    for (
      let rowIndex = normalizedSelectionRange.topRow;
      rowIndex <= normalizedSelectionRange.bottomRow;
      rowIndex += 1
    ) {
      selected.add(rowIndex)
    }
    return selected
  }, [normalizedSelectionRange, rowCount, columnCount])

  const isAllSelected = useMemo(
    () =>
      rowCount > 0 &&
      columnCount > 0 &&
      fullySelectedColumns.size === columnCount &&
      fullySelectedRows.size === rowCount,
    [rowCount, columnCount, fullySelectedColumns, fullySelectedRows],
  )

  const highlightedColumns = useMemo(() => {
    const set = new Set<number>()
    if (normalizedSelectionRange) {
      for (
        let columnIndex = normalizedSelectionRange.leftColumn;
        columnIndex <= normalizedSelectionRange.rightColumn;
        columnIndex += 1
      ) {
        set.add(columnIndex)
      }
    }
    if (activeCell) {
      set.add(activeCell.columnIndex)
    }
    return set
  }, [normalizedSelectionRange, activeCell])

  const highlightedRows = useMemo(() => {
    const set = new Set<number>()
    if (normalizedSelectionRange) {
      for (
        let rowIndex = normalizedSelectionRange.topRow;
        rowIndex <= normalizedSelectionRange.bottomRow;
        rowIndex += 1
      ) {
        set.add(rowIndex)
      }
    }
    if (activeCell) {
      set.add(activeCell.rowIndex)
    }
    return set
  }, [normalizedSelectionRange, activeCell])

  const selectRowRange = useCallback(
    (startRow: number, endRow: number) => {
      if (!Number.isInteger(startRow) || !Number.isInteger(endRow)) {
        return
      }

      if (rowCount === 0 || columnCount === 0) {
        resetSelection()
        return
      }

      const clampedStart = Math.max(0, Math.min(startRow, rowCount - 1))
      const clampedEnd = Math.max(0, Math.min(endRow, rowCount - 1))
      const rangeStart = Math.min(clampedStart, clampedEnd)
      const rangeEnd = Math.max(clampedStart, clampedEnd)

      if (editingCell) {
        commitEditing({ skipSelectionUpdate: true })
      }

      const anchorCellTarget: CellCoordinate = {
        rowIndex: rangeStart,
        columnIndex: 0,
      }
      const focusCellTarget: CellCoordinate = {
        rowIndex: rangeEnd,
        columnIndex: columnCount - 1,
      }

      updateSelection(anchorCellTarget, focusCellTarget)
    },
    [
      rowCount,
      columnCount,
      editingCell,
      commitEditing,
      resetSelection,
      updateSelection,
    ],
  )

  const selectColumnRange = useCallback(
    (startColumn: number, endColumn: number) => {
      if (!Number.isInteger(startColumn) || !Number.isInteger(endColumn)) {
        return
      }

      if (rowCount === 0 || columnCount === 0) {
        resetSelection()
        return
      }

      const clampedStart = Math.max(0, Math.min(startColumn, columnCount - 1))
      const clampedEnd = Math.max(0, Math.min(endColumn, columnCount - 1))
      const rangeStart = Math.min(clampedStart, clampedEnd)
      const rangeEnd = Math.max(clampedStart, clampedEnd)

      if (editingCell) {
        commitEditing({ skipSelectionUpdate: true })
      }

      const anchorCellTarget: CellCoordinate = {
        rowIndex: 0,
        columnIndex: rangeStart,
      }
      const focusCellTarget: CellCoordinate = {
        rowIndex: rowCount - 1,
        columnIndex: rangeEnd,
      }

      updateSelection(anchorCellTarget, focusCellTarget)
    },
    [
      rowCount,
      columnCount,
      editingCell,
      commitEditing,
      resetSelection,
      updateSelection,
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
      resetSelection()
      return
    }

    if (editingCell) {
      commitEditing({ skipSelectionUpdate: true })
    }

    const anchorCellTarget: CellCoordinate = {
      rowIndex: 0,
      columnIndex: 0,
    }
    const focusCellTarget: CellCoordinate = {
      rowIndex: rowCount - 1,
      columnIndex: columnCount - 1,
    }

    updateSelection(anchorCellTarget, focusCellTarget)
  }, [
    rowCount,
    columnCount,
    editingCell,
    commitEditing,
    resetSelection,
    updateSelection,
  ])

  const handleCellPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLTableCellElement>,
      rowIndex: number,
      columnIndex: number,
    ) => {
      if (!event.isPrimary) {
        return
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      if (editingCell) {
        if (!(editingCell.rowIndex === rowIndex && editingCell.columnIndex === columnIndex)) {
          commitEditing({ skipSelectionUpdate: true })
        }
      }

      const cell: CellCoordinate = {
        rowIndex,
        columnIndex,
      }

      const anchor = event.shiftKey && anchorRef.current ? anchorRef.current : cell

      updateSelection(anchor, cell)
      pointerStateRef.current = {
        isSelecting: true,
        pointerId: event.pointerId,
      }
      lastFocusRef.current = cloneCellCoordinate(cell)

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // 一部環境で setPointerCapture が失敗する可能性があるため握りつぶす
      }
    },
    [editingCell, commitEditing, updateSelection],
  )

  const handleCellPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!pointerStateRef.current.isSelecting) {
        return
      }

      const anchor = anchorRef.current
      if (!anchor) {
        return
      }

      const nextFocus = resolveCellFromEvent(event) ?? lastFocusRef.current

      if (!nextFocus) {
        return
      }

      if (
        lastFocusRef.current &&
        lastFocusRef.current.rowIndex === nextFocus.rowIndex &&
        lastFocusRef.current.columnIndex === nextFocus.columnIndex
      ) {
        return
      }

      if (
        nextFocus.rowIndex < 0 ||
        nextFocus.rowIndex >= rowCount ||
        nextFocus.columnIndex < 0 ||
        nextFocus.columnIndex >= columnCount
      ) {
        return
      }

      lastFocusRef.current = cloneCellCoordinate(nextFocus)
      updateSelection(anchor, nextFocus)
    },
    [rowCount, columnCount, updateSelection],
  )

  const finalizePointerSelection = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (
        pointerStateRef.current.pointerId !== null &&
        event.pointerId === pointerStateRef.current.pointerId
      ) {
        releasePointerCapture(event.currentTarget, event.pointerId)
      }

      const anchor = anchorRef.current
      const focus = lastFocusRef.current ?? anchor

      if (anchor && focus) {
        updateSelection(anchor, focus)
      }

      pointerStateRef.current = {
        isSelecting: false,
        pointerId: null,
      }
    },
    [updateSelection],
  )

  const handleCellPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!pointerStateRef.current.isSelecting) {
        return
      }

      finalizePointerSelection(event)
    },
    [finalizePointerSelection],
  )

  const handleCellPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      finalizePointerSelection(event)
    },
    [finalizePointerSelection],
  )

  return useMemo(
    () => ({
      selectRow,
      selectColumn,
      selectAll,
      selectRowRange,
      selectColumnRange,
      selectionRange,
      normalizedSelectionRange,
      anchorCell,
      activeCell,
      highlightedColumns,
      highlightedRows,
      fullySelectedColumns,
      fullySelectedRows,
      isAllSelected,
      updateSelection,
      resetSelection,
      handleCellPointerDown,
      handleCellPointerMove,
      handleCellPointerUp,
      handleCellPointerCancel,
    }),
    [
      selectRow,
      selectColumn,
      selectAll,
      selectRowRange,
      selectColumnRange,
      selectionRange,
      normalizedSelectionRange,
      anchorCell,
      activeCell,
      highlightedColumns,
      highlightedRows,
      fullySelectedColumns,
      fullySelectedRows,
      isAllSelected,
      updateSelection,
      resetSelection,
      handleCellPointerDown,
      handleCellPointerMove,
      handleCellPointerUp,
      handleCellPointerCancel,
    ],
  )
}

export default useSelectionControls
