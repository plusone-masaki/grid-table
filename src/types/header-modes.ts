/**
 * ヘッダー表示モードの型定義
 */
export type HeaderMode = 'numeric' | 'alphabetic' | 'array'

/**
 * ヘッダー表示モードの設定
 */
export interface HeaderModeConfig {
  mode: HeaderMode
  arrayHeaders?: string[]
}

/**
 * ヘッダー表示モードの定数
 */
export const HEADER_MODES = {
  NUMERIC: 'numeric' as const,
  ALPHABETIC: 'alphabetic' as const,
  ARRAY: 'array' as const
} as const
