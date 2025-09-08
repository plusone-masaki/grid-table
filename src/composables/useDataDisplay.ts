import { computed, type Ref } from 'vue'
import type { HeaderMode } from '@/types/header-modes'

export interface DataDisplayOptions {
  data: Ref<string[][]>
  headerMode?: HeaderMode
}

export function useDataDisplay(options: DataDisplayOptions) {
  const { data, headerMode = 'alphabetic' } = options

  // 列数とヘッダーの計算
  const columnCount = computed(() => {
    if (data.value.length === 0) return 1
    return data.value[0].length
  })

  const columnHeaders = computed(() => {
    const count = columnCount.value
    
    switch (headerMode) {
      case 'numeric':
        // 数値ヘッダー: 1, 2, 3...
        return Array.from({ length: count }, (_, index) => String(index + 1))
      
      case 'array':
        // 配列ヘッダー: データ配列の先頭行を使用
        if (data.value.length > 0) {
          return data.value[0].slice(0, count)
        }
        return Array.from({ length: count }, (_, index) => `Column ${index + 1}`)
      
      case 'alphabetic':
      default:
        // 英字ヘッダー: A, B, C... (26列を超える場合はAA, AB...)
        const headers: string[] = []
        for (let i = 0; i < count; i++) {
          let result = ''
          let num = i
          while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result
            num = Math.floor(num / 26) - 1
          }
          headers.push(result)
        }
        return headers
    }
  })

  // 表示用データ（空の場合は空の行を1つ表示）
  const displayData = computed(() => {
    if (data.value.length === 0) {
      return [Array(columnCount.value).fill('')]
    }
    
    // headerModeが'array'の場合は先頭行を除いたデータを表示
    if (headerMode === 'array' && data.value.length > 1) {
      return data.value.slice(1)
    }
    
    return data.value
  })

  return {
    columnCount,
    columnHeaders,
    displayData
  }
}
