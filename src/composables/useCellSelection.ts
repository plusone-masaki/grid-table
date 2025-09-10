import { ref, computed, type Ref } from 'vue'
import type { GridEventSystem } from './useGridEvents'
import { useKeyboardHandler } from './useKeyboardHandler'
import type { KeyAction } from '@/types/key-config'

export interface CellPosition {
  row: number
  col: number
}

export interface SelectionRange {
  start: CellPosition
  end: CellPosition
}

export type CellSelectionMode = 'selecting' | 'editing'

export interface CellSelectionOptions {
  columnCount: Ref<number>
  rowCount: Ref<number>
  gridContainer: Ref<HTMLTableElement | undefined>
  eventSystem: GridEventSystem
  data: Ref<string[][]>
}

export function useCellSelection(options: CellSelectionOptions) {
  const { columnCount, rowCount, gridContainer, eventSystem, data } = options
  
  // キーボードハンドラーを初期化
  const keyboardHandler = useKeyboardHandler({ gridContainer })

  // 選択状態管理
  const selectedRange = ref<SelectionRange | null>(null)
  const activeCell = ref<CellPosition | null>(null) // 実際の編集対象セル
  const anchorCell = ref<CellPosition | null>(null) // 範囲選択のアンカー（固定点）
  const mode = ref<CellSelectionMode>('selecting')
  const editingValue = ref('')

  // 範囲の正規化（startとendを適切に並び替え）
  const normalizeRange = (range: SelectionRange): SelectionRange => {
    return {
      start: {
        row: Math.min(range.start.row, range.end.row),
        col: Math.min(range.start.col, range.end.col)
      },
      end: {
        row: Math.max(range.start.row, range.end.row),
        col: Math.max(range.start.col, range.end.col)
      }
    }
  }

  // 単一セル選択
  const selectCell = (position: CellPosition) => {
    const range: SelectionRange = {
      start: { ...position },
      end: { ...position }
    }
    selectedRange.value = range
    activeCell.value = { ...position } // アクティブセルを設定
    anchorCell.value = { ...position } // 範囲選択のアンカーもリセット
    mode.value = 'selecting'
  }

  // 範囲選択
  const selectRange = (start: CellPosition, end: CellPosition) => {
    const range: SelectionRange = { start, end }
    selectedRange.value = normalizeRange(range)
    activeCell.value = { ...start } // アクティブセルは開始セル（アンカー）に固定
    anchorCell.value = { ...start } // 開始セルをアンカーとして設定
    mode.value = 'selecting'
  }

  // 範囲拡張（Shift+クリック用、アクティブセルは変更しない）
  const extendRange = (start: CellPosition, end: CellPosition) => {
    const range: SelectionRange = { start, end }
    selectedRange.value = normalizeRange(range)
    // activeCell.value は変更しない
    mode.value = 'selecting'
  }

  // セル移動のヘルパー関数
  const clampPosition = (position: CellPosition): CellPosition => {
    return {
      row: Math.max(0, Math.min(position.row, rowCount.value - 1)),
      col: Math.max(0, Math.min(position.col, columnCount.value - 1))
    }
  }

  // 単一セル移動
  const moveActiveCell = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!activeCell.value) return

    let newPosition: CellPosition
    switch (direction) {
      case 'up':
        newPosition = { ...activeCell.value, row: activeCell.value.row - 1 }
        break
      case 'down':
        newPosition = { ...activeCell.value, row: activeCell.value.row + 1 }
        break
      case 'left':
        newPosition = { ...activeCell.value, col: activeCell.value.col - 1 }
        break
      case 'right':
        newPosition = { ...activeCell.value, col: activeCell.value.col + 1 }
        break
    }

    newPosition = clampPosition(newPosition)
    selectCell(newPosition)
  }

  // 範囲拡張
  const extendSelection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!activeCell.value) return

    // 現在の選択範囲の終端位置を取得（範囲選択が始まっている場合）
    // 範囲選択中でない場合はアクティブセルの位置を使用
    const currentEndPosition = selectedRange.value ? 
      (selectedRange.value.start.row === anchorCell.value?.row && 
       selectedRange.value.start.col === anchorCell.value?.col) 
        ? selectedRange.value.end 
        : selectedRange.value.start
      : activeCell.value

    let newPosition: CellPosition
    switch (direction) {
      case 'up':
        newPosition = { ...currentEndPosition, row: currentEndPosition.row - 1 }
        break
      case 'down':
        newPosition = { ...currentEndPosition, row: currentEndPosition.row + 1 }
        break
      case 'left':
        newPosition = { ...currentEndPosition, col: currentEndPosition.col - 1 }
        break
      case 'right':
        newPosition = { ...currentEndPosition, col: currentEndPosition.col + 1 }
        break
    }

    newPosition = clampPosition(newPosition)
    
    // アンカーセルを使用して範囲を拡張
    // アンカーが設定されていない場合は現在のアクティブセルをアンカーとする
    const anchor = anchorCell.value || activeCell.value
    const range: SelectionRange = {
      start: { ...anchor },
      end: { ...newPosition }
    }
    
    selectedRange.value = normalizeRange(range)
    // アクティブセルは移動しない（アンカーセルと同じ位置を維持）
    // アンカーセルは維持（変更しない）
  }

  // 全選択
  const selectAll = () => {
    if (rowCount.value === 0 || columnCount.value === 0) return
    
    const range: SelectionRange = {
      start: { row: 0, col: 0 },
      end: { row: rowCount.value - 1, col: columnCount.value - 1 }
    }
    selectedRange.value = range
    activeCell.value = { row: 0, col: 0 }
    anchorCell.value = { row: 0, col: 0 } // アンカーも設定
    mode.value = 'selecting'
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
  const startEditing = (position?: CellPosition) => {
    console.log('startEditing called, current mode:', mode.value, 'position:', position)
    
    if (mode.value === 'editing') {
      console.log('Already editing, finishing current edit first')
      finishEditing()
    }
    
    // 編集対象のセルを決定（指定がない場合はアクティブセル）
    const editTarget = position || activeCell.value
    if (!editTarget) {
      console.log('No edit target available')
      return
    }
    
    console.log('Starting edit for cell:', editTarget)
    mode.value = 'editing'
    editingValue.value = getCellValue(editTarget)
    console.log('Edit mode set, editing value:', editingValue.value)
  }

  // 編集終了
  const finishEditing = () => {
    console.log('finishEditing called, current mode:', mode.value, 'activeCell:', activeCell.value)
    
    if (mode.value !== 'editing' || !activeCell.value) {
      console.log('Not in editing mode or no active cell, skipping')
      return
    }

    // アクティブセルの値を更新
    console.log('Updating cell value:', editingValue.value)
    updateCellValue(activeCell.value, editingValue.value)
    
    mode.value = 'selecting'
    editingValue.value = ''
    
    // フォーカスをグリッドコンテナに戻す
    setTimeout(() => {
      if (gridContainer.value) {
        gridContainer.value.focus()
        console.log('Focus returned to grid container')
      }
    }, 0)
    
    console.log('Edit finished, mode set to selecting')
  }

  // 編集キャンセル
  const cancelEditing = () => {
    console.log('cancelEditing called')
    mode.value = 'selecting'
    editingValue.value = ''
    
    // フォーカスをグリッドコンテナに戻す
    setTimeout(() => {
      if (gridContainer.value) {
        gridContainer.value.focus()
        console.log('Focus returned to grid container after cancel')
      }
    }, 0)
  }

  // セル位置計算のヘルパー関数
  const getCellPosition = (position: CellPosition) => {
    if (!gridContainer.value) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }

    const cellSelector = `tbody tr:nth-child(${position.row + 1}) td:nth-child(${position.col + 2})`
    const cell = gridContainer.value.querySelector(cellSelector) as HTMLTableCellElement
    
    if (!cell) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }

    // テーブルコンテナを基準とした相対位置を取得
    const tableRect = gridContainer.value.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()

    return {
      top: cellRect.top - tableRect.top,
      left: cellRect.left - tableRect.left,
      width: cellRect.width,
      height: cellRect.height
    }
  }

  // アクティブセル（編集対象セル）の位置
  const activeCellPosition = computed(() => {
    if (!activeCell.value) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }
    return getCellPosition(activeCell.value)
  })

  // 選択範囲全体の位置
  const selectionRangePosition = computed(() => {
    if (!selectedRange.value || !gridContainer.value) {
      return { top: 0, left: 0, width: 0, height: 0 }
    }

    const { start, end } = selectedRange.value
    const startPos = getCellPosition(start)
    const endPos = getCellPosition(end)

    return {
      top: startPos.top,
      left: startPos.left,
      width: endPos.left + endPos.width - startPos.left,
      height: endPos.top + endPos.height - startPos.top
    }
  })


  // イベントハンドラーを自動登録
  eventSystem.registerHandler({
    onCellClick: (position: CellPosition, event: MouseEvent) => {
      if (mode.value === 'editing') {
        finishEditing()
      }
      
      if (event.shiftKey && anchorCell.value) {
        // Shift+クリックで範囲拡張（アンカーから指定位置まで）
        const range: SelectionRange = {
          start: { ...anchorCell.value },
          end: { ...position }
        }
        selectedRange.value = normalizeRange(range)
        // アクティブセルは移動しない（アンカーセルと同じ位置を維持）
        // アンカーセルは維持
      } else {
        // 通常クリックで単一セル選択
        selectCell(position)
      }
    },
    onCellDoubleClick: (position: CellPosition, event: MouseEvent) => {
      // ダブルクリックで編集開始（複数セル選択時は開始セルを編集）
      startEditing(position)
    }
  })

  // 統合されたEnterキーハンドラー（モード判定で分岐）
  keyboardHandler.registerHandler('confirmEdit', () => {
    console.log('Enter key handler called, current mode:', mode.value)
    if (mode.value === 'editing') {
      console.log('In editing mode, finishing edit')
      finishEditing()
    } else {
      console.log('Not in editing mode, starting edit')
      startEditing()
    }
  })

  keyboardHandler.registerHandler('cancelEdit', () => {
    console.log('cancelEdit handler called, current mode:', mode.value)
    if (mode.value === 'editing') {
      cancelEditing()
      return
    }
    console.log('Not in editing mode, ignoring cancelEdit')
  })

  keyboardHandler.registerHandler('startEdit', () => {
    console.log('F2 key handler called, current mode:', mode.value)
    if (mode.value === 'editing') {
      console.log('Already in editing mode, ignoring F2')
      return
    }
    startEditing()
  })

  // startEditWithEnterは削除（confirmEditで統合）

  keyboardHandler.registerHandler('moveNext', () => {
    console.log('moveNext handler called, current mode:', mode.value)
    if (mode.value === 'editing') {
      finishEditing()
      // 編集終了後に次のセルに移動
      setTimeout(() => moveActiveCell('right'), 0)
    } else {
      moveActiveCell('right')
    }
  })

  keyboardHandler.registerHandler('movePrevious', () => {
    console.log('movePrevious handler called, current mode:', mode.value)
    if (mode.value === 'editing') {
      finishEditing()
      // 編集終了後に前のセルに移動
      setTimeout(() => moveActiveCell('left'), 0)
    } else {
      moveActiveCell('left')
    }
  })

  // セル移動系ハンドラー
  keyboardHandler.registerHandler('moveUp', () => {
    if (mode.value === 'editing') return
    moveActiveCell('up')
  })
  
  keyboardHandler.registerHandler('moveDown', () => {
    if (mode.value === 'editing') return
    moveActiveCell('down')
  })
  
  keyboardHandler.registerHandler('moveLeft', () => {
    if (mode.value === 'editing') return
    moveActiveCell('left')
  })
  
  keyboardHandler.registerHandler('moveRight', () => {
    if (mode.value === 'editing') return
    moveActiveCell('right')
  })

  // 範囲選択系ハンドラー
  keyboardHandler.registerHandler('extendUp', () => {
    if (mode.value === 'editing') return
    extendSelection('up')
  })
  
  keyboardHandler.registerHandler('extendDown', () => {
    if (mode.value === 'editing') return
    extendSelection('down')
  })
  
  keyboardHandler.registerHandler('extendLeft', () => {
    if (mode.value === 'editing') return
    extendSelection('left')
  })
  
  keyboardHandler.registerHandler('extendRight', () => {
    if (mode.value === 'editing') return
    extendSelection('right')
  })

  keyboardHandler.registerHandler('selectAll', () => {
    if (mode.value === 'editing') return
    selectAll()
  })

  // Tab移動処理
  const handleTabMove = (direction: 'next' | 'previous') => {
    console.log('handleTabMove called with direction:', direction)
    // 少し遅延させてフォーカスが戻ってから移動
    setTimeout(() => {
      if (direction === 'next') {
        moveActiveCell('right')
      } else {
        moveActiveCell('left')
      }
    }, 10)
  }

  return {
    // 状態
    mode: computed(() => mode.value),
    activeCell: computed(() => activeCell.value),
    selectedRange: computed(() => selectedRange.value),
    editingValue,
    
    // 位置情報
    activeCellPosition,
    selectionRangePosition,
    
    // メソッド
    finishEditing,
    cancelEditing,
    handleTabMove
  }
}
