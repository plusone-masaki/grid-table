/**
 * テーブル構造操作機能の型定義
 */

import type { CellPosition, SelectionRange } from './data-display-edit';

export interface StructureOperationResult {
  success: boolean;
  newData: string[][];
  newDimensions: { rows: number; cols: number };
  affectedRange: SelectionRange | null;
  deletedData?: string[][];
  error?: string;
}

export interface InsertOperation {
  type: 'insertRow' | 'insertColumn';
  position: number;
  count: number;
  data?: string[][];
}

export interface DeleteOperation {
  type: 'deleteRow' | 'deleteColumn';
  position: number;
  count: number;
  deletedData: string[][];
}

export interface TableStructureState {
  data: string[][];
  dimensions: { rows: number; cols: number };
  selection: SelectionRange | null;
}

export interface StructureEvents {
  beforeStructureChange: (operation: InsertOperation | DeleteOperation) => void;
  structureChange: (result: StructureOperationResult) => void;
  selectionUpdate: (newSelection: SelectionRange | null) => void;
  structureError: (error: string) => void;
}

export interface StructureOperationOptions {
  preserveSelection: boolean;
  adjustSelection: boolean;
  validateOperation: boolean;
}

export interface BatchStructureOperation {
  operations: (InsertOperation | DeleteOperation)[];
  description: string;
  timestamp: number;
}

export interface StructureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StructureOperationMetrics {
  operationTime: number;
  affectedCells: number;
  memoryUsage: number;
}
