import type { GridDataset } from './grid'

export type WalkontableInstance = {
  draw: () => void
  update: (key: string, value: unknown) => void
  destroy?: () => void
  scrollVertical: (delta: number) => WalkontableInstance
  scrollHorizontal: (delta: number) => WalkontableInstance
}

export type WalkontableConstructor = new (
  settings: Record<string, unknown>,
) => WalkontableInstance

export type WalkontableDataset = {
  bodyRows: GridDataset
  columnHeaders: string[]
}

export type WalkontableScrollbar = {
  visible: boolean
  prepare: () => void
  refresh: () => void
  onScroll: (delta: number) => void
  getHandleSizeRatio: (viewport: number, total: number) => number
  destroy?: () => void
}

export type WalkontableScrollbarConstructor = new (
  instance: WalkontableInstance,
  type: 'vertical' | 'horizontal',
) => WalkontableScrollbar

declare global {
  interface Window {
    Walkontable?: WalkontableConstructor
    WalkontableScrollbar?: WalkontableScrollbarConstructor
  }
}

export {}
