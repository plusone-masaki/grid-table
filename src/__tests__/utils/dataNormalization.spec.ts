/**
 * Data normalization utilities tests
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeData,
  getDataDimensions,
  isValidPosition,
  createEmptyData,
  cloneData
} from '@/utils/dataNormalization'
import type { CellPosition } from '@/types/data-display-edit'

describe('dataNormalization', () => {
  describe('normalizeData', () => {
    it('normalizes data with consistent column count', () => {
      const data = [
        ['A1', 'B1'],
        ['A2', 'B2', 'C2'],
        ['A3']
      ]
      
      const result = normalizeData(data)
      
      expect(result).toEqual([
        ['A1', 'B1', ''],
        ['A2', 'B2', 'C2'],
        ['A3', '', '']
      ])
    })

    it('handles empty array', () => {
      const result = normalizeData([])
      
      expect(result).toEqual([['']])
    })

    it('handles null/undefined data', () => {
      const result = normalizeData(null as any)
      
      expect(result).toEqual([['']])
    })

    it('preserves already normalized data', () => {
      const data = [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2']
      ]
      
      const result = normalizeData(data)
      
      expect(result).toEqual(data)
    })
  })

  describe('getDataDimensions', () => {
    it('calculates correct dimensions', () => {
      const data = [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2'],
        ['A3', 'B3']
      ]
      
      const result = getDataDimensions(data)
      
      expect(result).toEqual({ rows: 3, cols: 3 })
    })

    it('handles empty array', () => {
      const result = getDataDimensions([])
      
      expect(result).toEqual({ rows: 0, cols: 0 })
    })

    it('handles single cell', () => {
      const data = [['A1']]
      
      const result = getDataDimensions(data)
      
      expect(result).toEqual({ rows: 1, cols: 1 })
    })
  })

  describe('isValidPosition', () => {
    it('validates correct position', () => {
      const position: CellPosition = { row: 1, col: 2 }
      const dimensions = { rows: 3, cols: 4 }
      
      const result = isValidPosition(position, dimensions)
      
      expect(result).toBe(true)
    })

    it('rejects position out of bounds', () => {
      const position: CellPosition = { row: 5, col: 2 }
      const dimensions = { rows: 3, cols: 4 }
      
      const result = isValidPosition(position, dimensions)
      
      expect(result).toBe(false)
    })

    it('rejects negative position', () => {
      const position: CellPosition = { row: -1, col: 2 }
      const dimensions = { rows: 3, cols: 4 }
      
      const result = isValidPosition(position, dimensions)
      
      expect(result).toBe(false)
    })
  })

  describe('createEmptyData', () => {
    it('creates empty data with specified dimensions', () => {
      const result = createEmptyData(2, 3)
      
      expect(result).toEqual([
        ['', '', ''],
        ['', '', '']
      ])
    })

    it('handles zero dimensions', () => {
      const result = createEmptyData(0, 0)
      
      expect(result).toEqual([])
    })
  })

  describe('cloneData', () => {
    it('creates deep copy of data', () => {
      const data = [
        ['A1', 'B1'],
        ['A2', 'B2']
      ]
      
      const result = cloneData(data)
      
      expect(result).toEqual(data)
      expect(result).not.toBe(data) // Different reference
      expect(result[0]).not.toBe(data[0]) // Different row reference
    })

    it('handles empty data', () => {
      const result = cloneData([])
      
      expect(result).toEqual([])
    })
  })
})
