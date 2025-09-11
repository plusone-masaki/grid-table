<template lang="pug">
div.active-cell(
  :style="activeCellStyle"
)
  textarea.active-cell__textarea(
    v-if="editing"
    v-model="editingValue"
    @blur="handleBlur"
    @keydown="handleKeyDown"
    ref="textareaRef"
  )
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'

interface Props {
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
  (e: 'edit:end'): void
  (e: 'edit:cancel'): void
  (e: 'move:cell', direction: 'next' | 'previous' | 'down' | 'up'): void
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
  emit('edit:end')
}

// 編集キャンセル
const cancelEditing = () => {
  emit('edit:cancel')
}

const isKeyboardTriggeredExit = ref(false)

const handleBlur = () => {
  if (isKeyboardTriggeredExit.value) {
    isKeyboardTriggeredExit.value = false
    return
  }
  finishEditing()
}

const handleKeyDown = (event: KeyboardEvent) => {
  // Enterキー：編集確定
  if (event.key === 'Enter' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    if (event.shiftKey) {
      // Shift+Enter：上方向に移動
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      isKeyboardTriggeredExit.value = true
      finishEditing()
      emit('move:cell', 'up')
    } else {
      // Enter：下方向に移動
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      isKeyboardTriggeredExit.value = true
      finishEditing()
      emit('move:cell', 'down')
    }
    return
  }
  
  // Escapeキー：編集キャンセル
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    isKeyboardTriggeredExit.value = true
    cancelEditing()
    return
  }
  
  // Tabキー：編集確定して次のセルに移動
  if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    isKeyboardTriggeredExit.value = true
    
    const direction = event.shiftKey ? 'previous' : 'next'
    
    finishEditing()
    emit('move:cell', direction)
    return
  }
  
  // Shift+Enter：改行を許可（デフォルト動作）
  if (event.key === 'Enter' && event.shiftKey) {
    // デフォルト動作を許可（改行）
    return
  }
  
}

// keyupハンドラーは削除（keydownで十分処理できているため）

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

const activeCellStyle = computed(() => ({
  position: 'absolute',
  top: `${props.position.top - 1}px`,
  left: `${props.position.left}px`,
  width: `${props.position.width}px`,
  height: `${props.position.height + 1}px`,
  pointerEvents: props.editing ? 'auto' : 'none',
  zIndex: 100 // 選択範囲より確実に上に表示
}))
</script>

<style lang="sass" scoped>
.active-cell
  background-color: transparent
  border: 2px solid #3b82f6
  box-sizing: border-box
  outline: none

.active-cell__textarea
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
