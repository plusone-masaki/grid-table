import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { RefObject } from 'react'
import type { SelectionRectangle } from 'types/grid'

export interface CellSelectionProps {
  selectionBounds: SelectionRectangle | null
  anchorBounds: SelectionRectangle | null
  editingBounds: SelectionRectangle | null
  editorValue: string
  onEditorBlur: () => void
  hasRangeSelection: boolean
  editorRef: RefObject<HTMLTextAreaElement | null>
  editorSessionKey: string
  onEditorInput?: (value: string) => void
}

const CellSelection = ({
  selectionBounds,
  anchorBounds,
  editingBounds,
  editorValue,
  onEditorBlur,
  hasRangeSelection,
  editorRef,
  editorSessionKey,
  onEditorInput,
}: CellSelectionProps) => {
  const resizeFrameRef = useRef<number | null>(null)
  const editorSizeRef = useRef<{
    width: number
    height: number
    maxWidth: number
  } | null>(null)
  const measureContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [editorSize, setEditorSize] = useState<{
    width: number
    height: number
    maxWidth: number
  } | null>(null)

  const commitEditorSize = useCallback(
    (nextSize: { width: number; height: number; maxWidth: number }) => {
      editorSizeRef.current = nextSize
      setEditorSize(nextSize)
    },
    [],
  )

  const computeEditorSize = useCallback(() => {
    const textarea = editorRef.current
    if (!textarea || !editingBounds) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const baseWidth = editingBounds.width
    const baseHeight = editingBounds.height

    const previousSize = editorSizeRef.current
    const previousHeight = previousSize ? previousSize.height : baseHeight

    textarea.style.minWidth = `${baseWidth}px`
    textarea.style.maxWidth = ''
    textarea.style.width = `${baseWidth}px`
    textarea.style.height = `${baseHeight}px`

    const rect = textarea.getBoundingClientRect()
    const parentElement = textarea.parentElement as HTMLElement | null
    const parentRect = parentElement?.getBoundingClientRect()
    const parentContentRight =
      parentRect && parentElement
        ? parentRect.left + parentElement.clientWidth
        : null
    const viewportMargin = 8
    const viewportWidth =
      Number.isFinite(window.innerWidth) && window.innerWidth > 0
        ? window.innerWidth
        : baseWidth
    const viewportRightLimit = viewportWidth - viewportMargin
    const rawRightBoundary =
      parentContentRight === null
        ? viewportRightLimit
        : Math.min(viewportRightLimit, parentContentRight)
    const sanitizedRightBoundary = Number.isFinite(rawRightBoundary)
      ? rawRightBoundary
      : rect.left + baseWidth
    const rawAvailableWidth = sanitizedRightBoundary - rect.left
    const safeAvailableWidth = Number.isFinite(rawAvailableWidth)
      ? Math.max(0, rawAvailableWidth)
      : 0
    const availableWidth = Math.max(baseWidth, safeAvailableWidth)
    textarea.style.maxWidth =
      Number.isFinite(availableWidth) && availableWidth > 0
        ? `${availableWidth}px`
        : ''

    const computedStyle = window.getComputedStyle(textarea)
    const paddingLeft =
      Number.parseFloat(computedStyle.paddingLeft || '0') || 0
    const paddingRight =
      Number.parseFloat(computedStyle.paddingRight || '0') || 0
    const borderLeft =
      Number.parseFloat(computedStyle.borderLeftWidth || '0') || 0
    const borderRight =
      Number.parseFloat(computedStyle.borderRightWidth || '0') || 0
    const letterSpacingRaw = computedStyle.letterSpacing ?? 'normal'
    const letterSpacing =
      letterSpacingRaw === 'normal'
        ? 0
        : Number.parseFloat(letterSpacingRaw) || 0
    const horizontalExtras =
      paddingLeft + paddingRight + borderLeft + borderRight
    const contentAreaWidth = Math.max(0, baseWidth - horizontalExtras)

    const canvasContext = (() => {
      if (measureContextRef.current) {
        return measureContextRef.current
      }
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        return null
      }
      measureContextRef.current = context
      return context
    })()

    const font =
      computedStyle.font && computedStyle.font !== 'inherit'
        ? computedStyle.font
        : [
            computedStyle.fontStyle,
            computedStyle.fontVariant,
            computedStyle.fontWeight,
            computedStyle.fontSize,
            computedStyle.fontFamily,
          ]
            .filter(Boolean)
            .join(' ')

    const textLines = textarea.value.split('\n')
    let longestLineWidth = contentAreaWidth
    if (canvasContext && font) {
      canvasContext.font = font
      for (const line of textLines) {
        const content = line.length > 0 ? line : ' '
        const metrics = canvasContext.measureText(content)
        const baseLineWidth = metrics.width
        const spacingCompensation =
          letterSpacing > 0 && content.length > 1
            ? letterSpacing * (content.length - 1)
            : 0
        const totalLineWidth = baseLineWidth + spacingCompensation
        if (totalLineWidth > longestLineWidth) {
          longestLineWidth = totalLineWidth
        }
      }
    }
    const desiredTotalWidth = Math.ceil(longestLineWidth + horizontalExtras)
    const widthGrowthThreshold = 0.5
    const shouldExpand =
      longestLineWidth - contentAreaWidth > widthGrowthThreshold
    const widthCandidate = shouldExpand
      ? Math.max(baseWidth, desiredTotalWidth)
      : baseWidth
    const nextWidth = Math.min(availableWidth, widthCandidate)
    textarea.style.width = `${nextWidth}px`

    let nextHeight = baseHeight
    textarea.style.height = `${baseHeight}px`

    const shouldAllowVerticalGrowth =
      textarea.value.includes('\n') ||
      (shouldExpand && nextWidth >= availableWidth - 0.5)
    if (shouldAllowVerticalGrowth) {
      const originalHeight = textarea.style.height
      textarea.style.height = 'auto'
      const measuredHeight = Math.ceil(textarea.scrollHeight)
      nextHeight = Math.max(baseHeight, measuredHeight, previousHeight)
      textarea.style.height = originalHeight
    }

    textarea.style.height = `${nextHeight}px`

    const resolvedWidth = textarea.getBoundingClientRect().width

    commitEditorSize({
      width: resolvedWidth,
      height: nextHeight,
      maxWidth: availableWidth,
    })
    resizeFrameRef.current = null
  }, [editingBounds, commitEditorSize, editorRef])

  useEffect(() => {
    if (!editingBounds) {
      setEditorSize(null)
      editorSizeRef.current = null
      return
    }

    const initialSize = {
      width: editingBounds.width,
      height: editingBounds.height,
      maxWidth: editingBounds.width,
    }

    editorSizeRef.current = initialSize
    setEditorSize(initialSize)
  }, [editingBounds])

  useEffect(() => {
    const textarea = editorRef.current
    if (!editingBounds || !textarea) {
      return
    }

    textarea.focus()
    const length = textarea.value.length
    textarea.setSelectionRange(length, length)

    if (typeof window !== 'undefined') {
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        computeEditorSize()
      })
    } else {
      computeEditorSize()
    }
  }, [editingBounds, computeEditorSize, editorRef])

  useEffect(() => {
    if (!editingBounds) {
      return
    }

    computeEditorSize()
  }, [editingBounds, computeEditorSize])

  useEffect(() => {
    if (typeof window === 'undefined' || !editingBounds) {
      return
    }

    const handleResize = () => {
      computeEditorSize()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [editingBounds, computeEditorSize])

  useEffect(
    () => () => {
      if (
        resizeFrameRef.current !== null &&
        typeof window !== 'undefined'
      ) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
    },
    [],
  )

  const handleEditorInput = useCallback((value: string) => {
    if (onEditorInput) {
      onEditorInput(value)
    }

    const executeResize = () => {
      computeEditorSize()
    }

    if (typeof window !== 'undefined') {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
      }
      resizeFrameRef.current = window.requestAnimationFrame(executeResize)
      executeResize()
      return
    }

    executeResize()
  }, [computeEditorSize, onEditorInput])

  return (
    <>
      {!editingBounds && hasRangeSelection && selectionBounds && (
        <>
          <div
            aria-hidden="true"
            className="grid-table__selection-fill"
            style={{
              top: `${selectionBounds.top}px`,
              left: `${selectionBounds.left}px`,
              width: `${selectionBounds.width}px`,
              height: `${selectionBounds.height}px`,
            }}
          />
          <div
            aria-hidden="true"
            className="grid-table__selection-outline"
            style={{
              top: `${selectionBounds.top}px`,
              left: `${selectionBounds.left}px`,
              width: `${selectionBounds.width}px`,
              height: `${selectionBounds.height}px`,
            }}
          />
        </>
      )}

      {anchorBounds && (
        <div
          aria-hidden="true"
          className="grid-table__selection-anchor-outline"
          style={{
            top: `${anchorBounds.top}px`,
            left: `${anchorBounds.left}px`,
            width: `${anchorBounds.width}px`,
            height: `${anchorBounds.height}px`,
          }}
        />
      )}

      {editingBounds && (
        <textarea
          key={editorSessionKey}
          aria-label="Cell editor"
          className="grid-table__cell-editor"
          wrap="off"
          defaultValue={editorValue}
          onBlur={onEditorBlur}
          onInput={(event) => handleEditorInput(event.currentTarget.value)}
          ref={editorRef}
          style={{
            top: `${editingBounds.top}px`,
            left: `${editingBounds.left}px`,
            width: `${editorSize?.width ?? editingBounds.width}px`,
            height: `${editorSize?.height ?? editingBounds.height}px`,
            maxWidth: `${editorSize?.maxWidth}px`,
          }}
        />
      )}
    </>
  )
}

export default CellSelection
