export interface KeyBinding {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

export interface KeyConfig {
  // セル選択・移動
  moveUp: KeyBinding[]
  moveDown: KeyBinding[]
  moveLeft: KeyBinding[]
  moveRight: KeyBinding[]
  
  // 範囲選択
  extendUp: KeyBinding[]
  extendDown: KeyBinding[]
  extendLeft: KeyBinding[]
  extendRight: KeyBinding[]
  
  // 全選択
  selectAll: KeyBinding[]
  
  // 編集
  startEdit: KeyBinding[]  // F2, Enter, Shift+Enter など複数のキーで編集開始
  cancelEdit: KeyBinding[]
  
  // 次のセル・前のセル
  moveNext: KeyBinding[]
  movePrevious: KeyBinding[]
}

export const DEFAULT_KEY_CONFIG: KeyConfig = {
  // セル選択・移動
  moveUp: [{ key: 'ArrowUp' }],
  moveDown: [{ key: 'ArrowDown' }],
  moveLeft: [{ key: 'ArrowLeft' }],
  moveRight: [{ key: 'ArrowRight' }],
  
  // 範囲選択
  extendUp: [{ key: 'ArrowUp', shiftKey: true }],
  extendDown: [{ key: 'ArrowDown', shiftKey: true }],
  extendLeft: [{ key: 'ArrowLeft', shiftKey: true }],
  extendRight: [{ key: 'ArrowRight', shiftKey: true }],
  
  // 全選択
  selectAll: [{ key: 'a', ctrlKey: true }],
  
  // 編集
  startEdit: [
    { key: 'F2' },
    { key: 'Enter' },
    { key: 'Enter', shiftKey: true }
  ],  // F2, Enter, Shift+Enter すべてで編集開始
  cancelEdit: [{ key: 'Escape' }],
  
  // 次のセル・前のセル
  moveNext: [{ key: 'Tab' }],
  movePrevious: [{ key: 'Tab', shiftKey: true }]
}

export type KeyAction = keyof KeyConfig

