/**
 * GridTable component tests
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GridTable from '@/components/GridTable.vue'

describe('GridTable', () => {
  const defaultData = [
    ['A1', 'B1', 'C1'],
    ['A2', 'B2', 'C2'],
    ['A3', 'B3', 'C3']
  ]

  const defaultProps = {
    data: defaultData,
    defaultRowHeight: 30,
    defaultColWidth: 100
  }

  it('renders grid with correct number of rows and columns', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const rows = wrapper.findAll('.grid-table__row')
    const cells = wrapper.findAll('.grid-table__cell')
    
    expect(rows).toHaveLength(3) // 3 rows
    expect(cells).toHaveLength(12) // 3 rows × (1 row number + 3 data columns)
  })

  it('renders header with correct number of columns', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const headerCells = wrapper.findAll('.grid-table__header-cell')
    expect(headerCells).toHaveLength(4) // 1 row number + 3 data columns
  })

  it('displays cell values correctly', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const cells = wrapper.findAll('.grid-table__cell')
    expect(cells[0].text()).toBe('1') // Row number
    expect(cells[1].text()).toBe('A1') // Data cell
    expect(cells[2].text()).toBe('B1') // Data cell
    expect(cells[3].text()).toBe('C1') // Data cell
  })

  it('generates correct column headers (A, B, C)', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const headerCells = wrapper.findAll('.grid-table__header-cell')
    expect(headerCells[0].text()).toBe('') // Row number header (empty)
    expect(headerCells[1].text()).toBe('A')
    expect(headerCells[2].text()).toBe('B')
    expect(headerCells[3].text()).toBe('C')
  })

  it('displays row numbers correctly', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const cells = wrapper.findAll('.grid-table__cell')
    expect(cells[0].text()).toBe('1') // First cell is row number
    expect(cells[4].text()).toBe('2') // Second row first cell
    expect(cells[8].text()).toBe('3') // Third row first cell
  })

  it('applies correct row styles', () => {
    const wrapper = mount(GridTable, {
      props: defaultProps
    })

    const firstRow = wrapper.find('.grid-table__row')
    const style = firstRow.attributes('style')
    
    expect(style).toContain('height: 30px')
  })

  it('handles empty data correctly', () => {
    const emptyProps = {
      ...defaultProps,
      data: []
    }

    const wrapper = mount(GridTable, {
      props: emptyProps
    })

    // Should render at least one empty row with row number
    const cells = wrapper.findAll('.grid-table__cell')
    expect(cells.length).toBeGreaterThan(0)
  })
})
