import { ref, computed, type Ref } from 'vue'

export interface CellPosition {
  row: number
  col: number
}

export interface CellEditingOptions {
  data: Ref<string[][]>
}

export function useCellEditing(options: CellEditingOptions) {
  const { data } = options

  // 編集状態管理
  const isEditing = ref(false)
  const editingPosition = ref<CellPosition | null>(null)
  const editingValue = ref('')

  // セル編集開始
  const startEditing = (position: CellPosition) => {
    if (isEditing.value) {
      finishEditing()
    }
    
    isEditing.value = true
    editingPosition.value = position
    editingValue.value = getCellValue(position)
  }

  // セル編集終了
  const finishEditing = (save: boolean = true) => {
    if (!isEditing.value || !editingPosition.value) return

    if (save) {
      updateCellValue(editingPosition.value, editingValue.value)
    }

    isEditing.value = false
    editingPosition.value = null
    editingValue.value = ''
  }

  // セル編集キャンセル
  const cancelEditing = () => {
    finishEditing(false)
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

  // 現在編集中のセルかどうか
  const isCellEditing = (position: CellPosition): boolean => {
    if (!isEditing.value || !editingPosition.value) return false
    return editingPosition.value.row === position.row && 
           editingPosition.value.col === position.col
  }

  return {
    // 状態
    isEditing: computed(() => isEditing.value),
    editingPosition: computed(() => editingPosition.value),
    editingValue,
    
    // メソッド
    startEditing,
    finishEditing,
    cancelEditing,
    getCellValue,
    updateCellValue,
    isCellEditing
  }
}
