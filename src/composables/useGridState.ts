/**
 * Grid state management composable
 */

import { ref, computed, reactive, readonly } from 'vue'
import type { GridState, CellPosition, SelectionRange } from '@/types/data-display-edit'
import { normalizeData, getDataDimensions } from '@/utils/dataNormalization'

export const useGridState = (initialData: string[][] = [['']]) => {
  // Normalize initial data
  const normalizedData = normalizeData(initialData)
  const dimensions = getDataDimensions(normalizedData)
  
  // Reactive state
  const state = reactive<GridState>({
    data: normalizedData,
    dimensions,
    selection: null,
    editingCell: null,
    editValue: '',
    isDirty: false
  })
  
  // Computed properties
  const isEditing = computed(() => state.editingCell !== null)
  const hasSelection = computed(() => state.selection !== null)
  const selectedCellsCount = computed(() => {
    if (!state.selection) return 0
    const rows = state.selection.end.row - state.selection.start.row + 1
    const cols = state.selection.end.col - state.selection.start.col + 1
    return rows * cols
  })
  
  // Actions
  const updateData = (newData: string[][]) => {
    const normalized = normalizeData(newData)
    state.data = normalized
    state.dimensions = getDataDimensions(normalized)
    state.isDirty = true
  }
  
  const setSelection = (selection: SelectionRange | null) => {
    state.selection = selection
  }
  
  const startEditing = (position: CellPosition, value: string = '') => {
    state.editingCell = position
    state.editValue = value
  }
  
  const stopEditing = () => {
    state.editingCell = null
    state.editValue = ''
  }
  
  const updateEditValue = (value: string) => {
    state.editValue = value
  }
  
  const setCellValue = (position: CellPosition, value: string) => {
    if (state.data[position.row] && state.data[position.row][position.col] !== undefined) {
      state.data[position.row][position.col] = value
      state.isDirty = true
    }
  }
  
  const getCellValue = (position: CellPosition): string => {
    return state.data[position.row]?.[position.col] || ''
  }
  
  const clearSelection = () => {
    state.selection = null
  }
  
  const resetDirtyFlag = () => {
    // @ts-ignore - Direct assignment to readonly property for state management
    state.isDirty = false
  }
  
  return {
    // State
    state: readonly(state),
    
    // Computed
    isEditing,
    hasSelection,
    selectedCellsCount,
    
    // Actions
    updateData,
    setSelection,
    startEditing,
    stopEditing,
    updateEditValue,
    setCellValue,
    getCellValue,
    clearSelection,
    resetDirtyFlag
  }
}
