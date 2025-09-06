<template lang="pug">
div.app
  h1 Grid Table Library
  p A Vue.js library for Excel-like data grid functionality
  
  div.demo-section
    h2 Demo
    div.grid-table-container
      GridTable(
        :data="gridData"
        :default-row-height="24"
        :default-col-width="100"
      )
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GridTable from '@/components/GridTable.vue'

// Demo data (Excel-like)
const gridData = ref<string[][]>([
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
  ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30'],
  ['31', '32', '33', '34', '35', '36', '37', '38', '39', '40'],
  ['41', '42', '43', '44', '45', '46', '47', '48', '49', '50'],
  ['51', '52', '53', '54', '55', '56', '57', '58', '59', '60'],
  ['61', '62', '63', '64', '65', '66', '67', '68', '69', '70'],
  ['71', '72', '73', '74', '75', '76', '77', '78', '79', '80'],
  ['81', '82', '83', '84', '85', '86', '87', '88', '89', '90'],
  ['91', '92', '93', '94', '95', '96', '97', '98', '99', '100']
])
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
  
  .grid-table-container
    display: inline-block
    border: 1px solid #e5e7eb
    border-radius: 4px
    padding: 8px
    background-color: #f9fafb
</style>
