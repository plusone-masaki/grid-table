import { ref, computed, type Ref } from 'vue'
import type { GridEventSystem } from './useGridEvents'

export interface CellPosition {
  row: number
  col: number
}

export interface CellSelectionOptions {
  columnCount: Ref<number>
  rowCount: Ref<number>
  gridContainer: Ref<HTMLTableElement | undefined>
  eventSystem: GridEventSystem
  data: Ref<string[][]>
}

export function useCellSelection(options: CellSelectionOptions) {
  const { columnCount, rowCount, gridContainer, eventSystem, data } = options

  // 選択状態管理
  const selectedCell = ref<CellPosition | null>(null)
  const isVisible = ref(false)
  
  // 編集状態管理
  const isEditing = ref(false)
  const editingValue = ref('')

  // セル選択
  const selectCell = (position: CellPosition) => {
    selectedCell.value = position
    isVisible.value = true
  }

  // 選択解除
  const clearSelection = () => {
    selectedCell.value = null
    isVisible.value = false
    isEditing.value = false
  }

  // セル値の取得
  const getCellValue = (position: CellPosition): string => {
    const { row, col } = position
    if (row < 0 || row >= data.value.length) return ''
    if (col < 0 || col >= data.value[row].length) return ''
    return data.value[row][col] || ''
  }

  // セル値の更新
  const updateCellValue = (position: CellPosition, value: string) => {
    const { row, col } = position
    
    // データ配列のサイズを確保
    while (data.value.length <= row) {
      data.value.push([])
    }
    while (data.value[row].length <= col) {
      data.value[row].push('')
    }
    
    // セル値を更新
    data.value[row][col] = value
  }

  // 編集開始
  const startEditing = (position: CellPosition) => {
    if (isEditing.value) {
      finishEditing()
    }
    
    selectCell(position)
    isEditing.value = true
    editingValue.value = getCellValue(position)
  }

  // 編集終了
  const finishEditing = () => {
    if (!isEditing.value || !selectedCell.value) return

    updateCellValue(selectedCell.value, editingValue.value)
    isEditing.value = false
    editingValue.value = ''
  }

  // 編集キャンセル
  const cancelEditing = () => {
    isEditing.value = false
    editingValue.value = ''
  }

  // 選択位置の計算
  const selectionPosition = computed(() => {
    if (!selectedCell.value || !gridContainer.value) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }

    const { row, col } = selectedCell.value
    
    // 実際のセルのDOM要素を取得
    const cellSelector = `tbody tr:nth-child(${row + 1}) td:nth-child(${col + 2})`
    const targetCell = gridContainer.value.querySelector(cellSelector) as HTMLTableCellElement
    
    if (!targetCell) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }

    // テーブルコンテナを基準とした相対位置を取得
    const tableRect = gridContainer.value.getBoundingClientRect()
    const cellRect = targetCell.getBoundingClientRect()
    
    return {
      top: cellRect.top - tableRect.top,
      left: cellRect.left - tableRect.left,
      width: cellRect.width,
      height: cellRect.height
    }
  })

  // 選択されているかどうか
  const hasSelection = computed(() => selectedCell.value !== null)

  // 指定されたセルが選択されているかどうか
  const isCellSelected = (position: CellPosition): boolean => {
    if (!selectedCell.value) return false
    return selectedCell.value.row === position.row && 
           selectedCell.value.col === position.col
  }

  // イベントハンドラーを自動登録
  eventSystem.registerHandler({
    onCellClick: (position: CellPosition, event: MouseEvent) => {
      if (isEditing.value) {
        finishEditing()
      }
      selectCell(position)
    },
    onCellDoubleClick: (position: CellPosition, event: MouseEvent) => {
      startEditing(position)
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (isEditing.value) {
        if (event.key === 'Enter') {
          event.preventDefault()
          finishEditing()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancelEditing()
        }
      }
    }
  })

  return {
    // 状態
    selectedCell: computed(() => selectedCell.value),
    isVisible: computed(() => isVisible.value),
    isEditing: computed(() => isEditing.value),
    editingValue,
    selectionPosition,
    hasSelection,
    
    // メソッド
    selectCell,
    clearSelection,
    isCellSelected,
    startEditing,
    finishEditing,
    cancelEditing
  }
}
