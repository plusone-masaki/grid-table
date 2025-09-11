<template lang="pug">
div.app
  h1 Grid Table Library
  p A Vue.js library for Excel-like data grid functionality
  
  div.demo-section
    h2 Demo
    div.header-mode-controls
      h3 Header Mode
      div.button-group
        button(
          v-for="mode in headerModes"
          :key="mode.value"
          :class="{ active: currentHeaderMode === mode.value }"
          @click="currentHeaderMode = mode.value"
        ) {{ mode.label }}
    
    div.grid-table-container
      GridTable(
        v-model:data="gridData"
        :default-col-width="100"
        :header-mode="currentHeaderMode"
      )
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GridTable from '@/components/GridTable.vue'
import type { HeaderMode } from '@/types/header-modes'

// Demo data (Excel-like)
const gridData = ref<string[][]>([
  ['Name', 'Age', 'City', 'Country', 'Email'],
  ['John Doe', '30', 'Tokyo', 'Japan', 'john@example.com'],
  ['Jane Smith', '25', 'New York', 'USA', 'jane@example.com'],
  ['Bob Johnson', '35', 'London', 'UK', 'bob@example.com'],
  ['Alice Brown', '28', 'Paris', 'France', 'alice@example.com'],
  ['Charlie Wilson', '32', 'Sydney', 'Australia', 'charlie@example.com']
])

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
  
  .header-mode-controls
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

  .grid-table-container
    display: inline-block
    border: 1px solid #e5e7eb
    border-radius: 4px
    padding: 8px
    background-color: #f9fafb
</style>
