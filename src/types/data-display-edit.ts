/**
 * データ表示・編集機能の型定義
 */

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export interface GridState {
  data: string[][];
  dimensions: { rows: number; cols: number };
  selection: SelectionRange | null;
  editingCell: CellPosition | null;
  editValue: string;
  isDirty: boolean;
}

export interface GridConfig {
  data: string[][];
  cellWidth: number;
  cellHeight: number;
  enableEditing: boolean;
  enableSelection: boolean;
  enableKeyboardNavigation: boolean;
}

export interface DataDisplayEvents {
  cellClick: (position: CellPosition) => void;
  cellDoubleClick: (position: CellPosition) => void;
  rangeSelect: (range: SelectionRange) => void;
  editStart: (position: CellPosition) => void;
  editEnd: (position: CellPosition, value: string) => void;
  dataChange: (changes: CellChange[]) => void;
  error: (error: string) => void;
}

export interface CellChange {
  position: CellPosition;
  oldValue: string;
  newValue: string;
}

export interface DataCompletionOptions {
  fillEmptyCells: boolean;
  normalizeColumnCount: boolean;
  defaultCellValue: string;
}

export interface EditModeState {
  isActive: boolean;
  position: CellPosition | null;
  value: string;
  cursorPosition: number;
}

export interface ValidationRule {
  pattern: RegExp;
  message: string;
  required: boolean;
}

export interface CellValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
