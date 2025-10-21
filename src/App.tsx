import { ChangeEvent, useMemo, useState } from 'react'
import {
  type ColumnPreset,
  type GridDataset,
} from 'types/grid'
import GridTable from './components/GridTable'
import './App.css'

const DEFAULT_ROW_COUNT = 120
const DEFAULT_COLUMN_COUNT = 60
const MAX_ROW_COUNT = 10000
const MAX_COLUMN_COUNT = 200
const MIN_ROW_COUNT = 0
const MIN_COLUMN_COUNT = 1

type DatasetVariant = 'numbers' | 'text' | 'mixed'
type HeaderType = ColumnPreset

const toColumnHeader = (index: number): string => {
  let result = ''
  let num = index

  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }

  return result
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const normalizeNumberInput = (
  event: ChangeEvent<HTMLInputElement>,
  fallback: number,
) => {
  const value = event.currentTarget.valueAsNumber
  return Number.isNaN(value) ? fallback : value
}

const createCellValue = (
  rowIndex: number,
  columnIndex: number,
  columnHeader: string,
  variant: DatasetVariant,
): string | number => {
  if (variant === 'numbers') {
    return rowIndex * 10 + columnIndex
  }

  if (variant === 'text') {
    return `セル ${rowIndex + 1}-${columnHeader}`
  }

  return `${rowIndex + 1}${toColumnHeader(columnIndex)}`
}

const createDataset = (
  rowCount: number,
  columnCount: number,
  variant: DatasetVariant,
): GridDataset =>
  Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) =>
      createCellValue(
        rowIndex,
        columnIndex,
        toColumnHeader(columnIndex),
        variant,
      ),
    ),
  )

const App = () => {
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT)
  const [columnCount, setColumnCount] = useState(DEFAULT_COLUMN_COUNT)
  const [headerType, setHeaderType] = useState<HeaderType>('alpha')
  const [datasetVariant, setDatasetVariant] = useState<DatasetVariant>('numbers')

  const data = useMemo(
    () =>
      createDataset(
        clampNumber(rowCount, MIN_ROW_COUNT, MAX_ROW_COUNT),
        clampNumber(columnCount, MIN_COLUMN_COUNT, MAX_COLUMN_COUNT),
        datasetVariant,
      ),
    [rowCount, columnCount, datasetVariant],
  )

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Grid Table ライブラリ デモ</h1>
        <p className="app__subtitle">
          仮想スクロール対応グリッドの挙動検証用デモ画面です。コントロールからプロパティを変更すると、サンプルデータが再生成されます。
        </p>
      </header>
      <main className="app__main">
        <aside className="app__controls" aria-label="Grid コントロールパネル">
          <div className="control-group">
            <h2>データセット</h2>
            <label>
              行数
              <input
                min={MIN_ROW_COUNT}
                max={MAX_ROW_COUNT}
                type="number"
                value={rowCount}
                onChange={(event) =>
                  setRowCount(
                    clampNumber(
                      normalizeNumberInput(event, DEFAULT_ROW_COUNT),
                      MIN_ROW_COUNT,
                      MAX_ROW_COUNT,
                    ),
                  )
                }
              />
            </label>
            <label>
              列数
              <input
                min={MIN_COLUMN_COUNT}
                max={MAX_COLUMN_COUNT}
                type="number"
                value={columnCount}
                onChange={(event) =>
                  setColumnCount(
                    clampNumber(
                      normalizeNumberInput(event, DEFAULT_COLUMN_COUNT),
                      MIN_COLUMN_COUNT,
                      MAX_COLUMN_COUNT,
                    ),
                  )
                }
              />
            </label>
            <label>
              データ種別
              <select
                value={datasetVariant}
                onChange={(event) =>
                  setDatasetVariant(event.currentTarget.value as DatasetVariant)
                }
              >
                <option value="numbers">数値</option>
                <option value="text">テキスト</option>
                <option value="mixed">混在</option>
              </select>
            </label>
            <label>
              ヘッダーパターン
              <select
                value={headerType}
                onChange={(event) =>
                  setHeaderType(event.currentTarget.value as HeaderType)
                }
              >
                <option value="alpha">アルファベット (A, B, C...)</option>
                <option value="numeric">数値 (1, 2, 3...)</option>
                <option value="headers">データ1行目を利用</option>
              </select>
            </label>
          </div>
        </aside>

        <section className="app__preview" aria-label="Grid プレビュー">
          <GridTable
            headerType={headerType}
            data={data}
            style={{ height: '100%' }}
          />
        </section>
      </main>
    </div>
  )
}

export default App
