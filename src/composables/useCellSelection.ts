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
  const currentEndCell = ref<CellPosition | null>(null) // 現在の範囲拡張の終端セル
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
    currentEndCell.value = { ...position } // 終端セルもリセット
    mode.value = 'selecting'
  }

  // 範囲選択
  const selectRange = (start: CellPosition, end: CellPosition) => {
    const range: SelectionRange = { start, end }
    selectedRange.value = normalizeRange(range)
    activeCell.value = { ...start } // アクティブセルは開始セル（アンカー）に固定
    anchorCell.value = { ...start } // 開始セルをアンカーとして設定
    currentEndCell.value = { ...end } // 終端セルを設定
    mode.value = 'selecting'
  }

  // 範囲拡張（Shift+クリック用、アクティブセルは変更しない）
  const extendRange = (start: CellPosition, end: CellPosition) => {
    const range: SelectionRange = { start, end }
    selectedRange.value = normalizeRange(range)
    // activeCell.value は変更しない
    currentEndCell.value = { ...end } // 終端セルを更新
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

    // アンカーが設定されていない場合は現在のアクティブセルをアンカーとして設定
    if (!anchorCell.value) {
      anchorCell.value = { ...activeCell.value }
      currentEndCell.value = { ...activeCell.value }
    }

    // 現在の終端位置から新しい終端位置を計算
    const currentEndPosition = currentEndCell.value || activeCell.value
    
    let newEndPosition: CellPosition
    switch (direction) {
      case 'up':
        newEndPosition = { ...currentEndPosition, row: currentEndPosition.row - 1 }
        break
      case 'down':
        newEndPosition = { ...currentEndPosition, row: currentEndPosition.row + 1 }
        break
      case 'left':
        newEndPosition = { ...currentEndPosition, col: currentEndPosition.col - 1 }
        break
      case 'right':
        newEndPosition = { ...currentEndPosition, col: currentEndPosition.col + 1 }
        break
    }

    newEndPosition = clampPosition(newEndPosition)
    
    // 終端位置を更新
    currentEndCell.value = { ...newEndPosition }
    
    // アンカーから新しい終端位置までの範囲を作成してnormalizeして保存
    const range: SelectionRange = {
      start: { ...anchorCell.value },
      end: { ...newEndPosition }
    }
    
    selectedRange.value = normalizeRange(range)
  }

  // 全選択
  const selectAll = () => {
    if (rowCount.value === 0 || columnCount.value === 0) return
    
    const range: SelectionRange = {
      start: { row: 0, col: 0 },
      end: { row: rowCount.value - 1, col: columnCount.value - 1 }
    }
    selectedRange.value = range
    
    // アクティブセルがない場合のみ(0,0)に設定、ある場合は現在位置を維持
    if (!activeCell.value) {
      activeCell.value = { row: 0, col: 0 }
      anchorCell.value = { row: 0, col: 0 }
    } else {
      // 現在のアクティブセルをアンカーとして設定
      anchorCell.value = { ...activeCell.value }
    }
    
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
    if (mode.value === 'editing') {
      finishEditing()
    }

    const editTarget = position || activeCell.value
    if (!editTarget) {
      return
    }

    mode.value = 'editing'
    editingValue.value = getCellValue(editTarget)
  }

  // 編集終了
  const finishEditing = () => {
    if (mode.value !== 'editing' || !activeCell.value) {
      return
    }

    updateCellValue(activeCell.value, editingValue.value)
    mode.value = 'selecting'
    editingValue.value = ''

    setTimeout(() => {
      if (gridContainer.value) {
        gridContainer.value.focus()
      }
    }, 0)
  }

  // 編集キャンセル
  const cancelEditing = () => {
    mode.value = 'selecting'
    editingValue.value = ''
    
    // フォーカスをグリッドコンテナに戻す
    setTimeout(() => {
      if (gridContainer.value) {
        gridContainer.value.focus()
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

  // 編集開始/確定ハンドラー（F2, Enter, Shift+Enter すべてに対応）
  keyboardHandler.registerHandler('startEdit', () => {
    if (mode.value !== 'editing') {
      startEditing()
    }
  })

  keyboardHandler.registerHandler('cancelEdit', () => {
    if (mode.value === 'editing') {
      cancelEditing()
      return
    }
  })

  keyboardHandler.registerHandler('startEdit', () => {
    if (mode.value === 'editing') {
      return
    }
    startEditing()
  })

  // startEditWithEnterは削除（confirmEditで統合）

  keyboardHandler.registerHandler('moveNext', () => {
    if (mode.value === 'editing') {
      finishEditing()
      // 編集終了後に次のセルに移動（範囲を考慮）
      setTimeout(() => performNextCellMove('next'), 10)
    } else {
      // 選択中の場合は範囲を考慮した次のセル移動（即座に実行）
      performNextCellMove('next')
    }
  })

  keyboardHandler.registerHandler('movePrevious', () => {
    if (mode.value === 'editing') {
      finishEditing()
      // 編集終了後に前のセルに移動（範囲を考慮）
      setTimeout(() => performNextCellMove('previous'), 10)
    } else {
      // 選択中の場合は範囲を考慮した前のセル移動（即座に実行）
      performNextCellMove('previous')
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

  const handleMoveCell = (direction: 'next' | 'previous' | 'down' | 'up') => {
    setTimeout(() => {
      if (direction === 'next' || direction === 'previous') {
        performNextCellMove(direction)
      } else {
        moveActiveCell(direction)
      }
    }, 10)
  }
  
  const performNextCellMove = (direction: 'next' | 'previous') => {
    if (selectedRange.value && !isSingleCell(selectedRange.value)) {
      // 範囲選択されている場合は範囲内で移動
      moveWithinRange(direction)
    } else {
      // 単一セル選択の場合は通常移動
      if (direction === 'next') {
        moveActiveCell('right')
      } else {
        moveActiveCell('left')
      }
    }
  }
  
  // 単一セルかどうかを判定
  const isSingleCell = (range: SelectionRange): boolean => {
    return range.start.row === range.end.row && range.start.col === range.end.col
  }
  
  // 範囲内での次のセル・前のセル移動
  const moveWithinRange = (direction: 'next' | 'previous') => {
    if (!selectedRange.value || !activeCell.value) return
    
    const range = selectedRange.value
    const current = activeCell.value
    
    
    let newRow = current.row
    let newCol = current.col
    
    if (direction === 'next') {
      // 次のセルに移動、範囲の右端に達したら次の行の左端へ
      newCol++
      if (newCol > range.end.col) {
        newCol = range.start.col
        newRow++
        if (newRow > range.end.row) {
          // 範囲の最下行を超えたら最上行に戻る
          newRow = range.start.row
        }
      }
    } else {
      // 前のセルに移動、範囲の左端に達したら前の行の右端へ
      newCol--
      if (newCol < range.start.col) {
        newCol = range.end.col
        newRow--
        if (newRow < range.start.row) {
          // 範囲の最上行を超えたら最下行に戻る
          newRow = range.end.row
        }
      }
    }
    
    const newPosition: CellPosition = { row: newRow, col: newCol }
    
    // アクティブセルのみ移動、選択範囲は維持
    activeCell.value = newPosition
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
    selectCell,
    finishEditing,
    cancelEditing,
    handleMoveCell
  }
}
