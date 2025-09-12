import { ref, computed, watch, nextTick, type Ref } from 'vue'

export interface VirtualScrollOptions {
  containerRef: Ref<HTMLElement | undefined>
  totalRows: Ref<number>
  totalCols: Ref<number>
  rowHeights: Ref<number[]>
  colWidths: Ref<number[]>
  viewportHeight: number
  viewportWidth: number
  rowNumberColWidth: number
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
  offsetTop: number
}

export function useVirtualScroll(options: VirtualScrollOptions) {
  const {
    containerRef,
    totalRows,
    totalCols,
    rowHeights,
    colWidths,
    viewportHeight,
    viewportWidth,
    rowNumberColWidth
  } = options

  // スクロール状態
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  
  // スクロール方向の検知
  const prevScrollLeft = ref(0)
  const scrollDirection = ref<'left' | 'right' | 'none'>('none')

  // 累積位置計算（キャッシュ付き）
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
      end: Math.min(totalCols.value, endCol) 
    }
  })

  // 動的オーバースキャン計算
  const dynamicRowOverscan = computed(() => {
    const totalRowCount = totalRows.value
    const totalHeightSum = rowHeights.value.reduce((sum, height, i) => 
      i < totalRowCount ? sum + (height || 24) : sum, 0)
    const averageRowHeight = totalHeightSum / Math.max(totalRowCount, 1)
    const visibleRowCount = Math.ceil(viewportHeight / averageRowHeight)
    
    return Math.max(2, Math.min(10, Math.ceil(visibleRowCount / 4)))
  })

  const dynamicColOverscan = computed(() => {
    const totalColCount = totalCols.value
    const totalWidthSum = colWidths.value.reduce((sum, width, i) => 
      i < totalColCount ? sum + (width || 100) : sum, 0)
    const averageColWidth = totalWidthSum / Math.max(totalColCount, 1)
    const visibleColCount = Math.ceil(viewportWidth / averageColWidth)
    
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
    offsetTop: 0
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

  // スクロールイベントハンドラ（RAF最適化）
  let rafId: number | null = null
  let lastScrollTime = 0
  const SCROLL_THROTTLE_MS = 16 // 60FPS制限
  
  const handleScroll = (event: Event) => {
    const now = Date.now()
    
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    
    // 16ms制限でスロットリング
    if (now - lastScrollTime < SCROLL_THROTTLE_MS) {
      return
    }
    
    rafId = requestAnimationFrame(() => {
      const target = event.target as HTMLElement
      
      // スクロール値を整数に丸める
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
      // scroll-behaviorを一時的に無効化して即座にスクロール
      const originalScrollBehavior = containerRef.value.style.scrollBehavior
      containerRef.value.style.scrollBehavior = 'auto'
      
      containerRef.value.scrollTop = top
      containerRef.value.scrollLeft = left
      
      // scroll-behaviorを元に戻す
      containerRef.value.style.scrollBehavior = originalScrollBehavior
      
      // スクロール位置のrefも更新
      scrollTop.value = top
      scrollLeft.value = left
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

  // セルが可視領域内に収まるように自動スクロール
  const ensureCellVisible = (rowIndex: number, colIndex: number) => {
    if (!containerRef.value) return

    const currentScrollTop = scrollTop.value
    const currentScrollLeft = scrollLeft.value
    const containerHeight = containerRef.value.clientHeight
    const containerWidth = containerRef.value.clientWidth

    // テーブル要素を取得
    const tableElement = getTableElement()
    if (!tableElement) return

    // 表示中の行でのインデックスを計算
    const visibleRows = visibleRowIndices.value
    const visibleCols = visibleColIndices.value
    
    const visibleRowIndex = visibleRows.indexOf(rowIndex)
    const visibleColIndex = visibleCols.indexOf(colIndex)
    
    if (visibleRowIndex === -1 || visibleColIndex === -1) {
      return
    }

    // 実際のDOM要素から座標を取得
    const row = tableElement.rows[visibleRowIndex + 2]
    if (!row) return

    const cell = row.cells[visibleColIndex + 2]
    if (!cell) return

    // セルの実際の座標を取得
    const cellRect = cell.getBoundingClientRect()
    const containerRect = containerRef.value.getBoundingClientRect()
    
    // コンテナ内相対座標に変換
    const cellTop = cellRect.top - containerRect.top
    const cellBottom = cellTop + cellRect.height
    const cellLeft = cellRect.left - containerRect.left
    const cellRight = cellLeft + cellRect.width

    // 現在の可視領域の境界を計算（ヘッダーの高さを考慮）
    const headerHeight = 24 // ヘッダーの高さ
    const visibleTop = 0 // データ行領域の開始位置
    const visibleBottom = containerHeight - headerHeight // データ行領域の終了位置
    const visibleLeft = rowNumberColWidth
    const visibleRight = containerWidth

    // セルの座標をデータ行領域の相対座標に変換
    const dataCellTop = cellTop - headerHeight
    const dataCellBottom = cellBottom - headerHeight

    let targetTop = currentScrollTop
    let targetLeft = currentScrollLeft

    // 行の可視性チェック（データ行領域の相対座標で判定）
    if (dataCellTop < visibleTop) {
      targetTop = currentScrollTop + dataCellTop
    } else if (dataCellBottom > visibleBottom) {
      targetTop = currentScrollTop + dataCellBottom - visibleBottom
    }

    // 列の可視性チェック
    if (cellLeft < visibleLeft) {
      targetLeft = currentScrollLeft + cellLeft - rowNumberColWidth
    } else if (cellRight > visibleRight) {
      targetLeft = currentScrollLeft + cellRight - containerWidth
    }

    // スクロール位置が変更された場合のみスクロール実行
    if (targetTop !== currentScrollTop || targetLeft !== currentScrollLeft) {
      scrollTo(targetTop, targetLeft)
    }
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

  // テーブル要素を取得するヘルパー関数
  const getTableElement = (): HTMLTableElement | null => {
    if (!containerRef.value) return null
    return containerRef.value.querySelector('.grid-table__table') as HTMLTableElement
  }

  // セルのテーブル内相対位置を取得（仮想スクロール対応）
  const getCellPosition = (rowIndex: number, colIndex: number) => {
    const colWidthValue = colWidths.value[colIndex] || 100
    const rowHeightValue = rowHeights.value[rowIndex] || 24
    
    // 表示中の行でのインデックスを計算
    const visibleRows = visibleRowIndices.value
    const visibleCols = visibleColIndices.value
    
    // バリデーション
    if (visibleRows.length === 0 || visibleCols.length === 0) {
      return {
        top: 24 + (rowIndex * 24),
        left: rowNumberColWidth + (colIndex * 100),
        width: colWidthValue,
        height: rowHeightValue
      }
    }
    
    const visibleRowIndex = visibleRows.indexOf(rowIndex)
    const visibleColIndex = visibleCols.indexOf(colIndex)
    
    // セルが可視範囲にない場合は、デフォルト位置を返す（エラーを投げない）
    if (visibleRowIndex === -1 || visibleColIndex === -1) {
      return {
        top: 24 + (rowIndex * 24),
        left: rowNumberColWidth + (colIndex * 100),
        width: colWidthValue,
        height: rowHeightValue
      }
    }
    
    // テーブル内での相対位置を計算
    let top = 24 // ヘッダー高さ
    
    // 上空行の高さを追加（rowHeightsから直接取得）
    const firstVisibleRowIndex = visibleRows[0]!
    if (firstVisibleRowIndex > 0) {
      for (let i = 0; i < firstVisibleRowIndex; i++) {
        top += rowHeights.value[i] || 24
      }
    }
    
    // 表示中の行までの累積高さを追加（rowHeightsから直接取得）
    for (let i = 0; i < visibleRowIndex; i++) {
      const actualRowIndex = visibleRows[i]!
      top += rowHeights.value[actualRowIndex] || 24
    }
    
    // 左空列の幅を計算
    let left = 0
    const firstVisibleColIndex = visibleCols[0]!
    
    if (firstVisibleColIndex > 0) {
      for (let i = 0; i < firstVisibleColIndex; i++) {
        left += colWidths.value[i] || 100
      }
    }
    
    // 表示中の列までの累積幅を追加
    for (let i = 0; i < visibleColIndex; i++) {
      const actualColIndex = visibleCols[i]!
      left += colWidths.value[actualColIndex] || 100
    }
    
    return {
      top,
      left,
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
    ensureCellVisible,
    isCellVisible,
    getCellPosition,
    
    // クリーンアップ
    cleanup: cleanupContainer
  }
}
