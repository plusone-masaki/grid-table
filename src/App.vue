<template lang="pug">
div.app
  h1 Grid Table Library
  p A Vue.js library for Excel-like data grid functionality
  
  div.demo-section
    h2 Demo
    GridTable(
      :config="gridConfig"
      @cell-click="handleCellClick"
      @cell-double-click="handleCellDoubleClick"
      @selection-change="handleSelectionChange"
      @data-change="handleDataChange"
    )
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GridTable from '@/components/GridTable.vue'
import type { GridConfig, CellPosition, SelectionRange } from '@/types/data-display-edit'

// Demo data
const gridConfig = ref<GridConfig>({
  data: [
    ['Name', 'Age', 'City'],
    ['John Doe', '30', 'New York'],
    ['Jane Smith', '25', 'Los Angeles'],
    ['Bob Johnson', '35', 'Chicago'],
    ['Alice Brown', '28', 'Houston']
  ],
  cellWidth: 120,
  cellHeight: 35,
  enableEditing: true,
  enableSelection: true,
  enableKeyboardNavigation: true
})

// Event handlers
const handleCellClick = (position: CellPosition) => {
  console.log('Cell clicked:', position)
}

const handleCellDoubleClick = (position: CellPosition) => {
  console.log('Cell double-clicked:', position)
}

const handleSelectionChange = (selection: SelectionRange | null) => {
  console.log('Selection changed:', selection)
}

const handleDataChange = (data: string[][]) => {
  console.log('Data changed:', data)
  gridConfig.value.data = data
}
</script>

<style lang="sass" scoped>
@import '@/styles/index.sass'

.app
  padding: 20px
  max-width: 1200px
  margin: 0 auto

.demo-section
  margin-top: 30px
  
  h2
    margin-bottom: 15px
    color: $primary-color
</style>
