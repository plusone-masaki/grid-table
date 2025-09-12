<template lang="pug">
div.grid-table(
  :style="containerStyle"
  ref="gridContainer"
)
  div.grid-table__content
    // 統合テーブル
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
      thead
        tr.grid-table__header-row
          th.grid-table__header-cell.grid-table__header-cell--row-number
          th.grid-table__empty-cell
          th.grid-table__header-cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
          ) {{ getColumnHeader(colIndex) }}
          th.grid-table__empty-cell
      tbody
        // 上側空行
        tr.grid-table__empty-row(
          :style="{ height: `${topEmptyHeight}px` }"
        )
          th.grid-table__empty-cell
          td.grid-table__empty-cell
          td.grid-table__empty-cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
          )
          td.grid-table__empty-cell
        
        // データ行
        tr.grid-table__row(
          v-for="(rowIndex, i) in visibleRowIndices"
          :key="rowIndex"
          :style="{ height: `${computedRowHeights[rowIndex] || defaultRowHeight}px` }"
        )
          th.grid-table__cell.grid-table__cell--row-number {{ rowIndex + 1 }}
          td.grid-table__empty-cell
          td.grid-table__cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
            @click="handleCellClick(rowIndex, colIndex)"
          ) {{ getCellValue(rowIndex, colIndex) }}
          td.grid-table__empty-cell
        
        // 下側空行
        tr.grid-table__empty-row(
          :style="{ height: `${bottomEmptyHeight}px` }"
        )
          th.grid-table__empty-cell
          td.grid-table__empty-cell
          td.grid-table__empty-cell(
            v-for="colIndex in visibleColIndices"
            :key="colIndex"
          )
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

// 仮想スクロール用のスタイル計算
const containerStyle = computed(() => ({
  height: `${props.viewportHeight}px`,
  width: `${props.viewportWidth}px`,
  overflow: 'auto' as const
}))

// テーブル全体の固定幅計算
const totalTableWidth = computed(() => {
  const totalColWidth = computedColWidths.value.reduce((sum, width) => sum + (width || props.defaultColWidth), 0)
  return props.rowNumberColWidth + totalColWidth
})

const tableStyle = computed(() => ({
  marginTop: `${virtualState.value.offsetTop}px`,
  width: `${totalTableWidth.value}px` // 常に一定の幅を保つ
}))

// 空列の幅計算
const leftEmptyWidth = computed(() => {
  const firstVisibleColIndex = visibleColIndices.value[0]
  if (firstVisibleColIndex === undefined || firstVisibleColIndex <= 0) return 0
  
  return computedColWidths.value
    .slice(0, firstVisibleColIndex)
    .reduce((sum, width) => sum + (width || props.defaultColWidth), 0)
})

const rightEmptyWidth = computed(() => {
  const visibleColumnsWidth = visibleColIndices.value
    .reduce((sum, colIndex) => sum + (computedColWidths.value[colIndex] || props.defaultColWidth), 0)
  
  return Math.max(0, totalTableWidth.value - props.rowNumberColWidth - leftEmptyWidth.value - visibleColumnsWidth)
})

// 空行の高さ計算
const topEmptyHeight = computed(() => {
  const firstVisibleRowIndex = visibleRowIndices.value[0]
  if (firstVisibleRowIndex === undefined || firstVisibleRowIndex <= 0) return 0
  
  return computedRowHeights.value
    .slice(0, firstVisibleRowIndex)
    .reduce((sum, height) => sum + (height || props.defaultRowHeight), 0)
})

const bottomEmptyHeight = computed(() => {
  const lastVisibleRowIndex = visibleRowIndices.value[visibleRowIndices.value.length - 1]
  if (lastVisibleRowIndex === undefined || lastVisibleRowIndex >= rowCount.value - 1) return 0
  
  return computedRowHeights.value
    .slice(lastVisibleRowIndex + 1)
    .reduce((sum, height) => sum + (height || props.defaultRowHeight), 0)
})


</script>

<style lang="sass" scoped>
.grid-table
  position: relative
  border: 1px solid #d1d5db
  font-family: 'SourceHanCode', 'Consolas', 'Monaco', 'Courier New', monospace
  outline: none
  // スムーズスクロール最適化
  overflow: auto
  scroll-behavior: smooth
  -webkit-overflow-scrolling: touch
  will-change: scroll-position
  // より滑らかなスクロールのための最適化
  scrollbar-width: thin
  overscroll-behavior: contain

.grid-table__content
  position: relative
  pointer-events: none

.grid-table__table
  pointer-events: auto
  border-collapse: separate
  border-spacing: 0
  table-layout: fixed  // col幅を確実に適用するためfixedに戻す
  // 幅は JavaScript で固定値を設定（max-content を削除）
  // GPU加速でレンダリング最適化
  transform: translateZ(0)
  backface-visibility: hidden
  will-change: auto

.grid-table__table thead
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
  font-size: 14px
  font-weight: 600
  line-height: 1.2
  margin: 0
  padding: 2px 4px
  white-space: nowrap
  overflow: hidden
  text-align: center
  vertical-align: middle
  user-select: none
  height: 24px

.grid-table__header-cell:first-child
  border-left: none

.grid-table__row-number-col
  width: 50px
  min-width: 50px

// 行番号列のsticky固定
.grid-table__header-cell--row-number,
.grid-table__cell--row-number
  position: sticky !important
  left: 0 !important
  z-index: 5
  background-color: #f8f9fa
  border-right: 1px solid #d1d5db
  
// ヘッダーの行番号セルは最上位（ヘッダーより上）
.grid-table__header-cell--row-number
  z-index: 15

// より具体的なセレクタでの強制適用
tbody th.grid-table__cell--row-number
  position: sticky !important
  left: 0 !important
  z-index: 5
  background-color: #f8f9fa !important
  font-weight: 600
  text-align: center

// 行番号セルのhover効果を無効化
tbody th.grid-table__cell--row-number:hover
  background-color: #f8f9fa !important

.grid-table__empty-col-left, .grid-table__empty-col-right
  // 幅は動的にインラインスタイルで設定されるため、CSS固定値は削除
  min-width: 0

.grid-table__empty-cell
  padding: 0
  border: none
  background: transparent
  // 空列の幅を確保するため
  min-width: inherit
  width: inherit    // col要素の幅を強制継承
  box-sizing: border-box

.grid-table__empty-row
  height: 0
  min-height: 0
  
.grid-table__empty-row .grid-table__empty-cell
  padding: 0
  border: none
  background: transparent
  height: inherit

.grid-table__table tbody
  background-color: #ffffff

// 行の高さ設定
.grid-table__row
  // 高さはインラインスタイルで指定

.grid-table__row:hover
  background-color: #f8f9fa

.grid-table__cell
  background-color: #ffffff
  border-right: 1px solid #d1d5db
  border-bottom: 1px solid #d1d5db
  box-sizing: border-box
  color: #374151
  font-size: 14px
  line-height: 1.2
  margin: 0
  padding: 2px 4px
  position: relative
  white-space: nowrap
  overflow: hidden
  transition: background-color 0.1s ease-in-out
  user-select: none
  vertical-align: top
  cursor: pointer

.grid-table__cell:first-child
  border-left: none
  text-align: right
  cursor: default

.grid-table__cell:hover
  background-color: #f8f9fa
</style>
