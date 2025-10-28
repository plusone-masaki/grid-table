import type { GridDataset, OverscanConfig } from 'types/grid'

export const DEFAULT_OVERSCAN: OverscanConfig = {
  rows: 5,
  columns: 2,
}

export const DEFAULT_OVERSCAN_ROWS = 5
export const DEFAULT_OVERSCAN_COLUMNS = 2

export const EMPTY_DATASET_FALLBACK: GridDataset = [['']] as unknown as GridDataset

export const ROW_INDEX_CHAR_WIDTH = 9.6
export const ROW_INDEX_PADDING = 24
export const MIN_ROW_INDEX_WIDTH = 48
export const HEADER_HEIGHT = 24

export const DEFAULT_SAMPLE_SIZE = 50

export const MIN_COLUMN_WIDTH = 80
export const MIN_ROW_HEIGHT = 22

export const DEFAULT_ROW_COUNT = 120
export const DEFAULT_COLUMN_COUNT = 60
export const MAX_ROW_COUNT = 10000
export const MAX_COLUMN_COUNT = 200
export const MIN_ROW_COUNT = 0
export const MIN_COLUMN_COUNT = 1
