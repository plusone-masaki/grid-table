/**
 * Utility functions for grid table library
 */

/**
 * 指定されたサイズの大量モックデータを生成する
 * @param rows 行数
 * @param cols 列数
 * @returns string[][] 形式のモックデータ
 */
export function generateMockData(rows: number, cols: number): string[][] {
  const data: string[][] = []
  
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const row: string[] = []
    
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      // 多様なデータパターンを生成
      const cellType = (rowIndex + colIndex) % 4
      
      switch (cellType) {
        case 0:
          // 数値データ
          row.push(String(Math.floor(Math.random() * 10000)))
          break
        case 1:
          // テキストデータ
          row.push(`Cell-${rowIndex}-${colIndex}`)
          break
        case 2:
          // 計算式風データ
          row.push(`=SUM(A${rowIndex}:C${rowIndex})`)
          break
        case 3:
          // 日付風データ
          const randomDate = new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          row.push(randomDate.toISOString().split('T')[0])
          break
      }
    }
    
    data.push(row)
  }
  
  return data
}

/**
 * 100列×1000行の大量モックデータを生成する（仮想スクロールテスト用）
 */
export function generateLargeDataset(): string[][] {
  return generateMockData(1000, 100)
}

/**
 * 動的なサイズ配列を生成する（仮想スクロールのテスト用）
 * @param count 要素数
 * @param baseSize 基本サイズ
 * @param variance サイズの変動幅
 */
export function generateDynamicSizes(count: number, baseSize: number, variance: number): number[] {
  const sizes: number[] = []
  
  for (let i = 0; i < count; i++) {
    // ランダムな変動を加える
    const randomVariation = (Math.random() - 0.5) * 2 * variance
    const size = Math.max(baseSize / 2, baseSize + randomVariation)
    sizes.push(Math.round(size))
  }
  
  return sizes
}

/**
 * テスト用の動的行高さを生成（一部の行だけ高くする）
 */
export function generateTestRowHeights(rowCount: number): number[] {
  const heights: number[] = []
  
  for (let i = 0; i < rowCount; i++) {
    if (i % 10 === 0) {
      // 10行おきに高い行を作る
      heights.push(48)
    } else if (i % 7 === 0) {
      // 7行おきに少し高い行を作る
      heights.push(32)
    } else {
      // 通常の高さ
      heights.push(24)
    }
  }
  
  return heights
}

/**
 * テスト用の動的列幅を生成（一部の列だけ広くする）
 */
export function generateTestColWidths(colCount: number): number[] {
  const widths: number[] = []
  
  for (let i = 0; i < colCount; i++) {
    if (i % 5 === 0) {
      // 5列おきに広い列を作る
      widths.push(200)
    } else if (i % 3 === 0) {
      // 3列おきに少し広い列を作る
      widths.push(150)
    } else {
      // 通常の幅
      widths.push(100)
    }
  }
  
  return widths
}
