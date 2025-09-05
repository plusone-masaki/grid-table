<template lang="pug">
div.grid-table(
  ref="gridContainer"
  @scroll="handleScroll"
  @mousedown="handleMouseDown"
  @mousemove="handleMouseMove"
  @mouseup="handleMouseUp"
  @keydown="handleKeyDown"
)
  div.grid-table__header
    div.grid-table__header-row
      div.grid-table__header-cell(
        v-for="(header, colIndex) in columnHeaders"
        :key="colIndex"
        :style="getHeaderCellStyle(colIndex)"
      ) {{ header }}
  
  div.grid-table__body
    div.grid-table__row(
      v-for="(row, rowIndex) in visibleRows"
      :key="rowIndex"
      :style="getRowStyle(rowIndex)"
    )
      div.grid-table__cell(
        v-for="(cell, colIndex) in row"
        :key="colIndex"
        :class="getCellClass(rowIndex, colIndex)"
        :style="getCellStyle(rowIndex, colIndex)"
        @click="handleCellClick(rowIndex, colIndex)"
        @dblclick="handleCellDoubleClick(rowIndex, colIndex)"
      )
        input.grid-table__cell-input(
          v-if="isEditingCell(rowIndex, colIndex)"
          v-model="editValue"
          @blur="handleEditBlur"
          @keydown="handleEditKeyDown"
          ref="editInput"
        )
        template(v-else) {{ cell }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { GridConfig, CellPosition, SelectionRange } from '@/types/data-display-edit'
import { useGridState } from '@/composables/useGridState'
import { calculateViewportBounds, isCellVisible } from '@/utils/renderingUtils'

interface Props {
  config: GridConfig
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({
    data: [['']],
    cellWidth: 100,
    cellHeight: 30,
    enableEditing: true,
    enableSelection: true,
    enableKeyboardNavigation: true
  })
})

// Emits
const emit = defineEmits<{
  'cell-click': [position: CellPosition]
  'cell-double-click': [position: CellPosition]
  'selection-change': [selection: SelectionRange | null]
  'data-change': [data: string[][]]
}>()

// Refs
const gridContainer = ref<HTMLElement>()
const editInput = ref<HTMLInputElement>()

// Grid state
const {
  state,
  isEditing,
  hasSelection,
  selectedCellsCount,
  updateData,
  setSelection,
  startEditing,
  stopEditing,
  updateEditValue,
  setCellValue,
  getCellValue,
  clearSelection
} = useGridState(props.config.data)

// Computed properties
const columnHeaders = computed(() => {
  return Array.from({ length: state.dimensions.cols }, (_, i) => String(i + 1))
})

const visibleRows = computed(() => {
  // For now, show all rows. Virtualization will be implemented later
  return state.data
})

const editValue = computed({
  get: () => state.editValue,
  set: (value: string) => updateEditValue(value)
})

// Methods
const getHeaderCellStyle = (colIndex: number) => {
  return {
    width: `${props.config.cellWidth}px`,
    height: `${props.config.cellHeight}px`
  }
}

const getRowStyle = (rowIndex: number) => {
  return {
    height: `${props.config.cellHeight}px`
  }
}

const getCellStyle = (rowIndex: number, colIndex: number) => {
  return {
    width: `${props.config.cellWidth}px`,
    height: `${props.config.cellHeight}px`
  }
}

const getCellClass = (rowIndex: number, colIndex: number) => {
  const classes = []
  
  if (isEditingCell(rowIndex, colIndex)) {
    classes.push('grid-table__cell--editing')
  }
  
  if (isSelectedCell(rowIndex, colIndex)) {
    classes.push('grid-table__cell--selected')
  }
  
  return classes
}

const isEditingCell = (rowIndex: number, colIndex: number): boolean => {
  return state.editingCell?.row === rowIndex && state.editingCell?.col === colIndex
}

const isSelectedCell = (rowIndex: number, colIndex: number): boolean => {
  if (!state.selection) return false
  
  const position: CellPosition = { row: rowIndex, col: colIndex }
  return isPositionInSelection(position, state.selection)
}

const isPositionInSelection = (position: CellPosition, selection: SelectionRange): boolean => {
  return (
    position.row >= selection.start.row &&
    position.row <= selection.end.row &&
    position.col >= selection.start.col &&
    position.col <= selection.end.col
  )
}

// Event handlers
const handleCellClick = (rowIndex: number, colIndex: number) => {
  const position: CellPosition = { row: rowIndex, col: colIndex }
  
  if (props.config.enableSelection) {
    setSelection({
      start: position,
      end: position
    })
    emit('selection-change', state.selection)
  }
  
  emit('cell-click', position)
}

const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
  const position: CellPosition = { row: rowIndex, col: colIndex }
  
  if (props.config.enableEditing) {
    const currentValue = getCellValue(position)
    startEditing(position, currentValue)
  }
  
  emit('cell-double-click', position)
}

const handleEditBlur = () => {
  if (state.editingCell) {
    setCellValue(state.editingCell, state.editValue)
    stopEditing()
    emit('data-change', state.data.map(row => [...row]))
  }
}

const handleEditKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleEditBlur()
  } else if (event.key === 'Escape') {
    stopEditing()
  }
}

const handleScroll = (event: Event) => {
  // Scroll handling will be implemented for virtualization
}

const handleMouseDown = (event: MouseEvent) => {
  // Mouse selection handling will be implemented
}

const handleMouseMove = (event: MouseEvent) => {
  // Mouse selection handling will be implemented
}

const handleMouseUp = (event: MouseEvent) => {
  // Mouse selection handling will be implemented
}

const handleKeyDown = (event: KeyboardEvent) => {
  // Keyboard navigation will be implemented
}

// Lifecycle
onMounted(() => {
  // Focus management will be implemented
})
</script>

<style lang="sass" scoped>
@import '@/styles/index.sass'
</style>
