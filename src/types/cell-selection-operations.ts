/**
 * セル選択操作機能の型定義
 */

import { CellPosition, SelectionRange } from './data-display-edit';

export interface SelectionState {
  selection: SelectionRange | null;
  hoveredCell: CellPosition | null;
  isSelecting: boolean;
  selectionStart: CellPosition | null;
}

export interface SelectionEvents {
  cellSelect: (position: CellPosition) => void;
  rangeSelect: (range: SelectionRange) => void;
  allSelect: () => void;
  selectionClear: () => void;
  cellHover: (position: CellPosition | null) => void;
  selectionModeChange: (mode: 'single' | 'range') => void;
}

export interface EdgeJumpState {
  viewport: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  dataDimensions: {
    rows: number;
    cols: number;
  };
}

export interface JumpDirection {
  type: 'up' | 'down' | 'left' | 'right';
  extendSelection: boolean;
}

export interface SelectionConfig {
  enableRangeSelection: boolean;
  enableMultiSelection: boolean;
  enableEdgeJump: boolean;
  selectionMode: 'single' | 'range' | 'multi';
  keyboardNavigation: boolean;
  mouseSelection: boolean;
}

export interface SelectionMetrics {
  selectedCells: number;
  selectionArea: number;
  selectionTime: number;
  memoryUsage: number;
}

export interface KeyboardShortcuts {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  selectAll: string;
  clearSelection: string;
  startEdit: string;
  edgeJumpUp: string;
  edgeJumpDown: string;
  edgeJumpLeft: string;
  edgeJumpRight: string;
}

export interface MouseSelectionState {
  isMouseDown: boolean;
  dragStartPosition: CellPosition | null;
  isDragging: boolean;
  dragThreshold: number;
}
