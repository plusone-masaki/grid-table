<template lang="pug">
div.active-cell(
  v-if="visible"
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
  (e: 'tabMove', direction: 'next' | 'previous'): void
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

// キー操作によって編集が終了したかどうかのフラグ
const isKeyboardTriggeredExit = ref(false)

// blurイベントハンドラー
const handleBlur = () => {
  console.log('ActiveCell blur event, keyboard triggered:', isKeyboardTriggeredExit.value)
  // キーボード操作によって編集が終了した場合はblurイベントを無視
  if (isKeyboardTriggeredExit.value) {
    isKeyboardTriggeredExit.value = false
    return
  }
  // 通常のblur（クリックなどによる）の場合は編集を確定
  finishEditing()
}

// キーイベントハンドラー
const handleKeyDown = (event: KeyboardEvent) => {
  console.log('ActiveCell keydown:', event.key, {
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    target: event.target,
    currentTarget: event.currentTarget
  })
  
  // Enterキー：編集確定
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    console.log('Enter pressed - finishing edit')
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    isKeyboardTriggeredExit.value = true
    finishEditing()
    return
  }
  
  // Escapeキー：編集キャンセル
  if (event.key === 'Escape') {
    console.log('Escape pressed - canceling edit')
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    isKeyboardTriggeredExit.value = true
    cancelEditing()
    return
  }
  
  // Tabキー：編集確定して次のセルに移動
  if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    console.log('Tab pressed - finishing edit and moving to next cell')
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    isKeyboardTriggeredExit.value = true
    
    const direction = event.shiftKey ? 'previous' : 'next'
    console.log('Tab direction:', direction)
    
    finishEditing()
    // Tab移動を親コンポーネントに通知
    emit('tabMove', direction)
    return
  }
  
  // Shift+Enter：改行を許可（デフォルト動作）
  if (event.key === 'Enter' && event.shiftKey) {
    console.log('Shift+Enter pressed - allowing newline')
    // デフォルト動作を許可（改行）
    return
  }
  
  console.log('ActiveCell: no action taken for key:', event.key)
}

// keyupハンドラーは削除（keydownで十分処理できているため）

// 編集開始時にフォーカス設定
watch(() => props.editing, async (editing) => {
  if (editing) {
    console.log('Edit mode started, focusing textarea')
    
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
  zIndex: 2 // 選択範囲より上に表示
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
