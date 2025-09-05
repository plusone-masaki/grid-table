/**
 * useGridState composable tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useGridState } from '@/composables/useGridState'
import type { CellPosition, SelectionRange } from '@/types/data-display-edit'

describe('useGridState', () => {
  let composable: ReturnType<typeof useGridState>

  beforeEach(() => {
    const initialData = [
      ['A1', 'B1', 'C1'],
      ['A2', 'B2', 'C2']
    ]
    composable = useGridState(initialData)
  })

  describe('initial state', () => {
    it('initializes with provided data', () => {
      expect(composable.state.data).toEqual([
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2']
      ])
    })

    it('calculates correct dimensions', () => {
      expect(composable.state.dimensions).toEqual({ rows: 2, cols: 3 })
    })

    it('initializes with no selection', () => {
      expect(composable.state.selection).toBeNull()
    })

    it('initializes with no editing cell', () => {
      expect(composable.state.editingCell).toBeNull()
    })

    it('initializes with empty edit value', () => {
      expect(composable.state.editValue).toBe('')
    })

    it('initializes as not dirty', () => {
      expect(composable.state.isDirty).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('isEditing returns false initially', () => {
      expect(composable.isEditing.value).toBe(false)
    })

    it('hasSelection returns false initially', () => {
      expect(composable.hasSelection.value).toBe(false)
    })

    it('selectedCellsCount returns 0 initially', () => {
      expect(composable.selectedCellsCount.value).toBe(0)
    })
  })

  describe('data operations', () => {
    it('updates data correctly', () => {
      const newData = [
        ['X1', 'Y1'],
        ['X2', 'Y2'],
        ['X3', 'Y3']
      ]
      
      composable.updateData(newData)
      
      expect(composable.state.data).toEqual(newData)
      expect(composable.state.dimensions).toEqual({ rows: 3, cols: 2 })
      expect(composable.state.isDirty).toBe(true)
    })

    it('normalizes data on update', () => {
      const irregularData = [
        ['A1', 'B1'],
        ['A2', 'B2', 'C2'],
        ['A3']
      ]
      
      composable.updateData(irregularData)
      
      expect(composable.state.data).toEqual([
        ['A1', 'B1', ''],
        ['A2', 'B2', 'C2'],
        ['A3', '', '']
      ])
    })
  })

  describe('selection operations', () => {
    it('sets selection correctly', () => {
      const selection: SelectionRange = {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 }
      }
      
      composable.setSelection(selection)
      
      expect(composable.state.selection).toEqual(selection)
      expect(composable.hasSelection.value).toBe(true)
      expect(composable.selectedCellsCount.value).toBe(4)
    })

    it('clears selection', () => {
      const selection: SelectionRange = {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 0 }
      }
      
      composable.setSelection(selection)
      composable.clearSelection()
      
      expect(composable.state.selection).toBeNull()
      expect(composable.hasSelection.value).toBe(false)
    })
  })

  describe('editing operations', () => {
    it('starts editing correctly', () => {
      const position: CellPosition = { row: 0, col: 1 }
      const value = 'New Value'
      
      composable.startEditing(position, value)
      
      expect(composable.state.editingCell).toEqual(position)
      expect(composable.state.editValue).toBe(value)
      expect(composable.isEditing.value).toBe(true)
    })

    it('stops editing correctly', () => {
      const position: CellPosition = { row: 0, col: 1 }
      
      composable.startEditing(position, 'Value')
      composable.stopEditing()
      
      expect(composable.state.editingCell).toBeNull()
      expect(composable.state.editValue).toBe('')
      expect(composable.isEditing.value).toBe(false)
    })

    it('updates edit value', () => {
      const position: CellPosition = { row: 0, col: 1 }
      
      composable.startEditing(position, 'Initial')
      composable.updateEditValue('Updated')
      
      expect(composable.state.editValue).toBe('Updated')
    })
  })

  describe('cell operations', () => {
    it('sets cell value correctly', () => {
      const position: CellPosition = { row: 0, col: 1 }
      const value = 'New Value'
      
      composable.setCellValue(position, value)
      
      expect(composable.state.data[0][1]).toBe(value)
      expect(composable.state.isDirty).toBe(true)
    })

    it('gets cell value correctly', () => {
      const position: CellPosition = { row: 1, col: 2 }
      
      const value = composable.getCellValue(position)
      
      expect(value).toBe('C2')
    })

    it('handles out of bounds cell access', () => {
      const position: CellPosition = { row: 10, col: 10 }
      
      const value = composable.getCellValue(position)
      
      expect(value).toBe('')
    })
  })

  describe('dirty flag management', () => {
    it('resets dirty flag', () => {
      composable.state.isDirty = true
      
      composable.resetDirtyFlag()
      
      expect(composable.state.isDirty).toBe(false)
    })
  })
})
