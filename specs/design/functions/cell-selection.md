# セル選択機能仕様書

## 1. 背景と狙い
- 現状の `GridTable` はデータ表示のみで、セルとのインタラクションが存在しない。
- スプレッドシート操作の基礎となる「セルの選択状態」を導入し、視覚的なフィードバック（枠線）を提供する。
- 本仕様は後続の範囲選択、多選択、キーボード操作を見据えつつ、第一段階として「単一セルのマウス選択」と「選択枠の表示」を確実に実装することを目的とする。

## 2. 成功条件
- 左クリック（またはタッチ＝プライマリボタン）でセルを選択すると、選択中セルを囲む枠線要素が表示される。
- 選択枠は仮想スクロール・リサイズに追従し、常に正しいセルを囲む。
- 選択状態はスクロール後も保持され、未描画領域へスクロールすると表示復帰時に枠線が正しい位置へ再配置される。
- 選択中セルには `aria-selected="true"` が付与され、スクリーンリーダー利用者が選択状態を把握できる。
- データが空のとき、または選択中セルが削除（データ更新）された場合は選択状態を安全にクリアする。

## 3. スコープ
- 対象要素：ボディ領域のデータセル（`<tbody>` 内の `<td role="gridcell">`）。
- 非対象：行番号列、列ヘッダー、複数セル選択、キーボードナビゲーション、ドラッグ選択、編集モード。
- 本フェーズでは外部 API (`props`) を追加しない。内部実装を確立し、後続フェーズで公開フック/イベントの追加を検討する。

## 4. 用語
- **セル座標**：`{ rowIndex: number; columnIndex: number }`。`rowIndex` はボディ行（0 始まり）、`columnIndex` は表示列（0 始まり、行番号列を含まない）。
- **仮想行インデックス**：`renderRowStartIndex + ローカル行インデックス`。可視領域の先頭行を基点とする。
- **スクロールオフセット**：`useVirtualGrid` が返す `range.offsetTop` / `range.offsetLeft`。セル位置計算に利用する。

## 5. UI / 視覚仕様
- 選択枠は `div.grid-table__selection-outline` として描画し、選択が存在しない場合は DOM に生成しない。
- `grid-table__selection-outline` は `grid-table__scroll` の直下に一意に配置し、`position: absolute` でセル境界に追従させる。
- `grid-table__selection-outline` のスタイル：
  - 枠線色：`#2563eb`。
  - 枠線太さ：2px。
  - 背景は透過、角丸なし。
  - 選択セルより外側に 1px オーバーレイされるよう `transform: translate(-1px, -1px)` を適用。
- 枠線はセルの内側パディングを考慮し、セル幅・高さを基準に計算する。ボーダーはセルの境界線上に揃える。
- 選択セルが表示領域外（仮想化により未描画）になっても、スクロールに応じて枠線が同時に移動し、コンテナの `overflow` によって自然にクリップされる。特別な非表示処理は行わない。

## 6. インタラクション仕様
- **指標イベント**：`pointerdown` を利用し、`event.button === 0`（プライマリボタン）のみ選択トリガーとする。
- `pointerdown` で `event.preventDefault()` は行わない。ブラウザ標準動作を維持しつつ、選択状態を同期する。
- 行番号列やスペーサ列・行にはリスナーを付与しないか、付与した場合は無視する。
- 同一セル再選択時も状態を維持する（再描画のみに留める）。
- スクロール、データ更新、列幅計算など非ユーザーアクションでも、選択状態と枠線位置は同期する。
- `Escape` キーによる選択解除は後続フェーズ扱い。現段階ではマウス操作のみを扱う。

## 7. 状態管理
- `GridTable` コンポーネントで `const [selection, setSelection] = useState<CellCoordinate | null>(null)` を保持する。
- `selection` は仮想化以前の「絶対座標」（データセット基準）を保存する。
- `GridTableBody` に現在の選択座標と更新関数を渡し、セル描画時に `aria-selected` 判定を行う。
- 位置計算は `GridTable` 側で行い、`selection`・`columnMetrics`・`rowMetrics.height`・`range.offsetTop` / `offsetLeft` からピクセル位置を算出し、`selection-outline` に `style` を渡す。
- データが空配列になる、または `selection.rowIndex >= rowCount` / `selection.columnIndex >= columnCount` になった場合は `setSelection(null)` でリセットする。

## 8. DOM 構造とレイヤー
- 選択ありの場合の DOM 階層例：
  ```
  div.grid-table__scroll (relative)
   ├─ div.grid-table__selection-outline (absolute, width/height/transform により枠線表示)
   └─ 既存の grid-table__spacer 群
  ```
  - `selection-outline` はスクロール位置に追従するため `top` / `left` を `scrollTop` / `scrollLeft` に依存させる。`useLayoutEffect` で DOM 計測は不要とし、仮想化メトリクスのみで計算する。
- 計算式（概略）：
  - `left = rowIndexWidth + spacerColumnWidth + columnOffsets[columnIndex] - range.offsetLeft`
  - `top = HEADER_HEIGHT + (selection.rowIndex - range.rowStart) * rowHeight - range.offsetTop`
  - 可視範囲外に出た場合は負値や描画領域外の座標となるが、そのまま保持しスクロールによる再可視化に備える
  - `width = columnMetrics[columnIndex].width`
    - `height = rowHeight`

## 9. アクセシビリティ
- 選択中セルには `aria-selected="true"` を設定。それ以外は明示的に `false` を付与しない（デフォルト `undefined`）。
- 選択枠 `div` には `role` を付与しない。視覚専用フィードバックとする。
- `GridTable` セクションには既存の `role="grid"` 属性があるため、`aria-activedescendant` の導入は次フェーズに持ち越す。

## 10. エッジケースと動作要件
- データセットが `EMPTY_DATASET_FALLBACK` のときも通常と同様に選択を許可し、枠線を表示する。
- カラム数 0 の行が存在する場合（完全に空のレコード）でも、選択しようとしたイベントは無視する。
- 仮想ウィンドウによる `offset` が 0 未満になることはない前提だが、安全策として計算時に `Math.max(value, 0)` を適用する。
- `columnMetrics` が空のとき（表示列なし）は描画をスキップ。

## 11. テスト戦略
- Playwright を用いた E2E テストで以下を検証する：
  - 初期表示時に `.grid-table__selection-outline` が存在しないこと。
  - 任意セルをクリックすると `aria-selected="true"` が設定され、アウトラインが表示されること。
  - スクロール後もアウトラインが表示され続け、選択状態が維持されること。
  - 行番号セルやヘッダセルをクリックしても選択状態が変わらないこと（将来の追加テスト）。
- データ更新テストは将来の機能追加時にシナリオを拡張し、E2E で検証する。

## 12. 今後の拡張余地（参考）
- 複数セル・範囲選択への拡張（矩形選択ボックスの拡張、ハンドル表示）。
- キーボードナビゲーション（矢印キーでセル移動、`aria-activedescendant` 採用）。
- 外部向けコールバック（`onSelectionChange`）の公開。
- 選択状態と編集モードの連携。

以上。
