import { onMounted, onUnmounted, type Ref } from 'vue'

export interface CellPosition {
  row: number
  col: number
}

export interface GridEventHandlers {
  onCellClick?: (position: CellPosition, event: MouseEvent) => void
  onCellDoubleClick?: (position: CellPosition, event: MouseEvent) => void
  onKeyDown?: (event: KeyboardEvent) => void
}

export interface GridEventSystem {
  registerHandler: (handlers: GridEventHandlers) => void
}

export function useGridEvents(gridContainer: Ref<HTMLTableElement | undefined>): GridEventSystem {
  const registeredHandlers: GridEventHandlers[] = []

  // セルの座標を取得する関数
  const getCellPosition = (target: EventTarget | null): CellPosition | null => {
    if (!target || !(target instanceof HTMLElement)) return null
    
    const cell = target.closest('td')
    if (!cell) return null
    
    const row = cell.parentElement
    if (!row) return null
    
    const tbody = row.parentElement
    if (!tbody || !tbody.classList.contains('grid-table__body')) return null
    
    const rowIndex = Array.from(tbody.children).indexOf(row)
    const colIndex = Array.from(row.children).indexOf(cell) - 1 // 行番号列を除く
    
    if (colIndex < 0) return null // 行番号列がクリックされた場合
    
    return { row: rowIndex, col: colIndex }
  }

  // 実際のイベントリスナー
  const handleClick = (event: MouseEvent) => {
    const position = getCellPosition(event.target)
    if (!position) return
    
    registeredHandlers.forEach(handler => {
      handler.onCellClick?.(position, event)
    })
  }

  const handleDoubleClick = (event: MouseEvent) => {
    const position = getCellPosition(event.target)
    if (!position) return
    
    registeredHandlers.forEach(handler => {
      handler.onCellDoubleClick?.(position, event)
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    registeredHandlers.forEach(handler => {
      handler.onKeyDown?.(event)
    })
  }

  // イベントリスナーの登録・解除
  onMounted(() => {
    if (!gridContainer.value) return
    
    gridContainer.value.addEventListener('click', handleClick)
    gridContainer.value.addEventListener('dblclick', handleDoubleClick)
    gridContainer.value.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    if (!gridContainer.value) return
    
    gridContainer.value.removeEventListener('click', handleClick)
    gridContainer.value.removeEventListener('dblclick', handleDoubleClick)
    gridContainer.value.removeEventListener('keydown', handleKeyDown)
  })

  // ハンドラー登録
  const registerHandler = (handlers: GridEventHandlers) => {
    registeredHandlers.push(handlers)
  }

  return {
    registerHandler
  }
}
