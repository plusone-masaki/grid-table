<template lang="pug">
div.cell-selection(
  v-if="visible && !isSingleCell"
  :style="selectionStyle"
)
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'

interface Props {
  visible: boolean
  isSingleCell: boolean
  position: {
    top: number
    left: number
    width: number
    height: number
  }
}

const props = defineProps<Props>()

const selectionStyle = computed(() => ({
  position: 'absolute',
  top: `${props.position.top - 1}px`,
  left: `${props.position.left}px`,
  width: `${props.position.width}px`,
  height: `${props.position.height + 1}px`,
  pointerEvents: 'none',
  zIndex: 1
}))
</script>

<style lang="sass" scoped>
.cell-selection
  background-color: rgba(59, 130, 246, 0.1)
  border: 1px solid #3b82f6
  box-sizing: border-box
  outline: none
</style>
