import { useCallback, useRef } from 'react'
import type { CellCoordinate, SelectionRange } from 'types/grid'

interface UseHeaderSelectionParams {
  rowCount: number
  columnCount: number
  selectionRange: SelectionRange | null
  selectColumn: (columnIndex: number) => void
  selectRow: (rowIndex: number) => void
  selectColumnRange: (startColumn: number, endColumn: number) => void
  selectRowRange: (startRow: number, endRow: number) => void
  selectAll: () => void
}

export interface HeaderSelectionHandlers {
  handleColumnHeaderPointerDown: (
    event: React.PointerEvent<HTMLTableCellElement>,
    columnIndex: number,
  ) => void
  handleColumnHeaderPointerMove: (
    event: React.PointerEvent<HTMLTableCellElement>,
  ) => void
  handleColumnHeaderPointerEnd: (
    event: React.PointerEvent<HTMLTableCellElement>,
  ) => void
  handleRowHeaderPointerDown: (
    event: React.PointerEvent<HTMLTableCellElement>,
    rowIndex: number,
  ) => void
  handleRowHeaderPointerMove: (
    event: React.PointerEvent<HTMLTableCellElement>,
  ) => void
  handleRowHeaderPointerEnd: (
    event: React.PointerEvent<HTMLTableCellElement>,
  ) => void
  handleColumnHeaderClick: (columnIndex: number | null) => void
  handleRowHeaderClick: (rowIndex: number | null) => void
  syncSelectionAnchors: (anchor: CellCoordinate) => void
  resetHeaderSelection: () => void
}

type PointerState =
  | {
      type: 'row' | 'column'
      pointerId: number
      anchorIndex: number
      hasDragged: boolean
    }
  | {
      type: null
      pointerId: null
      anchorIndex: null
      hasDragged: boolean
    }

const resolveHeaderTargetIndex = (
  event: React.PointerEvent<HTMLTableCellElement>,
  type: 'row' | 'column',
): number | null => {
  const { clientX, clientY } = event.nativeEvent
  const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  if (!element) {
    return null
  }

  const selector = type === 'column' ? '[data-column-index]' : '[data-row-index]'
  const target = element.closest(selector) as HTMLElement | null
  if (!target) {
    return null
  }

  const attribute =
    type === 'column'
      ? target.getAttribute('data-column-index')
      : target.getAttribute('data-row-index')

  if (attribute === null) {
    return null
  }

  const value = Number(attribute)
  return Number.isNaN(value) ? null : value
}

const useHeaderSelection = ({
  rowCount,
  columnCount,
  selectionRange,
  selectColumn,
  selectRow,
  selectColumnRange,
  selectRowRange,
  selectAll,
}: UseHeaderSelectionParams): HeaderSelectionHandlers => {
  const lastColumnHeaderRef = useRef<number | null>(null)
  const lastRowHeaderRef = useRef<number | null>(null)
  const pointerStateRef = useRef<PointerState>({
    type: null,
    pointerId: null,
    anchorIndex: null,
    hasDragged: false,
  })
  const suppressColumnClickRef = useRef(false)
  const suppressRowClickRef = useRef(false)

  const clearPointerState = useCallback(() => {
    pointerStateRef.current = {
      type: null,
      pointerId: null,
      anchorIndex: null,
      hasDragged: false,
    }
  }, [])

  const handleColumnHeaderPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLTableCellElement>,
      columnIndex: number,
    ) => {
      if (!event.isPrimary || event.button !== 0) {
        return
      }

      event.preventDefault()
      suppressColumnClickRef.current = false

      if (columnIndex < 0) {
        selectAll()
        lastColumnHeaderRef.current = 0
        clearPointerState()
        return
      }

      const previousAnchor = lastColumnHeaderRef.current
      const anchorIndex = event.shiftKey
        ? previousAnchor ?? selectionRange?.anchor.columnIndex ?? columnIndex
        : columnIndex

      if (event.shiftKey && previousAnchor === null && !selectionRange) {
        lastColumnHeaderRef.current = anchorIndex
        selectColumn(anchorIndex)
        clearPointerState()
        return
      }

      lastColumnHeaderRef.current = anchorIndex

      selectColumnRange(anchorIndex, columnIndex)

      pointerStateRef.current = {
        type: 'column',
        pointerId: event.pointerId,
        anchorIndex,
        hasDragged: false,
      }

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore capture failures
      }
    },
    [selectAll, selectColumn, selectColumnRange, selectionRange, clearPointerState],
  )

  const handleRowHeaderPointerDown = useCallback(
    (event: React.PointerEvent<HTMLTableCellElement>, rowIndex: number) => {
      if (!event.isPrimary || event.button !== 0) {
        return
      }

      event.preventDefault()
      suppressRowClickRef.current = false

      if (rowIndex < 0) {
        selectAll()
        lastRowHeaderRef.current = 0
        clearPointerState()
        return
      }

      const previousAnchor = lastRowHeaderRef.current
      const anchorIndex = event.shiftKey
        ? previousAnchor ?? selectionRange?.anchor.rowIndex ?? rowIndex
        : rowIndex

      if (event.shiftKey && previousAnchor === null && !selectionRange) {
        lastRowHeaderRef.current = anchorIndex
        selectRow(anchorIndex)
        clearPointerState()
        return
      }

      lastRowHeaderRef.current = anchorIndex

      selectRowRange(anchorIndex, rowIndex)

      pointerStateRef.current = {
        type: 'row',
        pointerId: event.pointerId,
        anchorIndex,
        hasDragged: false,
      }

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore capture failures
      }
    },
    [selectAll, selectRow, selectRowRange, selectionRange, clearPointerState],
  )

  const handleColumnHeaderPointerMove = useCallback(
    (event: React.PointerEvent<HTMLTableCellElement>) => {
      const state = pointerStateRef.current
      if (state.type !== 'column' || state.pointerId === null) {
        return
      }

      if (state.pointerId !== event.pointerId) {
        return
      }

      const targetIndex = resolveHeaderTargetIndex(event, 'column')
      if (targetIndex === null || targetIndex < 0) {
        return
      }

      if (state.anchorIndex === null) {
        return
      }

      if (targetIndex !== state.anchorIndex) {
        state.hasDragged = true
      }

      selectColumnRange(state.anchorIndex, targetIndex)
    },
    [selectColumnRange],
  )

  const handleRowHeaderPointerMove = useCallback(
    (event: React.PointerEvent<HTMLTableCellElement>) => {
      const state = pointerStateRef.current
      if (state.type !== 'row' || state.pointerId === null) {
        return
      }

      if (state.pointerId !== event.pointerId) {
        return
      }

      const targetIndex = resolveHeaderTargetIndex(event, 'row')
      if (targetIndex === null || targetIndex < 0) {
        return
      }

      if (state.anchorIndex === null) {
        return
      }

      if (targetIndex !== state.anchorIndex) {
        state.hasDragged = true
      }

      selectRowRange(state.anchorIndex, targetIndex)
    },
    [selectRowRange],
  )

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLTableCellElement>) => {
      const state = pointerStateRef.current
      if (state.pointerId !== null && state.pointerId !== event.pointerId) {
        return
      }

      const hasDragged = state.hasDragged || event.shiftKey
      if (hasDragged) {
        state.hasDragged = true
      }

      if (state.type === 'column' && hasDragged) {
        suppressColumnClickRef.current = true
      } else if (state.type === 'row' && hasDragged) {
        suppressRowClickRef.current = true
      }

      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // ignore release failures
      }

      clearPointerState()
    },
    [clearPointerState],
  )

  const handleColumnHeaderClick = useCallback(
    (columnIndex: number | null) => {
      if (suppressColumnClickRef.current) {
        suppressColumnClickRef.current = false
        return
      }

      if (columnIndex === null || columnIndex < 0) {
        selectAll()
        return
      }

      if (columnCount === 0) {
        return
      }

      const clampedIndex = Math.max(0, Math.min(columnIndex, columnCount - 1))
      selectColumn(clampedIndex)
    },
    [columnCount, selectAll, selectColumn],
  )

  const handleRowHeaderClick = useCallback(
    (rowIndex: number | null) => {
      if (suppressRowClickRef.current) {
        suppressRowClickRef.current = false
        return
      }

      if (rowIndex === null || rowIndex < 0) {
        selectAll()
        return
      }

      if (rowCount === 0) {
        return
      }

      const clampedIndex = Math.max(0, Math.min(rowIndex, rowCount - 1))
      selectRow(clampedIndex)
    },
    [rowCount, selectAll, selectRow],
  )

  const syncSelectionAnchors = useCallback((anchor: CellCoordinate) => {
    lastColumnHeaderRef.current = anchor.columnIndex
    lastRowHeaderRef.current = anchor.rowIndex
  }, [])

  const resetHeaderSelection = useCallback(() => {
    lastColumnHeaderRef.current = null
    lastRowHeaderRef.current = null
    suppressColumnClickRef.current = false
    suppressRowClickRef.current = false
    pointerStateRef.current = {
      type: null,
      pointerId: null,
      anchorIndex: null,
      hasDragged: false,
    }
  }, [])

  return {
    handleColumnHeaderPointerDown,
    handleColumnHeaderPointerMove,
    handleColumnHeaderPointerEnd: handlePointerEnd,
    handleRowHeaderPointerDown,
    handleRowHeaderPointerMove,
    handleRowHeaderPointerEnd: handlePointerEnd,
    handleColumnHeaderClick,
    handleRowHeaderClick,
    syncSelectionAnchors,
    resetHeaderSelection,
  }
}

export default useHeaderSelection
