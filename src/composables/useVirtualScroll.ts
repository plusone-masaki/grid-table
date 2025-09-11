import { ref, computed, watch, nextTick, type Ref } from 'vue'

export interface VirtualScrollOptions {
  containerRef: Ref<HTMLElement | undefined>
  totalRows: Ref<number>
  totalCols: Ref<number>
  rowHeights: Ref<number[]> // 各行の高さの配列
  colWidths: Ref<number[]>  // 各列の幅の配列
  viewportHeight: number
  viewportWidth: number
  overscan?: number // 可視領域外にもレンダリングするアイテム数（スムーズスクロール用）
}

export interface VirtualRange {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export interface VirtualScrollState {
  // 可視領域の範囲
  visibleRange: VirtualRange
  // 実際にレンダリングする範囲（overscanを含む）
  renderRange: VirtualRange
  // スクロール位置
  scrollTop: number
  scrollLeft: number
  // 全体のサイズ
  totalHeight: number
  totalWidth: number
  // 可視領域のオフセット
  offsetTop: number
  offsetLeft: number
}

export function useVirtualScroll(options: VirtualScrollOptions) {
  const {
    containerRef,
    totalRows,
    totalCols,
    rowHeights,
    colWidths,
    viewportHeight,
    viewportWidth
  } = options

  // スクロール状態
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  
  // スクロール方向の検知
  const prevScrollLeft = ref(0)
  const scrollDirection = ref<'left' | 'right' | 'none'>('none')

  // 累積位置計算のためのヘルパー関数（メモ化で最適化）
  // キャッシュ変数
  let cachedRowHeights: number[] = []
  let cachedRowCumulative: number[] = []
  
  const getRowCumulativeHeights = computed(() => {
    const heights = rowHeights.value
    const totalRowCount = totalRows.value
    
    // キャッシュヒット判定
    if (cachedRowHeights === heights && cachedRowCumulative.length === totalRowCount + 1) {
      return cachedRowCumulative
    }
    
    const cumulative = new Array(totalRowCount + 1)
    cumulative[0] = 0
    
    for (let i = 0; i < totalRowCount; i++) {
      cumulative[i + 1] = cumulative[i] + (heights[i] || 24) // デフォルト高さ24px
    }
    
    // キャッシュ更新
    cachedRowHeights = heights
    cachedRowCumulative = cumulative
    
    return cumulative
  })

  let cachedColWidths: number[] = []
  let cachedColCumulative: number[] = []

  const getColCumulativeWidths = computed(() => {
    const widths = colWidths.value
    const totalColCount = totalCols.value
    
    // キャッシュヒット判定
    if (cachedColWidths === widths && cachedColCumulative.length === totalColCount + 1) {
      return cachedColCumulative
    }
    
    const cumulative = new Array(totalColCount + 1)
    cumulative[0] = 0
    
    for (let i = 0; i < totalColCount; i++) {
      const width = widths[i] || 100 // デフォルト幅100px
      cumulative[i + 1] = cumulative[i] + width
    }
    
    // キャッシュ更新
    cachedColWidths = widths
    cachedColCumulative = cumulative
    
    return cumulative
  })

  // 全体のサイズ計算
  const totalHeight = computed(() => {
    const cumulative = getRowCumulativeHeights.value
    return cumulative[cumulative.length - 1]
  })
  
  const totalWidth = computed(() => {
    const cumulative = getColCumulativeWidths.value
    return cumulative[cumulative.length - 1]
  })

  // スクロール位置から行・列インデックスを取得（最適化済み）
  const findRowIndexByPosition = (position: number): number => {
    const cumulative = getRowCumulativeHeights.value
    if (position <= 0) return 0
    if (position >= cumulative[cumulative.length - 1]) return cumulative.length - 2
    
    let left = 0
    let right = cumulative.length - 1
    
    while (left < right) {
      const mid = (left + right) >>> 1 // ビットシフトで高速化
      if (cumulative[mid] <= position) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    return left - 1
  }

  const findColIndexByPosition = (position: number): number => {
    const cumulative = getColCumulativeWidths.value
    if (position <= 0) return 0
    if (position >= cumulative[cumulative.length - 1]) return cumulative.length - 2
    
    let left = 0
    let right = cumulative.length - 1
    
    while (left < right) {
      const mid = (left + right) >>> 1 // ビットシフトで高速化
      if (cumulative[mid] <= position) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    return left - 1
  }

  // 可視行・列の範囲計算（最適化済み）
  const visibleRowRange = computed(() => {
    const startRow = findRowIndexByPosition(scrollTop.value)
    const endRow = findRowIndexByPosition(scrollTop.value + viewportHeight)
    
    return { 
      start: Math.max(0, startRow), 
      end: Math.min(totalRows.value, endRow + 1) 
    }
  })

  const visibleColRange = computed(() => {
    const startCol = findColIndexByPosition(scrollLeft.value)
    const endCol = findColIndexByPosition(scrollLeft.value + viewportWidth)
    
    return { 
      start: Math.max(0, startCol), 
      end: Math.min(totalCols.value, endCol + 1) 
    }
  })

  // 動的オーバースキャン計算
  const dynamicRowOverscan = computed(() => {
    // ビューポートに表示される平均行数を計算
    const totalRowCount = totalRows.value
    let totalHeightSum = 0
    for (let i = 0; i < totalRowCount; i++) {
      totalHeightSum += rowHeights.value[i] || 24
    }
    const averageRowHeight = totalHeightSum / Math.max(totalRowCount, 1)
    const visibleRowCount = Math.ceil(viewportHeight / averageRowHeight)
    
    // 表示行数の1/4程度を余分に表示（最小2行、最大10行）
    return Math.max(2, Math.min(10, Math.ceil(visibleRowCount / 4)))
  })

  const dynamicColOverscan = computed(() => {
    // ビューポートに表示される平均列数を計算
    const totalColCount = totalCols.value
    let totalWidthSum = 0
    for (let i = 0; i < totalColCount; i++) {
      totalWidthSum += colWidths.value[i] || 100
    }
    const averageColWidth = totalWidthSum / Math.max(totalColCount, 1)
    const visibleColCount = Math.ceil(viewportWidth / averageColWidth)
    
    // 横スクロール時の吸い付きを防ぐため、より多くの列を保持
    // 表示列数の半分程度を余分に表示（最小5列、最大20列）
    return Math.max(5, Math.min(20, Math.ceil(visibleColCount / 2)))
  })

  // オーバースキャンを含むレンダリング範囲
  const renderRowRange = computed(() => {
    const { start, end } = visibleRowRange.value
    const rowOverscan = dynamicRowOverscan.value
    return {
      start: Math.max(0, start - rowOverscan),
      end: Math.min(totalRows.value, end + rowOverscan)
    }
  })

  const renderColRange = computed(() => {
    const { start, end } = visibleColRange.value
    const baseOverscan = dynamicColOverscan.value
    
    // スクロール方向に応じてオーバースキャンを非対称に調整
    let leftOverscan = baseOverscan
    let rightOverscan = baseOverscan
    
    if (scrollDirection.value === 'right') {
      // 右スクロール時は右側により多くの列を保持
      rightOverscan = Math.floor(baseOverscan * 1.5)
      leftOverscan = Math.floor(baseOverscan * 0.75)
    } else if (scrollDirection.value === 'left') {
      // 左スクロール時は左側により多くの列を保持
      leftOverscan = Math.floor(baseOverscan * 1.5)
      rightOverscan = Math.floor(baseOverscan * 0.75)
    }
    
    return {
      start: Math.max(0, start - leftOverscan),
      end: Math.min(totalCols.value, end + rightOverscan)
    }
  })

  // 仮想スクロール状態
  const virtualState = computed<VirtualScrollState>(() => ({
    visibleRange: {
      startRow: visibleRowRange.value.start,
      endRow: visibleRowRange.value.end,
      startCol: visibleColRange.value.start,
      endCol: visibleColRange.value.end
    },
    renderRange: {
      startRow: renderRowRange.value.start,
      endRow: renderRowRange.value.end,
      startCol: renderColRange.value.start,
      endCol: renderColRange.value.end
    },
    scrollTop: scrollTop.value,
    scrollLeft: scrollLeft.value,
    totalHeight: totalHeight.value,
    totalWidth: totalWidth.value,
    offsetTop: 0, // 空行実装により不要
    offsetLeft: 0  // 空列実装により不要
  }))

  // レンダリング対象のデータインデックス計算
  const visibleRowIndices = computed(() => {
    const indices = []
    for (let i = renderRowRange.value.start; i < renderRowRange.value.end; i++) {
      indices.push(i)
    }
    return indices
  })

  const visibleColIndices = computed(() => {
    const indices = []
    for (let i = renderColRange.value.start; i < renderColRange.value.end; i++) {
      indices.push(i)
    }
    return indices
  })

  // スクロールイベントハンドラ（RAF最適化 + スムーズ化）
  let rafId: number | null = null
  let lastScrollTime = 0
  const SCROLL_THROTTLE_MS = 16 // 60FPS制限
  
  const handleScroll = (event: Event) => {
    const now = Date.now()
    
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    
    // スロットリング: 前回から16ms以内なら処理をスキップ
    if (now - lastScrollTime < SCROLL_THROTTLE_MS) {
      return
    }
    
    rafId = requestAnimationFrame(() => {
      const target = event.target as HTMLElement
      
      // スクロール値の微調整による滑らかさ向上
      const newScrollTop = Math.round(target.scrollTop)
      const newScrollLeft = Math.round(target.scrollLeft)
      
      // スクロール方向を検知
      if (newScrollLeft > prevScrollLeft.value) {
        scrollDirection.value = 'right'
      } else if (newScrollLeft < prevScrollLeft.value) {
        scrollDirection.value = 'left'
      } else {
        scrollDirection.value = 'none'
      }
      prevScrollLeft.value = newScrollLeft
      
      scrollTop.value = newScrollTop
      scrollLeft.value = newScrollLeft
      lastScrollTime = now
      rafId = null
    })
  }

  // スクロール位置を設定
  const scrollTo = (top: number, left: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = top
      containerRef.value.scrollLeft = left
    }
  }

  // 特定のセルまでスクロール
  const scrollToCell = (rowIndex: number, colIndex: number) => {
    const rowCumulative = getRowCumulativeHeights.value
    const colCumulative = getColCumulativeWidths.value
    const top = rowCumulative[rowIndex] || 0
    const left = colCumulative[colIndex] || 0
    scrollTo(top, left)
  }

  // セルが可視領域内にあるかチェック
  const isCellVisible = (rowIndex: number, colIndex: number) => {
    const { visibleRange } = virtualState.value
    return (
      rowIndex >= visibleRange.startRow &&
      rowIndex < visibleRange.endRow &&
      colIndex >= visibleRange.startCol &&
      colIndex < visibleRange.endCol
    )
  }

  // セルの絶対位置を取得
  const getCellPosition = (rowIndex: number, colIndex: number) => {
    const rowCumulative = getRowCumulativeHeights.value
    const colCumulative = getColCumulativeWidths.value
    const rowHeightValue = rowHeights.value[rowIndex] || 24
    const colWidthValue = colWidths.value[colIndex] || 100
    
    return {
      top: rowCumulative[rowIndex] || 0,
      left: colCumulative[colIndex] || 0,
      width: colWidthValue,
      height: rowHeightValue
    }
  }

  // コンテナの設定
  const setupContainer = () => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
  }

  const cleanupContainer = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  }

  // コンテナ参照の監視
  watch(containerRef, (newContainer, oldContainer) => {
    if (oldContainer) {
      cleanupContainer()
    }
    if (newContainer) {
      setupContainer()
    }
  }, { immediate: true })

  return {
    // 状態
    virtualState,
    visibleRowIndices,
    visibleColIndices,
    
    // メソッド
    scrollTo,
    scrollToCell,
    isCellVisible,
    getCellPosition,
    
    // クリーンアップ
    cleanup: cleanupContainer
  }
}
