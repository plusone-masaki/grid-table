<template lang="pug">
table.grid-table(
  ref="gridContainer"
  tabindex="0"
)
  colgroup
    col.grid-table__row-number-col(
      :style="{ width: '40px' }"
    )
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
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: string[][]
  defaultRowHeight?: number
  defaultColWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [['']],
  defaultRowHeight: 24,
  defaultColWidth: 100
})

// 列数とヘッダーの計算
const columnCount = computed(() => {
  if (props.data.length === 0) return 1
  return props.data[0].length
})

const columnHeaders = computed(() => {
  const headers: string[] = []
  for (let i = 0; i < columnCount.value; i++) {
    // A, B, C, D, E... の形式でヘッダーを生成
    let result = ''
    let num = i
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result
      num = Math.floor(num / 26) - 1
    }
    headers.push(result)
  }
  return headers
})

// 表示用データ（空の場合は空の行を1つ表示）
const displayData = computed(() => {
  if (props.data.length === 0) {
    return [Array(columnCount.value).fill('')]
  }
  return props.data
})
</script>

<style lang="sass" scoped>
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
  vertical-align: middle
  white-space: nowrap

.grid-table__cell:first-child
  background-color: #f8f9fa
  border-left: none

.grid-table__row:first-child .grid-table__cell
  border-top: none


.grid-table__cell:hover
  background-color: #f8f9fa

</style>