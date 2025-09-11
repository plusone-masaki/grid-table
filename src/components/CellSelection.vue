<template lang="pug">
div.cell-selection(
  :style="selectionStyle"
)
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'

interface Props {
  range: {
    start: { row: number; col: number }
    end: { row: number; col: number }
  } | null
  position: {
    top: number
    left: number
    width: number
    height: number
  }
}

const props = defineProps<Props>()

const selectionStyle = computed(() => ({
  top: `${props.position.top - 1}px`,
  left: `${props.position.left}px`,
  width: `${props.position.width}px`,
  height: `${props.position.height + 1}px`
}))
</script>

<style lang="sass" scoped>
.cell-selection
  position: absolute
  background-color: rgba(59, 130, 246, 0.1)
  border: 1px solid #3b82f6
  box-sizing: border-box
  outline: none
  pointer-events: none
  z-index: 50
</style>
