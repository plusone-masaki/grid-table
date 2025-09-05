/**
 * 高速再描画機能の型定義
 */

import { CellPosition } from './data-display-edit';

export interface RenderingState {
  viewport: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  cellDimensions: {
    width: number;
    height: number;
  };
  scrollPosition: {
    scrollTop: number;
    scrollLeft: number;
  };
  isVirtualized: boolean;
  virtualizationBuffer: number;
}

export interface RenderConfig {
  batchSize: number;
  animationDuration: number;
  virtualizationBuffer: number;
  enableSmoothScrolling: boolean;
  enablePartialUpdates: boolean;
}

export interface RenderEvents {
  renderStart: () => void;
  renderComplete: () => void;
  partialUpdate: (updatedCells: CellPosition[]) => void;
  performanceWarning: (message: string) => void;
  renderError: (error: string) => void;
}

export interface VirtualizationMetrics {
  visibleCells: number;
  totalCells: number;
  renderedCells: number;
  skippedCells: number;
  renderTime: number;
}

export interface DiffResult {
  added: CellPosition[];
  removed: CellPosition[];
  modified: CellPosition[];
  unchanged: CellPosition[];
}

export interface RenderStrategy {
  type: 'differential' | 'partial' | 'full';
  priority: number;
  conditions: RenderCondition[];
}

export interface RenderCondition {
  dataSize: { min: number; max: number };
  changeRatio: { min: number; max: number };
  performance: { minFPS: number; maxRenderTime: number };
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AdaptiveConfig {
  autoAdjust: boolean;
  performanceThresholds: {
    lowFPS: number;
    highRenderTime: number;
    memoryWarning: number;
  };
  adjustmentFactors: {
    batchSize: { min: number; max: number; step: number };
    virtualizationBuffer: { min: number; max: number; step: number };
  };
}

export interface CellRenderInfo {
  position: CellPosition;
  value: string;
  isVisible: boolean;
  isSelected: boolean;
  isEditing: boolean;
  needsUpdate: boolean;
}
