/**
 * GridTable component tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GridTable from '@/components/GridTable.vue'
import type { GridConfig } from '@/types/data-display-edit'

describe('GridTable', () => {
  let defaultConfig: GridConfig

  beforeEach(() => {
    defaultConfig = {
      data: [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2'],
        ['A3', 'B3', 'C3']
      ],
      cellWidth: 100,
      cellHeight: 30,
      enableEditing: true,
      enableSelection: true,
      enableKeyboardNavigation: true
    }
  })

  it('renders grid with correct number of rows and columns', () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const rows = wrapper.findAll('.grid-table__row')
    const cells = wrapper.findAll('.grid-table__cell')
    
    expect(rows).toHaveLength(3) // 3 rows
    expect(cells).toHaveLength(9) // 3 rows × 3 columns
  })

  it('renders header with correct number of columns', () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const headerCells = wrapper.findAll('.grid-table__header-cell')
    expect(headerCells).toHaveLength(3) // 3 columns
  })

  it('displays cell values correctly', () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const cells = wrapper.findAll('.grid-table__cell')
    expect(cells[0].text()).toBe('A1')
    expect(cells[1].text()).toBe('B1')
    expect(cells[2].text()).toBe('C1')
  })

  it('emits cell-click event when cell is clicked', async () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const firstCell = wrapper.find('.grid-table__cell')
    await firstCell.trigger('click')

    expect(wrapper.emitted('cell-click')).toBeTruthy()
    expect(wrapper.emitted('cell-click')?.[0]).toEqual([{ row: 0, col: 0 }])
  })

  it('emits cell-double-click event when cell is double-clicked', async () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const firstCell = wrapper.find('.grid-table__cell')
    await firstCell.trigger('dblclick')

    expect(wrapper.emitted('cell-double-click')).toBeTruthy()
    expect(wrapper.emitted('cell-double-click')?.[0]).toEqual([{ row: 0, col: 0 }])
  })

  it('enters edit mode on double-click when editing is enabled', async () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const firstCell = wrapper.find('.grid-table__cell')
    await firstCell.trigger('dblclick')

    const editInput = wrapper.find('.grid-table__cell-input')
    expect(editInput.exists()).toBe(true)
  })

  it('does not enter edit mode when editing is disabled', async () => {
    const configWithoutEditing = {
      ...defaultConfig,
      enableEditing: false
    }

    const wrapper = mount(GridTable, {
      props: { config: configWithoutEditing }
    })

    const firstCell = wrapper.find('.grid-table__cell')
    await firstCell.trigger('dblclick')

    const editInput = wrapper.find('.grid-table__cell-input')
    expect(editInput.exists()).toBe(false)
  })

  it('applies correct cell styles', () => {
    const wrapper = mount(GridTable, {
      props: { config: defaultConfig }
    })

    const firstCell = wrapper.find('.grid-table__cell')
    const style = firstCell.attributes('style')
    
    expect(style).toContain('width: 100px')
    expect(style).toContain('height: 30px')
  })

  it('handles empty data correctly', () => {
    const emptyConfig = {
      ...defaultConfig,
      data: []
    }

    const wrapper = mount(GridTable, {
      props: { config: emptyConfig }
    })

    // Should render at least one empty cell
    const cells = wrapper.findAll('.grid-table__cell')
    expect(cells.length).toBeGreaterThan(0)
  })
})
