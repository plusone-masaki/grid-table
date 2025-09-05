/**
 * 追加機能（ヘッダー、コメント行、キーコンフィグ）の型定義
 */

export interface HeaderConfig {
  type: HeaderType;
  visible: boolean;
  height: number;
  style: HeaderStyle;
}

export enum HeaderType {
  NUMERIC = 'numeric',
  ALPHABETIC = 'alphabetic',
  ARRAY_FIRST_ROW = 'array_first_row'
}

export interface HeaderStyle {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  borderColor: string;
}

export interface HeaderState {
  config: HeaderConfig;
  columnHeaders: string[];
  rowHeaders: string[];
  isGenerating: boolean;
}

export interface HeaderEvents {
  headerTypeChanged: (type: HeaderType) => void;
  headerVisibilityChanged: (visible: boolean) => void;
  headerGenerated: (headers: { columns: string[]; rows: string[] }) => void;
}

export interface CommentRowConfig {
  enabled: boolean;
  height: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic';
  borderColor: string;
  mergeCells: boolean;
}

export interface CommentRow {
  id: string;
  rowIndex: number;
  content: string;
  isEditable: boolean;
  mergedCells: { start: number; end: number };
}

export interface CommentRowState {
  config: CommentRowConfig;
  commentRows: CommentRow[];
  editingRow: string | null;
}

export interface CommentRowEvents {
  commentRowAdded: (commentRow: CommentRow) => void;
  commentRowUpdated: (commentRow: CommentRow) => void;
  commentRowDeleted: (rowId: string) => void;
  commentRowEditStarted: (rowId: string) => void;
  commentRowEditEnded: (rowId: string) => void;
}

export interface KeyConfig {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  customKey: string | null;
  category: KeyCategory;
  enabled: boolean;
}

export enum KeyCategory {
  NAVIGATION = 'navigation',
  SELECTION = 'selection',
  EDITING = 'editing',
  STRUCTURE = 'structure',
  UNDO_REDO = 'undo_redo',
  CUSTOM = 'custom'
}

export interface KeyBinding {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface KeyConfigState {
  configs: Map<string, KeyConfig>;
  activeBindings: Map<string, KeyBinding>;
  isRecording: boolean;
  recordingKey: string | null;
}

export interface KeyConfigEvents {
  keyBindingChanged: (keyId: string, newBinding: KeyBinding) => void;
  keyConfigAdded: (config: KeyConfig) => void;
  keyConfigRemoved: (keyId: string) => void;
  keyRecordingStarted: (keyId: string) => void;
  keyRecordingEnded: (keyId: string, success: boolean) => void;
}

export interface KeyConfigExport {
  version: string;
  timestamp: number;
  configs: KeyConfig[];
}

export interface KeyConfigImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}
