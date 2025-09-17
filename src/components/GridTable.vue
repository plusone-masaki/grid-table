<template lang="pug">
div.grid-table(
  :style="containerStyle"
  ref="gridContainer"
)
  div.grid-table__content
    // ヘッダーテーブル（上側固定）- 最初に描画
    table.grid-table__headers(
      :style="headersTableStyle"
    )
      colgroup
        col.grid-table__row-number-col
        col.grid-table__empty-col-left(:style="{ width: `${leftEmptyWidth}px` }")
        col(
          v-for="colIndex in visibleColIndices"
          :key="colIndex"
          :style="{ width: `${computedColWidths[colIndex] || defaultColWidth}px` }"
        )
        col.grid-table__empty-col-right(:style="{ width: `${rightEmptyWidth}px` }")
      
      thead.grid-table__thead
        tr.grid-table__header-row
          th.grid-table__header-cell.grid-table__header-cell.--row-number
          th.grid-table__empty-cell
          th.grid-table__header-cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
          ) {{ getColumnHeader(colIndex) }}
          th.grid-table__empty-cell
    
    // 行番号テーブル（左側固定）- 2番目に描画
    table.grid-table__row-numbers(
      :style="rowNumbersTableStyle"
    )
      colgroup
        col.grid-table__row-number-col
      
      thead.grid-table__thead
        tr.grid-table__header-row
          th.grid-table__header-cell.grid-table__header-cell.--row-number
      
      tbody.grid-table__tbody
        tr.grid-table__row(
          v-for="rowIndex in visibleRowIndices"
          :key="rowIndex"
          :style="{ height: `${computedRowHeights[rowIndex] || defaultRowHeight}px` }"
        )
          th.grid-table__cell.grid-table__cell.--row-number {{ rowIndex + 1 }}
    
    // メインデータテーブル（完全なテーブル構造）- 最後に描画
    table.grid-table__table(
      :style="tableStyle"
    )
      colgroup
        col.grid-table__row-number-col
        col.grid-table__empty-col-left(:style="{ width: `${leftEmptyWidth}px` }")
        col(
          v-for="colIndex in visibleColIndices"
          :key="colIndex"
          :style="{ width: `${computedColWidths[colIndex] || defaultColWidth}px` }"
        )
        col.grid-table__empty-col-right(:style="{ width: `${rightEmptyWidth}px` }")
      
      thead.grid-table__thead
        tr.grid-table__header-row
          th.grid-table__header-cell.grid-table__header-cell.--row-number
          th.grid-table__empty-cell
          th.grid-table__header-cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
          ) {{ getColumnHeader(colIndex) }}
          th.grid-table__empty-cell
      
      tbody.grid-table__tbody
        // データ行
        tr.grid-table__row(
          v-for="(rowIndex, i) in visibleRowIndices"
          :key="rowIndex"
          :style="{ height: `${computedRowHeights[rowIndex] || defaultRowHeight}px` }"
        )
          th.grid-table__cell.grid-table__cell.--row-number {{ rowIndex + 1 }}
          td.grid-table__empty-cell
          td.grid-table__cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
            @click="handleCellClick(rowIndex, colIndex)"
          ) {{ getCellValue(rowIndex, colIndex) }}
          td.grid-table__empty-cell

  // 選択範囲表示（複数セル選択時）
  CellSelection(
    v-if="selectedRange"
    :range="selectedRange"
    :position="selectionRangePosition"
  )
  
  // アクティブセル表示（編集対象セル）
  ActiveCell(
    v-if="activeCell"
    :editing="mode === 'editing'"
    :editing-value="editingValue"
    :position="activeCellPosition"
    @update:editing-value="editingValue = $event"
    @edit:end="finishEditing"
    @edit:cancel="cancelEditing"
    @move:cell="handleMoveCell"
  )
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import type { HeaderMode } from '@/types/header-modes'
import { useDataDisplay } from '@/composables/useDataDisplay'
import { useCellSelection } from '@/composables/useCellSelection'
import { useGridEvents } from '@/composables/useGridEvents'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import CellSelection from './CellSelection.vue'
import ActiveCell from './ActiveCell.vue'

interface Props {
  defaultColWidth?: number
  defaultRowHeight?: number
  rowNumberColWidth?: number  // 行番号列の幅
  headerMode?: HeaderMode
  viewportHeight?: number
  viewportWidth?: number
  rowHeights?: number[]  // 各行の高さを指定する配列（省略時はdefaultRowHeightを使用）
  colWidths?: number[]   // 各列の幅を指定する配列（省略時はdefaultColWidthを使用）
}

const props = withDefaults(defineProps<Props>(), {
  defaultColWidth: 100,
  defaultRowHeight: 24,
  rowNumberColWidth: 50,
  headerMode: 'alphabetic',
  viewportHeight: 600,
  viewportWidth: 1000
})

// データを双方向バインディングで定義
const data = defineModel<string[][]>('data', { default: () => [['']] })

// データ表示機能
const {
  columnCount,
  columnHeaders,
  displayData
} = useDataDisplay(data, toRef(props, 'headerMode'))

// 行数計算
const rowCount = computed(() => displayData.value.length)

// 動的なサイズ配列を計算
const computedRowHeights = computed(() => {
  if (props.rowHeights && props.rowHeights.length >= rowCount.value) {
    return props.rowHeights.slice(0, rowCount.value)
  }
  // デフォルトの高さで埋める
  return Array(rowCount.value).fill(props.defaultRowHeight)
})

const computedColWidths = computed(() => {
  if (props.colWidths && props.colWidths.length >= columnCount.value) {
    return props.colWidths.slice(0, columnCount.value)
  }
  // デフォルトの幅で埋める
  return Array(columnCount.value).fill(props.defaultColWidth)
})

// テーブル要素の参照
const gridContainer = ref<HTMLTableElement>()

// 仮想スクロール機能
const {
  virtualState,
  visibleRowIndices,
  visibleColIndices,
  containerStyle,
  totalTableWidth,
  headersTableStyle,
  rowNumbersTableStyle,
  tableStyle,
  leftEmptyWidth,
  rightEmptyWidth,
  scrollToCell,
  ensureCellVisible,
  getCellPosition
} = useVirtualScroll({
  containerRef: gridContainer as any,
  totalRows: rowCount,
  totalCols: columnCount,
  rowHeights: computedRowHeights,
  colWidths: computedColWidths,
  viewportHeight: props.viewportHeight,
  viewportWidth: props.viewportWidth,
  rowNumberColWidth: props.rowNumberColWidth
})

// 統一イベントシステム
const eventSystem = useGridEvents(gridContainer)

// セル選択・編集機能
const {
  mode,
  activeCell,
  selectedRange,
  editingValue,
  activeCellPosition,
  selectionRangePosition,
  finishEditing,
  cancelEditing,
  handleMoveCell,
  selectCell
} = useCellSelection({
  columnCount,
  rowCount,
  gridContainer,
  eventSystem,
  data,
  getCellPosition,
  ensureCellVisible,
  rowNumberColWidth: props.rowNumberColWidth
})

// セルクリックハンドラー
const handleCellClick = (rowIndex: number, colIndex: number) => {
  selectCell({ row: rowIndex, col: colIndex })
}

// 仮想スクロール用のヘルパー関数
const getColumnHeader = (colIndex: number) => {
  return columnHeaders.value[colIndex] || `Col ${colIndex + 1}`
}

const getCellValue = (rowIndex: number, colIndex: number) => {
  return displayData.value[rowIndex]?.[colIndex] || ''
}
</script>

<style lang="sass" scoped>
.grid-table
  border: 1px solid #d1d5db
  font-family: 'SourceHanCode', 'Consolas', 'Monaco', 'Courier New', monospace
  outline: none
  overflow: auto
  overscroll-behavior: contain
  position: relative
  scroll-behavior: smooth
  scrollbar-width: thin
  will-change: scroll-position
  -webkit-overflow-scrolling: touch

.grid-table__content
  height: 100%
  pointer-events: none
  position: relative
  width: 100%

.grid-table__row-numbers,
.grid-table__headers,
.grid-table__table
  backface-visibility: hidden
  border-collapse: separate
  border-spacing: 0
  pointer-events: auto
  table-layout: fixed
  transform: translateZ(0)
  will-change: auto

.grid-table__headers
  left: 0
  position: absolute
  top: 0
  z-index: 20

.grid-table__row-numbers
  left: 0
  position: absolute
  top: 0
  z-index: 15

.grid-table__table
  left: 0
  position: absolute
  top: 0
  z-index: 5

// Table header styles
.grid-table__thead
  background-color: #f8f9fa
  position: sticky
  top: 0
  z-index: 10

.grid-table__header-cell
  background-color: #f8f9fa
  border-bottom: 1px solid #d1d5db
  border-right: 1px solid #d1d5db
  box-sizing: border-box
  color: #374151
  font-size: 14px
  font-weight: 600
  height: 24px
  line-height: 1.2
  margin: 0
  overflow: hidden
  padding: 2px 4px
  text-align: center
  user-select: none
  vertical-align: middle
  white-space: nowrap

.grid-table__header-cell:first-child
  border-left: none

.grid-table__row-number-col
  min-width: 50px
  width: 50px

// Row number column sticky positioning
.grid-table__header-cell.--row-number,
.grid-table__cell.--row-number
  background-color: #f8f9fa
  border-right: 1px solid #d1d5db
  font-weight: 600
  left: 0 !important
  position: sticky !important
  text-align: center
  z-index: 5

// Header row number cell on top (above header)
.grid-table__header-cell.--row-number
  z-index: 15

.grid-table__empty-col-left, 
.grid-table__empty-col-right
  min-width: 0

.grid-table__empty-cell
  background: transparent
  border: none
  box-sizing: border-box
  min-width: inherit
  padding: 0
  width: inherit

.grid-table__tbody
  background-color: #ffffff

.grid-table__row:hover
  background-color: #f8f9fa

.grid-table__cell
  background-color: #ffffff
  border-bottom: 1px solid #d1d5db
  border-right: 1px solid #d1d5db
  box-sizing: border-box
  color: #374151
  cursor: pointer
  font-size: 14px
  line-height: 1.2
  margin: 0
  overflow: hidden
  padding: 2px 4px
  position: relative
  transition: background-color 0.1s ease-in-out
  user-select: none
  vertical-align: top
  white-space: nowrap

.grid-table__cell:first-child
  border-left: none
  cursor: default
  text-align: right

.grid-table__cell:hover
  background-color: #f8f9fa
</style>
