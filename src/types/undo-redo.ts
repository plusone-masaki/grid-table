/**
 * Undo/Redo機能の型定義
 */

import { CellPosition } from './data-display-edit';

export interface UndoRedoState {
  undoStack: OperationHistory[];
  redoStack: OperationHistory[];
  maxHistorySize: number;
  currentIndex: number;
  isPerformingOperation: boolean;
}

export interface OperationHistory {
  id: string;
  type: OperationType;
  timestamp: number;
  description: string;
  data: OperationData;
  inverseOperation?: OperationHistory;
}

export enum OperationType {
  DATA_EDIT = 'data_edit',
  ROW_INSERT = 'row_insert',
  ROW_DELETE = 'row_delete',
  COLUMN_INSERT = 'column_insert',
  COLUMN_DELETE = 'column_delete',
  BATCH_OPERATION = 'batch_operation'
}

export interface OperationData {
  cellChanges?: CellChange[];
  structureChanges?: StructureChange[];
  subOperations?: OperationHistory[];
  deletedData?: {
    rows?: string[][];
    columns?: string[][];
  };
}

export interface CellChange {
  position: CellPosition;
  oldValue: string;
  newValue: string;
}

export interface StructureChange {
  type: 'insert' | 'delete';
  position: number;
  count: number;
  data?: string[][];
}

export interface UndoRedoEvents {
  historyChanged: (canUndo: boolean, canRedo: boolean) => void;
  operationPerformed: (operation: OperationHistory) => void;
  memoryWarning: (usage: number, limit: number) => void;
  historyCleared: () => void;
}

export interface UndoRedoConfig {
  maxHistorySize: number;
  memoryLimit: number;
  enableBatchOperations: boolean;
  autoCleanup: boolean;
}

export interface MemoryUsageInfo {
  currentUsage: number;
  limit: number;
  operationCount: number;
  averageOperationSize: number;
}

export interface OperationMetrics {
  executionTime: number;
  memoryImpact: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface BatchOperationContext {
  isActive: boolean;
  operations: OperationHistory[];
  description: string;
  startTime: number;
}

export interface HistoryInfo {
  undoCount: number;
  redoCount: number;
  memoryUsage: number;
  nextUndoDescription?: string;
  nextRedoDescription?: string;
}
