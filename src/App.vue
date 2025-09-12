<template lang="pug">
div.app
  h1 Grid Table Library
  p A Vue.js library for Excel-like data grid functionality
  
  div.demo-section
    h2 Demo
    div.dataset-controls
      h3 データセット
      div.button-group
        button(
          :class="{ active: datasetType === 'small' }"
          @click="switchToSmallDataset"
        ) 小データセット (6行×5列)
        button(
          :class="{ active: datasetType === 'large' }"
          @click="switchToLargeDataset"
        ) 大データセット (1000行×100列)
    
    div.header-mode-controls
      h3 Header Mode
      div.button-group
        button(
          v-for="mode in headerModes"
          :key="mode.value"
          :class="{ active: currentHeaderMode === mode.value }"
          @click="currentHeaderMode = mode.value"
        ) {{ mode.label }}
    
    div.data-info
      p 現在のデータ: {{ gridData.length }}行 × {{ gridData[0]?.length || 0 }}列
    
    div.grid-table-container
      GridTable(
        v-model:data="gridData"
        :default-col-width="100"
        :default-row-height="24"
        :header-mode="currentHeaderMode"
        :viewport-height="600"
        :viewport-width="1000"
        :row-heights="rowHeights"
        :col-widths="colWidths"
      )
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GridTable from '@/components/GridTable.vue'
import type { HeaderMode } from '@/types/header-modes'
import { generateLargeDataset, generateTestRowHeights, generateTestColWidths } from '@/utils'

// Demo data (Excel-like)
const smallGridData: string[][] = [
  ['Name', 'Age', 'City', 'Country', 'Email'],
  ['John Doe', '30', 'Tokyo', 'Japan', 'john@example.com'],
  ['Jane Smith', '25', 'New York', 'USA', 'jane@example.com'],
  ['Bob Johnson', '35', 'London', 'UK', 'bob@example.com'],
  ['Alice Brown', '28', 'Paris', 'France', 'alice@example.com'],
  ['Charlie Wilson', '32', 'Sydney', 'Australia', 'charlie@example.com']
]

// 現在表示中のデータ
const gridData = ref<string[][]>(smallGridData)

// データセットの種類
const datasetType = ref<'small' | 'large'>('small')

// サイズ配列（初期化時に小データセットのサイズを生成）
const rowHeights = ref<number[]>(generateTestRowHeights(smallGridData.length))
const colWidths = ref<number[]>(generateTestColWidths(smallGridData[0]?.length || 0))

// データセット切り替え関数
const switchToSmallDataset = () => {
  gridData.value = smallGridData
  datasetType.value = 'small'
  // 小データセットでもサイズを生成
  rowHeights.value = generateTestRowHeights(smallGridData.length)
  colWidths.value = generateTestColWidths(smallGridData[0]?.length || 0)
}

const switchToLargeDataset = () => {
  console.log('大量データセットを生成中...')
  const startTime = performance.now()
  gridData.value = generateLargeDataset()
  
  // サイズ配列も生成
  rowHeights.value = generateTestRowHeights(1000)
  colWidths.value = generateTestColWidths(100)
  
  const endTime = performance.now()
  console.log(`大量データセット生成完了: ${endTime - startTime}ms`)
  datasetType.value = 'large'
}

// ヘッダーモードの設定
const headerModes = [
  { value: 'alphabetic' as HeaderMode, label: 'Alphabetic (A, B, C...)' },
  { value: 'numeric' as HeaderMode, label: 'Numeric (1, 2, 3...)' },
  { value: 'array' as HeaderMode, label: 'Array (Data Headers)' }
]

const currentHeaderMode = ref<HeaderMode>('alphabetic')
</script>

<style lang="sass" scoped>
.app
  padding: 20px
  max-width: 1200px
  margin: 0 auto
  font-family: 'SourceHanCode', 'Consolas', 'Monaco', 'Courier New', monospace

.demo-section
  margin-top: 30px
  
  h1
    font-size: 24px
    color: #323130
    margin-bottom: 10px
  
  p
    font-size: 14px
    color: #605e5c
    margin-bottom: 20px
  
  h2
    margin-bottom: 15px
    color: #0078d4
    font-size: 18px
  
  .dataset-controls, .header-mode-controls
    margin-bottom: 20px
    
    h3
      margin-bottom: 10px
      color: #323130
      font-size: 16px
    
    .button-group
      display: flex
      gap: 8px
      flex-wrap: wrap
      
      button
        padding: 8px 16px
        border: 1px solid #d1d5db
        border-radius: 4px
        background-color: #ffffff
        color: #374151
        font-size: 14px
        cursor: pointer
        transition: all 0.2s ease
        
        &:hover
          background-color: #f3f4f6
          border-color: #9ca3af
        
        &.active
          background-color: #0078d4
          color: #ffffff
          border-color: #0078d4
          
          &:hover
            background-color: #106ebe
  
  .data-info
    margin-bottom: 15px
    
    p
      font-size: 14px
      color: #0078d4
      font-weight: 600
      margin: 0
      
    .performance-warning
      color: #d97706
      font-weight: 700
      background-color: #fef3c7
      padding: 8px 12px
      border-radius: 4px
      border-left: 4px solid #d97706
      margin-top: 8px

  .grid-table-container
    display: inline-block
    border: 1px solid #e5e7eb
    border-radius: 4px
    padding: 8px
    background-color: #f9fafb
</style>

