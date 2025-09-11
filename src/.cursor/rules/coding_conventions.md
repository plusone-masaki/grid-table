# コーディング規約

## イベント命名規則

### Vue コンポーネントイベント

Vue コンポーネントのカスタムイベント名は「どうする：何を」の順でコロン区切りの形式を使用する。

#### 基本パターン
```
動詞:対象
```

#### 例
- `click:cell` - セルをクリック
- `edit:start` - 編集を開始
- `edit:end` - 編集を終了
- `edit:cancel` - 編集をキャンセル
- `move:cell` - セルを移動
- `select:range` - 範囲を選択
- `change:data` - データを変更

#### Vue.jsの標準イベントとの併用
- `update:modelValue` など Vue.js 標準の形式は例外とする
- プロジェクト固有のイベントに上記規則を適用

#### 利点
1. **一貫性**: 全てのイベントで統一された命名パターン
2. **可読性**: アクションと対象が明確に分離されている
3. **予測性**: パターンを理解すれば他のイベント名も推測しやすい
4. **保守性**: 規則に従うことで修正・拡張が容易

#### 悪い例
```typescript
// ❌ 統一感のない命名
(e: 'finishEditing'): void
(e: 'cellMove'): void
(e: 'startEdit'): void
```

#### 良い例
```typescript
// ✅ 統一されたコロン区切り命名
(e: 'edit:end'): void
(e: 'move:cell'): void
(e: 'edit:start'): void
```

## 関数・メソッド命名規則

### ハンドラー関数
イベントハンドラー関数は `handle` + イベント名（camelCase変換）の形式を使用する。

```typescript
// イベント名: click:cell → ハンドラー名: handleClickCell
// イベント名: edit:start → ハンドラー名: handleEditStart
// イベント名: move:cell → ハンドラー名: handleMoveCell
```

### 内部処理関数
コンポーネント内部の処理関数は動詞始まりのcamelCaseを使用する。

```typescript
// 良い例
performCellMove()
executeCellSelection()
updateSelectionRange()

// 悪い例
tabMove() // キー名に依存
enterAction() // キー名に依存
```

## ファイル命名規則

### コンポーネントファイル
- PascalCase を使用
- 機能を表す名前を使用

```
// 良い例
ActiveCell.vue
CellSelection.vue
GridTable.vue

// 悪い例
activecell.vue
cell_selection.vue
grid-table.vue
```

### Composable ファイル
- camelCase で `use` プレフィックスを使用

```
// 良い例
useCellSelection.ts
useKeyboardHandler.ts
useDataDisplay.ts

// 悪い例
CellSelection.ts
keyboardHandler.ts
dataDisplay.ts
```

## TypeScript型命名規則

### インターフェース
- PascalCase を使用
- 機能や目的を明確に表現

```typescript
// 良い例
interface CellPosition {
  row: number
  col: number
}

interface KeyBinding {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
}

// 悪い例
interface cell_position {
  row: number
  col: number
}

interface KeyBind {
  key: string
  ctrl?: boolean
  shift?: boolean
}
```

### 型エイリアス
- PascalCase を使用

```typescript
// 良い例
type KeyAction = keyof KeyConfig
type CellDirection = 'up' | 'down' | 'left' | 'right'

// 悪い例
type keyAction = keyof KeyConfig
type Direction = 'up' | 'down' | 'left' | 'right'
```
