import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { DEFAULT_KEY_CONFIG, type KeyConfig, type KeyBinding, type KeyAction } from '@/types/key-config'

export interface KeyboardHandlerOptions {
  gridContainer: Ref<HTMLElement | undefined>
  keyConfig?: KeyConfig
}

export interface KeyHandler {
  (action: KeyAction, event: KeyboardEvent): void
}

export function useKeyboardHandler(options: KeyboardHandlerOptions) {
  const { gridContainer, keyConfig = DEFAULT_KEY_CONFIG } = options
  
  // キーハンドラーの登録
  const keyHandlers = ref<Map<KeyAction, KeyHandler>>(new Map())
  
  // キーバインディングが一致するかチェック
  const matchesBinding = (event: KeyboardEvent, binding: KeyBinding): boolean => {
    return (
      event.key === binding.key &&
      !!event.ctrlKey === !!binding.ctrlKey &&
      !!event.shiftKey === !!binding.shiftKey &&
      !!event.altKey === !!binding.altKey &&
      !!event.metaKey === !!binding.metaKey
    )
  }

  // キーマッチング関数（KeyBinding配列）
  const matchesBindings = (event: KeyboardEvent, bindings: KeyBinding[]): boolean => {
    return bindings.some(binding => matchesBinding(event, binding))
  }
  
  // キーイベントを処理
  const handleKeyDown = (event: KeyboardEvent) => {
    // 編集中の要素（input, textarea）からのイベントは無視
    const target = event.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return
    }
    
    // マッチするアクションを全て収集
    const matchingActions: string[] = []
    for (const [action, bindings] of Object.entries(keyConfig)) {
      if (matchesBindings(event, bindings)) {
        matchingActions.push(action)
      }
    }
    
    // マッチしたアクションの中から最初に見つかったハンドラーを実行
    for (const action of matchingActions) {
      const handler = keyHandlers.value.get(action as KeyAction)
      if (handler) {
        event.preventDefault()
        handler(action as KeyAction, event)
        return
      }
    }
  }
  
  // キーハンドラーを登録
  const registerHandler = (action: KeyAction, handler: KeyHandler) => {
    keyHandlers.value.set(action, handler)
  }
  
  // キーハンドラーを削除
  const unregisterHandler = (action: KeyAction) => {
    keyHandlers.value.delete(action)
  }
  
  // イベントリスナーの管理
  onMounted(() => {
    if (!gridContainer.value) return
    gridContainer.value.addEventListener('keydown', handleKeyDown)
    // フォーカス可能にする
    gridContainer.value.setAttribute('tabindex', '0')
  })
  
  onUnmounted(() => {
    if (!gridContainer.value) return
    gridContainer.value.removeEventListener('keydown', handleKeyDown)
  })
  
  return {
    registerHandler,
    unregisterHandler,
    keyConfig: computed(() => keyConfig)
  }
}

