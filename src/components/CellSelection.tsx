import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import type { SelectionRectangle } from 'types/grid'

export interface CellSelectionProps {
  selectionBounds: SelectionRectangle | null
  anchorBounds: SelectionRectangle | null
  editingBounds: SelectionRectangle | null
  editorValue: string
  onEditorChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onEditorBlur: () => void
}

const CellSelection = ({
  selectionBounds,
  anchorBounds,
  editingBounds,
  editorValue,
  onEditorChange,
  onEditorBlur,
}: CellSelectionProps) => {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = editorRef.current
    if (!editingBounds || !textarea) {
      return
    }

    textarea.focus()
    const length = textarea.value.length
    textarea.setSelectionRange(length, length)
  }, [editingBounds])

  return (
    <>
      {selectionBounds && (
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
          aria-label="Cell editor"
          className="grid-table__cell-editor"
          onBlur={onEditorBlur}
          onChange={onEditorChange}
          ref={editorRef}
          style={{
            top: `${editingBounds.top}px`,
            left: `${editingBounds.left}px`,
            width: `${editingBounds.width}px`,
            height: `${editingBounds.height}px`,
          }}
          value={editorValue}
        />
      )}
    </>
  )
}

export default CellSelection
