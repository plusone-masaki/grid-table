<template lang="pug">
div.grid-table-wrapper(relative)
  table.grid-table(
    ref="gridContainer"
    tabindex="0"
  )
    colgroup
      col.grid-table__row-number-col
      col(
        v-for="(_, colIndex) in columnCount"
        :key="colIndex"
        :style="{ width: `${defaultColWidth}px` }"
      )
    thead.grid-table__header
      tr.grid-table__header-row
        th.grid-table__header-cell
        th.grid-table__header-cell(
          v-for="(header, colIndex) in columnHeaders"
          :key="colIndex"
        ) {{ header }}
    
    tbody.grid-table__body
      tr.grid-table__row(
        v-for="(row, rowIndex) in displayData"
        :key="rowIndex"
        :style="{ height: `${defaultRowHeight}px` }"
      )
        td.grid-table__cell {{ rowIndex + 1 }}
        td.grid-table__cell(
          v-for="(cell, colIndex) in row"
          :key="colIndex"
        ) {{ cell }}
  
  CellSelection(
    :visible="isVisible"
    :editing="isEditing"
    :editing-value="editingValue"
    :position="selectionPosition"
    @update:editing-value="editingValue = $event"
    @finish-editing="finishEditing"
    @cancel-editing="cancelEditing"
  )
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HeaderMode } from '@/types/header-modes'
import { useDataDisplay } from '@/composables/useDataDisplay'
import { useCellSelection } from '@/composables/useCellSelection'
import { useGridEvents } from '@/composables/useGridEvents'
import CellSelection from './CellSelection.vue'

interface Props {
  data: string[][]
  defaultRowHeight?: number
  defaultColWidth?: number
  headerMode?: HeaderMode
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [['']],
  defaultRowHeight: 24,
  defaultColWidth: 100,
  headerMode: 'alphabetic'
})

// データをリアクティブにする
const data = ref(props.data)

// データ表示機能
const {
  columnCount,
  columnHeaders,
  displayData
} = useDataDisplay({
  data,
  headerMode: props.headerMode
})

// 行数計算
const rowCount = computed(() => displayData.value.length)

// テーブル要素の参照
const gridContainer = ref<HTMLTableElement>()

// 統一イベントシステム
const eventSystem = useGridEvents(gridContainer)

// セル選択・編集機能（統合）
const {
  selectedCell,
  isVisible,
  isEditing,
  editingValue,
  selectionPosition,
  hasSelection,
  selectCell,
  clearSelection,
  isCellSelected,
  startEditing,
  finishEditing,
  cancelEditing
} = useCellSelection({
  columnCount,
  rowCount,
  gridContainer,
  eventSystem,
  data
})

</script>

<style lang="sass" scoped>
.grid-table-wrapper
  position: relative

.grid-table
  background-color: #ffffff
  border-left: 1px solid #d1d5db
  border-top: 1px solid #d1d5db
  border-collapse: separate
  border-spacing: 0
  font-family: 'SourceHanCode', 'Consolas', 'Monaco', 'Courier New', monospace
  position: relative
  table-layout: fixed
  width: fit-content

.grid-table__header
  background-color: #f8f9fa
  position: sticky
  top: 0
  z-index: 10

.grid-table__header-cell
  background-color: #f8f9fa
  border-right: 1px solid #d1d5db
  border-bottom: 1px solid #d1d5db
  box-sizing: border-box
  color: #374151
  font-size: 16px
  font-weight: 600
  line-height: 1.2
  margin: 0
  padding: 2px 4px
  text-align: center
  vertical-align: middle
  user-select: none

.grid-table__header-cell:first-child
  border-left: none

.grid-table__header .grid-table__header-cell
  border-top: none

.grid-table__row-number-col
  width: auto
  min-width: 2em

.grid-table__body
  background-color: #ffffff
  position: relative


.grid-table__row:hover
  background-color: #f8f9fa

.grid-table__cell
  background-color: #ffffff
  border-right: 1px solid #d1d5db
  border-bottom: 1px solid #d1d5db
  box-sizing: border-box
  color: #374151
  font-size: 16px
  line-height: 1.2
  margin: 0
  overflow: hidden
  padding: 0 4px
  position: relative
  text-overflow: ellipsis
  transition: background-color 0.1s ease-in-out
  user-select: none
  vertical-align: middle
  white-space: nowrap

.grid-table__cell:first-child
  background-color: #f8f9fa
  border-left: none
  text-align: right

.grid-table__row:first-child .grid-table__cell
  border-top: none


.grid-table__cell:hover
  background-color: #f8f9fa
</style>