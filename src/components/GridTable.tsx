import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ForwardedRef, PointerEvent as ReactPointerEvent } from 'react'
import useColumnMetrics from '../hooks/useColumnMetrics'
import type { ColumnDefinitionInput as ColumnMetricsInput } from '../hooks/useColumnMetrics'
import useRowMetrics from '../hooks/useRowMetrics'
import useHeaderSelection from '../hooks/useHeaderSelection'
import useSelectionControls from '../hooks/useSelectionControls'
import useVirtualGrid from '../hooks/useVirtualGrid'
import type { ColumnPreset, GridDataset, CellCoordinate, GridRow, GridTableProps } from 'types/grid'
import {
  DEFAULT_OVERSCAN,
  EMPTY_DATASET_FALLBACK,
  HEADER_HEIGHT,
  MAX_COLUMN_WIDTH,
  MAX_ROW_HEIGHT,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  MIN_ROW_INDEX_WIDTH,
  ROW_INDEX_CHAR_WIDTH,
  ROW_INDEX_PADDING,
} from '../constants/grid-table'
import type GridTableHandle from '../types/grid-table'
import useSelectionBounds from '../hooks/useSelectionBounds'
import GridTableBody from './GridTableBody'
import GridTableHeader from './GridTableHeader'
import GridTableRowIndex from './GridTableRowIndex'
import GridTableResizeHandles from './GridTableResizeHandles'
import CellSelection from './CellSelection'
import './GridTable.css'

const toColumnHeader = (index: number): string => {
  let result = ''
  let num = index

  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }

  return result
}

const resolveColumnKeys = (
  headerRow: GridRow | undefined,
  rows: GridDataset,
): string[] => {
  if (headerRow) {
    return Object.keys(headerRow)
  }

  if (rows.length > 0) {
    return Object.keys(rows[0])
  }

  return []
}

const resolveHeaderLabel = (
  preset: ColumnPreset,
  index: number,
  columnKey: string,
  headerRow?: GridRow,
): string => {
  if (preset === 'numeric') {
    return String(index + 1)
  }

  if (preset === 'headers') {
    const rawValue = headerRow?.[columnKey]
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return toColumnHeader(index)
    }
    return String(rawValue)
  }

  return toColumnHeader(index)
}

type ColumnResizeState = {
  type: 'column'
  pointerId: number
  columnIndex: number
  columnId: string
  startX: number
  startWidth: number
  startRightEdge: number
}

type RowResizeState = {
  type: 'row'
  pointerId: number
  rowIndex: number
  startY: number
  startHeight: number
  startBottomEdge: number
}

type ResizeState = ColumnResizeState | RowResizeState

type ColumnResizePayload = {
  type: 'column'
  columnId: string
  width: number
  position: number
}

type RowResizePayload = {
  type: 'row'
  rowIndex: number
  height: number
  position: number
}

type PendingResizePayload = ColumnResizePayload | RowResizePayload

interface ResizeGuideState {
  type: 'column' | 'row'
  position: number
  isActive: boolean
}

const GridTableComponent = (
  {
    data: rawData = EMPTY_DATASET_FALLBACK,
    headerType = 'alpha',
    overscan,
    className,
    style,
  }: GridTableProps,
  ref: ForwardedRef<GridTableHandle>,
) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const editingValueRef = useRef('')
  const { headerRow, bodyRows } = useMemo(() => {
    if (headerType === 'headers' && rawData.length > 0) {
      const [firstRow, ...restRows] = rawData
      return {
        headerRow: firstRow,
        bodyRows: restRows,
      }
    }

    if (rawData.length === 0) {
      return {
        headerRow: undefined,
        bodyRows: EMPTY_DATASET_FALLBACK,
      }
    }

    return {
      headerRow: undefined,
      bodyRows: rawData,
    }
  }, [headerType, rawData])
  const headerSelectionApiRef = useRef<{
    reset: () => void
    sync: (anchor: CellCoordinate) => void
  }>({
    reset: () => {},
    sync: () => {},
  })
  const selectionUpdateRef = useRef<
    (anchor: CellCoordinate, focus: CellCoordinate) => void
  >(() => {})
  const handleHeaderAnchorSync = useCallback(
    (anchor: CellCoordinate) => {
      headerSelectionApiRef.current.sync(anchor)
    },
    [],
  )
  const handleHeaderReset = useCallback(() => {
    headerSelectionApiRef.current.reset()
  }, [])

  const resolvedColumns: ColumnMetricsInput[] = useMemo(() => {
    const columnKeys = resolveColumnKeys(headerRow, bodyRows)

    return columnKeys.map((key, index) => ({
      id: key,
      header: resolveHeaderLabel(headerType, index, key, headerRow),
      isFrozen: false,
    }))
  }, [headerType, headerRow, bodyRows])
  const [internalRows, setInternalRows] = useState<GridDataset>(bodyRows)
  const [manualColumnWidths, setManualColumnWidths] = useState<Record<string, number>>({})
  const [manualRowHeights, setManualRowHeights] = useState<Map<number, number>>(
    () => new Map(),
  )
  const [editingCell, setEditingCell] = useState<CellCoordinate | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [columnHandleIndex, setColumnHandleIndex] = useState<number | null>(null)
  const [rowHandleIndex, setRowHandleIndex] = useState<number | null>(null)
  const [
    recentSampleRowIndex,
    setRecentSampleRowIndex,
  ] = useState<number | null>(null)
  const prioritySampleRows = useMemo(
    () => (recentSampleRowIndex === null ? undefined : [recentSampleRowIndex]),
    [recentSampleRowIndex],
  )
  const previousBodyRowsRef = useRef(bodyRows)
  useEffect(() => {
    if (previousBodyRowsRef.current === bodyRows) {
      return
    }

    previousBodyRowsRef.current = bodyRows
    setInternalRows(bodyRows)
    setEditingCell(null)
    setEditingValue('')
    editingValueRef.current = ''
    setRecentSampleRowIndex(null)
  }, [bodyRows])

  useEffect(() => {
    const validColumnIds = new Set(resolvedColumns.map(({ id }) => id))
    setManualColumnWidths((prev) => {
      let mutated = false
      const next: Record<string, number> = {}
      Object.entries(prev).forEach(([columnId, width]) => {
        if (validColumnIds.has(columnId)) {
          next[columnId] = width
          return
        }
        mutated = true
      })

      if (!mutated && Object.keys(prev).length === Object.keys(next).length) {
        return prev
      }

      return mutated ? next : prev
    })
  }, [resolvedColumns])

  useEffect(() => {
    const rowCount = internalRows.length
    setManualRowHeights((prev) => {
      let mutated = false
      const next = new Map<number, number>()
      prev.forEach((height, rowIndex) => {
        if (rowIndex < rowCount) {
          next.set(rowIndex, height)
        } else {
          mutated = true
        }
      })

      if (!mutated && next.size === prev.size) {
        return prev
      }

      return mutated ? next : prev
    })
  }, [internalRows.length])

  const resizeStateRef = useRef<ResizeState | null>(null)
  const pendingResizeRef = useRef<PendingResizePayload | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const resizeGuideFadeTimeoutRef = useRef<number | null>(null)
  const [resizeGuide, setResizeGuide] = useState<ResizeGuideState | null>(null)

  useEffect(
    () => () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      if (resizeGuideFadeTimeoutRef.current !== null) {
        window.clearTimeout(resizeGuideFadeTimeoutRef.current)
        resizeGuideFadeTimeoutRef.current = null
      }
    },
    [],
  )

  const columnMetrics = useColumnMetrics({
    columns: resolvedColumns,
    data: internalRows,
    priorityRowIndices: prioritySampleRows,
    manualColumnWidths,
  })
  const rowMetrics = useRowMetrics({
    columns: resolvedColumns.map(({ id, header }) => ({ id, header })),
    columnMetrics,
    data: internalRows,
    priorityRowIndices: prioritySampleRows,
    manualRowHeights,
  })
  const { heights: rowHeights, offsets: rowOffsets } = rowMetrics
  const fallbackRowHeight =
    rowHeights.find((height) => Number.isFinite(height) && height > 0) ??
    MIN_ROW_HEIGHT

  const {
    range,
    contentWidth,
    contentHeight,
    handleScroll,
    scrollLeft,
    scrollTop,
  } = useVirtualGrid({
    rowCount: internalRows.length,
    columnMetrics,
    rowHeights: rowMetrics.heights,
    overscan: overscan ?? DEFAULT_OVERSCAN,
    scrollRef,
  })

  const rowCount = internalRows.length
  const rowIndexMaxLength = String(Math.max(1, rowCount)).length
  const rowIndexMeasuredWidth = rowIndexMaxLength * ROW_INDEX_CHAR_WIDTH + ROW_INDEX_PADDING
  const rowIndexWidth = Math.max(MIN_ROW_INDEX_WIDTH, rowIndexMeasuredWidth)
  const clampColumnWidth = useCallback(
    (value: number) =>
      Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, value)),
    [],
  )
  const clampRowHeight = useCallback(
    (value: number) =>
      Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, value)),
    [],
  )
  const resolveRowOffset = useCallback(
    (index: number) => rowOffsets[index] ?? index * fallbackRowHeight,
    [rowOffsets, fallbackRowHeight],
  )
  const resolveRowHeightValue = useCallback(
    (index: number) => rowHeights[index] ?? fallbackRowHeight,
    [rowHeights, fallbackRowHeight],
  )

  const visibleColumns = useMemo(
    () => resolvedColumns.slice(range.columnStart, range.columnEnd),
    [resolvedColumns, range.columnStart, range.columnEnd],
  )

  const visibleColumnMetrics = useMemo(
    () => columnMetrics.slice(range.columnStart, range.columnEnd),
    [columnMetrics, range.columnStart, range.columnEnd],
  )

  const visibleRows = useMemo(
    () => internalRows.slice(range.rowStart, range.rowEnd),
    [internalRows, range.rowStart, range.rowEnd],
  )

  const spacerWidth = range.offsetLeft
  const spacerHeight = range.offsetTop
  const totalRenderedColumns = 1 + visibleColumns.length + (spacerWidth > 0 ? 1 : 0)

  const columnCount = resolvedColumns.length
  const totalColumnCount = columnCount + 1

  const applyResizePayload = useCallback(
    (payload: PendingResizePayload, options?: { isActive?: boolean }) => {
      const isActive = options?.isActive ?? true
      if (payload.type === 'column') {
        const nextWidth = clampColumnWidth(payload.width)
        setManualColumnWidths((prev) => {
          const current = prev[payload.columnId]
          if (current === nextWidth) {
            return prev
          }
          return {
            ...prev,
            [payload.columnId]: nextWidth,
          }
        })
        setResizeGuide({
          type: 'column',
          position: payload.position,
          isActive,
        })
        return
      }

      const nextHeight = clampRowHeight(payload.height)
      setManualRowHeights((prev) => {
        const current = prev.get(payload.rowIndex)
        if (current === nextHeight) {
          return prev
        }
        const next = new Map(prev)
        next.set(payload.rowIndex, nextHeight)
        return next
      })
      setResizeGuide({
        type: 'row',
        position: payload.position,
        isActive,
      })
    },
    [clampColumnWidth, clampRowHeight],
  )

  const scheduleResizeUpdate = useCallback(
    (payload: PendingResizePayload) => {
      pendingResizeRef.current = payload
      if (resizeFrameRef.current !== null) {
        return
      }
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null
        const pendingPayload = pendingResizeRef.current
        pendingResizeRef.current = null
        if (!pendingPayload) {
          return
        }
        applyResizePayload(pendingPayload, { isActive: true })
      })
    },
    [applyResizePayload],
  )

  const triggerGuideFade = useCallback(() => {
    setResizeGuide((prev) => {
      if (!prev) {
        return prev
      }
      if (!prev.isActive) {
        return prev
      }
      return { ...prev, isActive: false }
    })
    if (resizeGuideFadeTimeoutRef.current !== null) {
      window.clearTimeout(resizeGuideFadeTimeoutRef.current)
    }
    resizeGuideFadeTimeoutRef.current = window.setTimeout(() => {
      setResizeGuide(null)
      resizeGuideFadeTimeoutRef.current = null
    }, 150)
  }, [])

  const computeColumnResizePayload = useCallback(
    (event: ReactPointerEvent<HTMLElement>): ColumnResizePayload | null => {
      const state = resizeStateRef.current
      if (
        !state ||
        state.type !== 'column' ||
        state.pointerId !== event.pointerId
      ) {
        return null
      }
      const deltaX = event.clientX - state.startX
      const nextWidth = clampColumnWidth(state.startWidth + deltaX)
      const rightEdge = state.startRightEdge + (nextWidth - state.startWidth)
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0
      const rawPosition = rowIndexWidth + rightEdge - scrollLeft
      return {
        type: 'column',
        columnId: state.columnId,
        width: nextWidth,
        position: Number.isFinite(rawPosition) ? rawPosition : 0,
      }
    },
    [clampColumnWidth, rowIndexWidth],
  )

  const computeRowResizePayload = useCallback(
    (event: ReactPointerEvent<HTMLElement>): RowResizePayload | null => {
      const state = resizeStateRef.current
      if (
        !state ||
        state.type !== 'row' ||
        state.pointerId !== event.pointerId
      ) {
        return null
      }
      const deltaY = event.clientY - state.startY
      const nextHeight = clampRowHeight(state.startHeight + deltaY)
      const bottomEdge =
        state.startBottomEdge + (nextHeight - state.startHeight)
      const scrollTop = scrollRef.current?.scrollTop ?? 0
      const rawPosition = HEADER_HEIGHT + bottomEdge - scrollTop
      return {
        type: 'row',
        rowIndex: state.rowIndex,
        height: nextHeight,
        position: Number.isFinite(rawPosition) ? rawPosition : 0,
      }
    },
    [clampRowHeight],
  )

  const handleColumnResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, columnIndex: number) => {
      const column = resolvedColumns[columnIndex]
      const metric = columnMetrics[columnIndex]
      if (!column || !metric) {
        return
      }
      setColumnHandleIndex((prev) =>
        prev === columnIndex ? prev : columnIndex,
      )
      if (resizeGuideFadeTimeoutRef.current !== null) {
        window.clearTimeout(resizeGuideFadeTimeoutRef.current)
        resizeGuideFadeTimeoutRef.current = null
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      pendingResizeRef.current = null
      resizeStateRef.current = {
        type: 'column',
        pointerId: event.pointerId,
        columnIndex,
        columnId: column.id,
        startX: event.clientX,
        startWidth: metric.width,
        startRightEdge: metric.offset + metric.width,
      }
      event.preventDefault()
      event.stopPropagation()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // setPointerCapture が失敗しても処理継続
      }
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0
      setResizeGuide({
        type: 'column',
        position: rowIndexWidth + metric.offset + metric.width - scrollLeft,
        isActive: true,
      })
    },
    [columnMetrics, resolvedColumns, rowIndexWidth],
  )

  const handleColumnResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const payload = computeColumnResizePayload(event)
      if (!payload) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      scheduleResizeUpdate(payload)
    },
    [computeColumnResizePayload, scheduleResizeUpdate],
  )

  const handleColumnResizePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = resizeStateRef.current
      if (
        !state ||
        state.type !== 'column' ||
        state.pointerId !== event.pointerId
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // releasePointerCapture が失敗しても継続
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      const payload =
        computeColumnResizePayload(event) ??
        ({
          type: 'column',
          columnId: state.columnId,
          width: state.startWidth,
          position: (() => {
            const scrollLeft = scrollRef.current?.scrollLeft ?? 0
            const raw =
              rowIndexWidth + state.startRightEdge - scrollLeft
            return Number.isFinite(raw) ? raw : 0
          })(),
        } satisfies ColumnResizePayload)
      pendingResizeRef.current = null
      if (payload) {
        applyResizePayload(payload, { isActive: true })
      }
      resizeStateRef.current = null
      triggerGuideFade()
    },
    [applyResizePayload, computeColumnResizePayload, rowIndexWidth, triggerGuideFade],
  )

  const handleRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, rowIndex: number) => {
      const currentHeight = resolveRowHeightValue(rowIndex)
      const rowOffset = resolveRowOffset(rowIndex)
      setRowHandleIndex((prev) => (prev === rowIndex ? prev : rowIndex))
      if (resizeGuideFadeTimeoutRef.current !== null) {
        window.clearTimeout(resizeGuideFadeTimeoutRef.current)
        resizeGuideFadeTimeoutRef.current = null
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      pendingResizeRef.current = null
      resizeStateRef.current = {
        type: 'row',
        pointerId: event.pointerId,
        rowIndex,
        startY: event.clientY,
        startHeight: currentHeight,
        startBottomEdge: rowOffset + currentHeight,
      }
      event.preventDefault()
      event.stopPropagation()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // setPointerCapture が失敗しても継続
      }
      const scrollTop = scrollRef.current?.scrollTop ?? 0
      setResizeGuide({
        type: 'row',
        position: HEADER_HEIGHT + rowOffset + currentHeight - scrollTop,
        isActive: true,
      })
    },
    [resolveRowHeightValue, resolveRowOffset],
  )

  const handleRowResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const payload = computeRowResizePayload(event)
      if (!payload) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      scheduleResizeUpdate(payload)
    },
    [computeRowResizePayload, scheduleResizeUpdate],
  )

  const handleRowResizePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = resizeStateRef.current
      if (
        !state ||
        state.type !== 'row' ||
        state.pointerId !== event.pointerId
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // releasePointerCapture が失敗しても継続
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      const payload =
        computeRowResizePayload(event) ??
        ({
          type: 'row',
          rowIndex: state.rowIndex,
          height: state.startHeight,
          position: (() => {
            const scrollTop = scrollRef.current?.scrollTop ?? 0
            const raw =
              HEADER_HEIGHT + state.startBottomEdge - scrollTop
            return Number.isFinite(raw) ? raw : 0
          })(),
        } satisfies RowResizePayload)
      pendingResizeRef.current = null
      if (payload) {
        applyResizePayload(payload, { isActive: true })
      }
      resizeStateRef.current = null
      triggerGuideFade()
    },
    [applyResizePayload, computeRowResizePayload, triggerGuideFade],
  )

  const commitEditing = useCallback(
    (
      options?: {
        nextSelection?: CellCoordinate | null
        skipSelectionUpdate?: boolean
      },
    ) => {
      if (!editingCell) {
        return
      }

      const column = resolvedColumns[editingCell.columnIndex]
      if (!column) {
        setEditingCell(null)
        setEditingValue('')
        return
      }

      setInternalRows((prevRows) => {
        const targetRow = prevRows[editingCell.rowIndex]
        if (!targetRow) {
          return prevRows
        }

        const currentValue = targetRow[column.id]
        const domValue = editorRef.current ? editorRef.current.value : null
        const nextValue = domValue !== null ? domValue : editingValue
        editingValueRef.current = nextValue
        if (String(currentValue ?? '') === nextValue) {
          return prevRows
        }

        const nextRows = [...prevRows]
        nextRows[editingCell.rowIndex] = {
          ...targetRow,
          [column.id]: nextValue,
        }
        return nextRows
      })

      const selectionTarget = options?.nextSelection ?? editingCell

      setRecentSampleRowIndex(editingCell.rowIndex)

      setEditingCell(null)
      setEditingValue('')
      editingValueRef.current = ''

      if (!options?.skipSelectionUpdate && selectionTarget) {
        selectionUpdateRef.current(selectionTarget, selectionTarget)
      }
    },
    [
      editingCell,
      editingValue,
      resolvedColumns,
      selectionUpdateRef,
      editorRef,
    ],
  )

  const selectionControls = useSelectionControls({
    rowCount,
    columnCount,
    editingCell,
    commitEditing,
    onAnchorChange: handleHeaderAnchorSync,
    onResetSelection: handleHeaderReset,
  })
  const {
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
    handleCellPointerDown,
    handleCellPointerMove,
    handleCellPointerUp,
    handleCellPointerCancel,
  } = selectionControls
  selectionUpdateRef.current = updateSelection

  const {
    handleColumnHeaderPointerDown: handleColumnHeaderPointerDownBase,
    handleColumnHeaderPointerMove: handleColumnHeaderPointerMoveBase,
    handleColumnHeaderPointerEnd,
    handleRowHeaderPointerDown: handleRowHeaderPointerDownBase,
    handleRowHeaderPointerMove: handleRowHeaderPointerMoveBase,
    handleRowHeaderPointerEnd,
    handleColumnHeaderClick,
    handleRowHeaderClick,
    syncSelectionAnchors,
    resetHeaderSelection,
  } = useHeaderSelection({
    rowCount,
    columnCount,
    selectionRange,
    selectColumn,
    selectRow,
    selectColumnRange,
    selectRowRange,
    selectAll,
  })

  headerSelectionApiRef.current.reset = resetHeaderSelection
  headerSelectionApiRef.current.sync = syncSelectionAnchors

  const clearColumnHandleIndex = useCallback(() => {
    if (resizeStateRef.current?.type === 'column') {
      return
    }
    setColumnHandleIndex((prev) => (prev === null ? prev : null))
  }, [])

  const clearRowHandleIndex = useCallback(() => {
    if (resizeStateRef.current?.type === 'row') {
      return
    }
    setRowHandleIndex((prev) => (prev === null ? prev : null))
  }, [])

  const handleColumnHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>, columnIndex: number) => {
      handleColumnHeaderPointerDownBase(event, columnIndex)
      if (columnIndex >= 0) {
        setColumnHandleIndex((prev) =>
          prev === columnIndex ? prev : columnIndex,
        )
      } else {
        clearColumnHandleIndex()
      }
    },
    [handleColumnHeaderPointerDownBase, clearColumnHandleIndex],
  )

  const handleColumnHeaderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      handleColumnHeaderPointerMoveBase(event)
      const target = event.currentTarget as HTMLElement | null
      const datasetValue = target?.dataset.columnIndex
      const parsed = Number(datasetValue)
      if (Number.isInteger(parsed) && parsed >= 0) {
        setColumnHandleIndex((prev) => (prev === parsed ? prev : parsed))
      } else {
        clearColumnHandleIndex()
      }
    },
    [handleColumnHeaderPointerMoveBase, clearColumnHandleIndex],
  )

  const handleColumnHeaderPointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>, columnIndex: number) => {
      if (resizeStateRef.current?.type === 'column') {
        return
      }
      const nextTarget = event.relatedTarget as HTMLElement | null
      if (nextTarget?.classList.contains('grid-table__column-resize-handle')) {
        return
      }
      if (columnIndex >= 0) {
        setColumnHandleIndex((prev) =>
          prev === columnIndex ? null : prev,
        )
      } else {
        clearColumnHandleIndex()
      }
    },
    [clearColumnHandleIndex],
  )

  const handleColumnHeaderPointerEnter = useCallback(
    (_event: ReactPointerEvent<HTMLTableCellElement>, columnIndex: number) => {
      if (columnIndex >= 0) {
        setColumnHandleIndex((prev) =>
          prev === columnIndex ? prev : columnIndex,
        )
      } else {
        clearColumnHandleIndex()
      }
    },
    [clearColumnHandleIndex],
  )

  const handleRowHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>, rowIndex: number) => {
      handleRowHeaderPointerDownBase(event, rowIndex)
      if (rowIndex >= 0) {
        setRowHandleIndex((prev) => (prev === rowIndex ? prev : rowIndex))
      } else {
        clearRowHandleIndex()
      }
    },
    [handleRowHeaderPointerDownBase, clearRowHandleIndex],
  )

  const handleRowHeaderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>) => {
      handleRowHeaderPointerMoveBase(event)
      const target = event.currentTarget as HTMLElement | null
      const datasetValue = target?.dataset.rowIndex
      const parsed = Number(datasetValue)
      if (Number.isInteger(parsed) && parsed >= 0) {
        setRowHandleIndex((prev) => (prev === parsed ? prev : parsed))
      } else {
        clearRowHandleIndex()
      }
    },
    [handleRowHeaderPointerMoveBase, clearRowHandleIndex],
  )

  const handleRowHeaderPointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLTableCellElement>, rowIndex: number) => {
      if (resizeStateRef.current?.type === 'row') {
        return
      }
      const nextTarget = event.relatedTarget as HTMLElement | null
      if (nextTarget?.classList.contains('grid-table__row-resize-handle')) {
        return
      }
      if (rowIndex >= 0) {
        setRowHandleIndex((prev) => (prev === rowIndex ? null : prev))
      } else {
        clearRowHandleIndex()
      }
    },
    [clearRowHandleIndex],
  )

  const handleRowHeaderPointerEnter = useCallback(
    (_event: ReactPointerEvent<HTMLTableCellElement>, rowIndex: number) => {
      if (rowIndex >= 0) {
        setRowHandleIndex((prev) => (prev === rowIndex ? prev : rowIndex))
      } else {
        clearRowHandleIndex()
      }
    },
    [clearRowHandleIndex],
  )

  const startEditing = useCallback(
    (cell: CellCoordinate) => {
      const column = resolvedColumns[cell.columnIndex]
      const row = internalRows[cell.rowIndex]
      if (!column || !row) {
        return
      }

      const rawValue = row[column.id]
      const value = rawValue == null ? '' : String(rawValue)

      updateSelection(cell, cell)
      setEditingCell(cell)
      setEditingValue(value)
      editingValueRef.current = value
    },
    [resolvedColumns, internalRows, updateSelection],
  )

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, columnIndex: number) => {
      startEditing({ rowIndex, columnIndex })
    },
    [startEditing],
  )

  const handleEditorBlur = useCallback(() => {
    commitEditing()
  }, [commitEditing])

  const hasRangeSelection = normalizedSelectionRange !== null &&
    (
      normalizedSelectionRange.topRow !== normalizedSelectionRange.bottomRow ||
      normalizedSelectionRange.leftColumn !== normalizedSelectionRange.rightColumn
    )

  const {
    selectionBounds,
    editingBounds,
    anchorBounds,
  } = useSelectionBounds({
    columnMetrics,
    rowOffsets,
    rowHeights,
    fallbackRowHeight,
    rowIndexWidth,
    normalizedSelectionRange,
    editingCell,
    anchorCell,
  })

  const editorSessionKey = editingCell
    ? `${editingCell.rowIndex}-${editingCell.columnIndex}`
    : 'inactive'

  const handleGridScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (editingCell) {
        flushSync(() => {
          commitEditing()
        })
      }

      handleScroll(event)
    },
    [editingCell, commitEditing, handleScroll],
  )

  const handleRootPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!editingCell) {
        return
      }

      const target = event.target as HTMLElement
      if (target.closest('.grid-table__cell-editor')) {
        return
      }

      commitEditing()
    },
    [editingCell, commitEditing],
  )

  useImperativeHandle(ref, () => selectionControls, [selectionControls])

  return (
    <section
      className={className ? `grid-table ${className}` : 'grid-table'}
      aria-colcount={totalColumnCount}
      aria-label="Grid preview"
      aria-rowcount={rowCount}
      role="grid"
      style={style}
      onPointerDownCapture={handleRootPointerDownCapture}
    >
      <div
        className="grid-table__scroll"
        onScroll={handleGridScroll}
        ref={scrollRef}
      >
        <GridTableBody
          anchorCell={anchorCell}
          activeCell={activeCell}
          columnMetrics={visibleColumnMetrics}
          columns={visibleColumns}
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          renderRowStartIndex={range.rowStart}
          renderColumnStartIndex={range.columnStart}
          rowCount={rowCount}
          rowHeights={rowHeights}
          rowIndexWidth={rowIndexWidth}
          rows={visibleRows}
          selectionRange={normalizedSelectionRange}
          spacerWidth={spacerWidth}
          totalRenderedColumns={totalRenderedColumns}
          spacerHeight={spacerHeight}
          onCellPointerDown={handleCellPointerDown}
          onCellPointerMove={handleCellPointerMove}
          onCellPointerUp={handleCellPointerUp}
          onCellPointerCancel={handleCellPointerCancel}
          onCellDoubleClick={handleCellDoubleClick}
          onCornerHeaderClick={selectAll}
          columnOffset={range.columnStart}
          isAllSelected={isAllSelected}
          highlightedColumns={highlightedColumns}
          highlightedRows={highlightedRows}
          onColumnHeaderClick={handleColumnHeaderClick}
          onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
          onColumnHeaderPointerMove={handleColumnHeaderPointerMove}
          onColumnHeaderPointerUp={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerCancel={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerLeave={handleColumnHeaderPointerLeave}
          onColumnHeaderPointerEnter={handleColumnHeaderPointerEnter}
        />

        <CellSelection
          anchorBounds={anchorBounds}
          editingBounds={editingBounds}
          editorValue={editingValue}
          onEditorBlur={handleEditorBlur}
          selectionBounds={selectionBounds}
          hasRangeSelection={hasRangeSelection}
          editorRef={editorRef}
          editorSessionKey={editorSessionKey}
          onEditorInput={(value) => {
            editingValueRef.current = value
            setEditingValue((prev) => (prev === value ? prev : value))
          }}
        />

        <GridTableRowIndex
          renderRowStartIndex={range.rowStart}
          rows={visibleRows}
          rowHeights={rowHeights}
          rowIndexWidth={rowIndexWidth}
          spacerHeight={spacerHeight}
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          totalRenderedColumns={totalRenderedColumns}
          onRowHeaderClick={handleRowHeaderClick}
          selectedRows={fullySelectedRows}
          isAllSelected={isAllSelected}
          activeRowIndex={activeCell?.rowIndex ?? null}
          highlightedRows={highlightedRows}
          onRowHeaderPointerDown={handleRowHeaderPointerDown}
          onRowHeaderPointerMove={handleRowHeaderPointerMove}
          onRowHeaderPointerUp={handleRowHeaderPointerEnd}
          onRowHeaderPointerCancel={handleRowHeaderPointerEnd}
          onRowHeaderPointerLeave={handleRowHeaderPointerLeave}
          onRowHeaderPointerEnter={handleRowHeaderPointerEnter}
        />

        <GridTableHeader
          columns={visibleColumns}
          columnMetrics={visibleColumnMetrics}
          rowIndexWidth={rowIndexWidth}
          spacerWidth={spacerWidth}
          onColumnHeaderClick={handleColumnHeaderClick}
          onSelectAll={selectAll}
          columnOffset={range.columnStart}
          selectedColumns={fullySelectedColumns}
          isAllSelected={isAllSelected}
          activeColumnIndex={activeCell?.columnIndex ?? null}
          highlightedColumns={highlightedColumns}
          onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
          onColumnHeaderPointerMove={handleColumnHeaderPointerMove}
          onColumnHeaderPointerUp={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerCancel={handleColumnHeaderPointerEnd}
          onColumnHeaderPointerLeave={handleColumnHeaderPointerLeave}
          onColumnHeaderPointerEnter={handleColumnHeaderPointerEnter}
        />
        <GridTableResizeHandles
          columnMetrics={columnMetrics}
          columnHandleIndex={columnHandleIndex}
          rowHandleIndex={rowHandleIndex}
          rowIndexWidth={rowIndexWidth}
          rowOffsets={rowOffsets}
          rowHeights={rowHeights}
          onColumnResizePointerDown={handleColumnResizePointerDown}
          onColumnResizePointerMove={handleColumnResizePointerMove}
          onColumnResizePointerUp={handleColumnResizePointerEnd}
          onColumnResizePointerCancel={handleColumnResizePointerEnd}
          onRowResizePointerDown={handleRowResizePointerDown}
          onRowResizePointerMove={handleRowResizePointerMove}
          onRowResizePointerUp={handleRowResizePointerEnd}
          onRowResizePointerCancel={handleRowResizePointerEnd}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          onColumnHandlePointerLeave={clearColumnHandleIndex}
          onRowHandlePointerLeave={clearRowHandleIndex}
        />
        {resizeGuide && (
          <div
            className={[
              'grid-table__resize-guide',
              resizeGuide.type === 'column'
                ? 'grid-table__resize-guide--column'
                : 'grid-table__resize-guide--row',
              resizeGuide.isActive ? 'grid-table__resize-guide--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              resizeGuide.type === 'column'
                ? { left: `${resizeGuide.position}px` }
                : { top: `${resizeGuide.position}px` }
            }
          />
        )}
      </div>
    </section>
  )
}

export const GridTable = forwardRef<GridTableHandle, GridTableProps>(
  GridTableComponent,
)

export default GridTable
