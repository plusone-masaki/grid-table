<template lang="pug">
div.cell-selection(
  v-if="visible"
  :style="selectionStyle"
)
  textarea.cell-selection__textarea(
    v-if="editing"
    v-model="editingValue"
    @blur="finishEditing"
    @keydown.enter.exact="finishEditing"
    @keydown.escape="cancelEditing"
    ref="textareaRef"
  )
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'

interface Props {
  visible: boolean
  editing: boolean
  editingValue: string
  position: {
    top: number
    left: number
    width: number
    height: number
  }
}

interface Emits {
  (e: 'update:editingValue', value: string): void
  (e: 'finishEditing'): void
  (e: 'cancelEditing'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Textarea要素の参照
const textareaRef = ref<HTMLTextAreaElement>()

// 編集値の更新
const editingValue = computed({
  get: () => props.editingValue,
  set: (value) => emit('update:editingValue', value)
})

// 編集終了
const finishEditing = () => {
  emit('finishEditing')
}

// 編集キャンセル
const cancelEditing = () => {
  emit('cancelEditing')
}

// 編集開始時にフォーカス設定
watch(() => props.editing, async (editing) => {
  if (editing) {
    await nextTick()
    // わずかな遅延でDOM更新を確実に待つ
    setTimeout(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
        // カーソルを末尾に配置（全選択しない）
        const length = textareaRef.value.value.length
        textareaRef.value.setSelectionRange(length, length)
      }
    }, 10)
  }
})

const selectionStyle = computed(() => ({
  position: 'absolute',
  top: `${props.position.top - 1}px`,
  left: `${props.position.left}px`,
  width: `${props.position.width}px`,
  height: `${props.position.height + 1}px`,
  pointerEvents: props.editing ? 'auto' : 'none',
  zIndex: 1
}))
</script>

<style lang="sass" scoped>
.cell-selection
  background-color: transparent
  border: 2px solid #3b82f6
  box-sizing: border-box
  outline: none

.cell-selection__textarea
  background-color: #ffffff
  border: none
  box-sizing: border-box
  color: #374151
  font-family: 'SourceHanCode', 'Consolas', 'Monaco', 'Courier New', monospace
  font-size: 16px
  height: 100%
  line-height: 1.2
  margin: 0
  outline: none
  overflow: hidden
  padding: 2px 4px
  pointer-events: auto
  resize: none
  width: 100%
</style>
