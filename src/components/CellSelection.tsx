import type {
  ChangeEvent,
  RefObject,
} from 'react'
import type { SelectionRectangle } from 'types/grid'

export interface CellSelectionProps {
  selectionBounds: SelectionRectangle | null
  anchorBounds: SelectionRectangle | null
  editingBounds: SelectionRectangle | null
  isSingleCellSelection: boolean
  isEditing: boolean
  editorValue: string
  onEditorChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onEditorBlur: () => void
  editorRef: RefObject<HTMLTextAreaElement | null>
}

const CellSelection = ({
  selectionBounds,
  anchorBounds,
  editingBounds,
  isSingleCellSelection,
  isEditing,
  editorValue,
  onEditorChange,
  onEditorBlur,
  editorRef,
}: CellSelectionProps) => (
  <>
    {selectionBounds && !isSingleCellSelection && (
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

    {isEditing && editingBounds && (
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

export default CellSelection
