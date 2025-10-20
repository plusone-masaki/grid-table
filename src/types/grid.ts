import type { CSSProperties } from 'react'

export type GridCellValue = string | number | boolean | null | undefined

export type GridRow = Record<string, GridCellValue>

export type GridDataset = GridRow[]

export interface ComputedColumnMetrics {
  id: string
  width: number
  offset: number
  isFrozen: boolean
}

export interface ComputedRowMetrics {
  height: number
}

export interface OverscanConfig {
  rows?: number
  columns?: number
}

export interface ViewportRange {
  rowStart: number
  rowEnd: number
  columnStart: number
  columnEnd: number
  top: number
  left: number
}

export interface ScrollPosition {
  top: number
  left: number
}

export type ColumnPreset = 'alpha' | 'numeric' | 'headers'

export interface GridTableProps {
  data: GridDataset
  headerType?: ColumnPreset
  overscan?: OverscanConfig
  onViewportChange?: (viewport: ViewportRange) => void
  initialScrollPosition?: Partial<ScrollPosition>
  className?: string
  style?: CSSProperties
}
