# Table Structure – Column & Row Resize

## 概要
列ヘッダー／行見出しからドラッグ操作でセル領域の幅・高さを変更できるようにする。  
リサイズ後は仮想化レンダリング・選択枠・エディタ位置がすべて最新寸法に追従し、再計算されたメトリクスは列／行単位で保持される。

## 対象範囲と用語
- **列リサイズ**: `GridTableHeader` の列ヘッダー終端に設置するハンドルをドラッグし、対象列の幅を更新する操作。
- **行リサイズ**: 行番号セル（`GridTableRowIndex` 背景テーブル）に垂直ハンドルを設置し、対象行の高さを更新する操作。
- **手動メトリクス (manual metrics)**: 自動採寸結果に優先されるユーザー指定の幅／高さ。列は `columnId`、行は 0-based `rowIndex` をキーに保持する。
- 既存の `MIN_COLUMN_WIDTH`、`MIN_ROW_HEIGHT` は下限値として継続利用し、上限は設けない。

## ユーザー操作仕様
### 列幅変更
1. 列ヘッダーにホバー時、各列ヘッダー右端（`<th>` 内の最終要素）の位置に幅 5px のヒットエリア `grid-table__column-resize-handle` を配置する。ホバー時はカーソルを `col-resize` にする。
2. ハンドルで `pointerdown` が発生したら以下を開始:
   - `pointerId` をキャプチャし、`GridTable` 固有状態に「リサイズ対象列 Index / 起点クライアント座標 / 開始幅」を保存。
   - 既存のセル選択ドラッグは中断（`SelectionControls.resetSelection` を呼び出さないが、新規更新をブロック）。
3. `pointermove` でドラッグ量を取得し、`width = clamp(startWidth + deltaX, MIN_COLUMN_WIDTH)` で算出。
4. リサイズ中はスクロールを許容。ハンドルはドキュメント全体でリスナを保持し、`pointerup` または `pointercancel` でドラッグ終了。
5. 終了時に manual metrics を更新し、列メトリクス再計算後に `useVirtualGrid` へ反映。編集中セルが該当列の場合はエディタ幅も更新する。

### 行高変更
1. 行番号セルにホバー時、行番号セル下端に高さ 5px のヒットエリア `grid-table__row-resize-handle` を配置し、カーソルを `row-resize` にする。空行（仮想領域）にはハンドルは表示しない。
2. `pointerdown` 時の処理は列と同様で、`deltaY` を利用。`height = clamp(startHeight + deltaY, MIN_ROW_HEIGHT)`。
3. 行の manual metrics は配列（高速アクセスのため）もしくは Map で管理し、`rowIndex` をキーに保存。行の高さ変更は行全体に即座に反映する。

### キーボード連携
- 本フェーズではキーボードによる幅／高さ変更は非対応。アクセシビリティは次フェーズで検討。

## 状態とデータフロー
### 手動メトリクス格納
- 列: `GridTable` ルートで `const [manualColumnWidths, setManualColumnWidths] = useState<Record<string, number>>({})`。
- 行: `const [manualRowHeights, setManualRowHeights] = useState<Map<number, number>>(new Map())`。
- フォールバック: manual 値が無い場合は既存の自動採寸値を使用。

### フックの拡張
- `useColumnMetrics`:
  - `manualColumnWidths?: Record<string, number>` を追加引数とし、最終幅に適用。
  - `offset` 計算は manual に基づく。
  - 優先サンプリング (`priorityRowIndices`) は従来通り、manual が存在してもサンプル結果は維持。manual を解除した際に自然に自動幅へ戻せるよう、manual 値削除で再計算する。
- `useRowMetrics`:
  - `manualRowHeights?: Map<number, number>` を引数追加し、該当行は manual 値を優先。
  - トータル高さとオフセットの再計算は manual 反映後の値で行う。

### リサイズ時のレンダリング更新
- manual 値更新 → `useMemo` 内の依存配列に含め、カラム／行メトリクスが即座に再計算されるようにする。
- `GridTableBody` と `GridTableHeader` は渡された `columnMetrics` をそのまま使用。`GridTableRowIndex` も `manualRowHeights` を反映した `rowHeights` を受ける。
- 仮想化フック `useVirtualGrid` は列幅合計 (`columnMetrics.reduce`) と行高さ (`rowMetrics.totalHeight`) の変化を検知し再描画する。

## UI 表示要件
- ハンドルは通常時は薄灰色 (`rgba(0,0,0,0.1)`)、hover / active はブランド色 (`#2563eb`) に変化。
- ドラッグ中にガイドラインを表示するため、`GridTable` 直下に `div.grid-table__resize-guide` をポータル表示し、現在位置に沿った縦／横ラインを描画。ガイドは `pointer-events: none`。

## イベントと副作用
- ドラッグ中は `requestAnimationFrame` を用いて 1 フレームに 1 度だけ state 更新し、パフォーマンスを確保する。
- `pointercapture` を利用し、ドラッグ中にカーソルがグリッド外へ出ても追従する。
- 既存のセル編集中 (`editingCell !== null`) に対象列／行をリサイズした場合、編集用 textarea の `style.width` / `style.height` を手動で同期。

## 永続・リセット動作
- 初期ロード時は自動採寸値。手動リサイズ後に別データセットが渡された場合:
  - 列キーが一致する場合は manual 幅を維持。
  - 行高さは `rowIndex` 基準のためデータ長が変わったら既存インデックスとの整合性をチェックし、範囲外行はクリアする。
- 将来的なリセットボタンを想定し、manual メトリクス削除 (`delete manualColumnWidths[columnId]`) で自動採寸へ戻る仕様。

## テスト観点
- ドラッグで最小値にクランプされること。
- manual 値が他のカラム／行に影響しないこと（オフセット計算の正当性）。
- 仮想スクロール中にドラッグしても位置がズレないこと。
- 列幅変更後に selection outline とセル編集エディタが新しい幅に揃うこと。
- 新しいデータセット受信時、存在しない列 ID／行 index の manual メトリクスが除去されること。
