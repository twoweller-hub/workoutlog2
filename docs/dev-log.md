# 開発ログ

## 2026-05-13（11）

### s3画面：メモ欄を各セット個別に変更

- 従来: 画面下部の単一 `#ex-memo` textarea（メインの①セットのみに保存）
- 変更後: 各セット行の怪我セクションの下に rows=2 の `set-memo-input` textarea を追加
- `buildSetRowHtml()` に `.wa-set-memo` div + textarea を追加
- `buildInjuryMemoHtml()` を削除（グローバルメモ欄廃止）
- `syncS3InjuryState()` で `set.memo` も同期するよう拡張
- `completeEx()`: `memo: i === 0 ? memo : ''` → `memo: set.memo || ''`（全セット個別メモ対応）
- `emptySet()` / `buildSets()` / `onAddSet()` の push にも `memo: ''` 追加
- `style.css?v=45` → `v=46`、`app.js?v=31` → `v=32`、SW `v52` → `v53`

## 2026-05-13（10）

### PC記録ボタンのフォントサイズ調整

- PC「開始」「記録済」: 18px → 16px（大きすぎたため）
- PC「00:00」（started）: 24px のまま維持
- `style.css?v=44` → `v=45`、SW `v51` → `v52`

## 2026-05-13（9）

### PC全体幅を拡大（1280px → 1360px）

- `#app` max-width 1280px → 1360px（+80px）
- 右ペイン（S3履歴）が広がり、セット所要時間追加による2行折り返しを解消
- `style.css?v=43` → `v=44`、SW `v50` → `v51`

## 2026-05-13（8）

### 履歴にセット所要時間を表示

- GAS `getHistory` / `getExerciseHistory`: col18（duration）を読んでセットデータに含める
- `formatHistSets`: duration があれば `（MM:SS）` をセット表示に追加
- 日付・種目履歴ペイン、記録タブ右ペインに反映
- `app.js?v=30` → `v=31`、SW `v49` → `v50`

## 2026-05-13（7）

### 計測中ボタン（00:00）のフォントサイズをBebas Neue用に調整

- Bebas Neue はNoto Sans JPより細く見えるため、`.started`に個別サイズを設定
- SP: 18px、PC: 24px（他ボタン14px/18pxに対して視覚的に揃える）
- `style.css?v=42` → `v=43`、SW `v48` → `v49`

## 2026-05-13（6）

### 計測中ボタン（00:00）のフォントサイズ修正

- `.wa-record-btn.started`の`font-size: 16px`を削除し、ベース/メディアクエリの値を継承するよう修正
- `style.css?v=41` → `v=42`、SW `v47` → `v48`

## 2026-05-13（5）

### 記録ボタンのフォントサイズを拡大

- SP: 12px → 14px、PC: 15px → 18px（全状態で統一）
- `style.css?v=40` → `v=41`、SW `v46` → `v47`

## 2026-05-13（4）

### セット所要時間機能のバグ修正

- 「開始」ボタンが押せないバグを修正: mouseupでタイマーをクリア後にclickが来るため、`longPressFired`フラグで長押し判定に変更
- 確認モーダルのOKボタンが常に「削除する」（赤）だったバグを修正: `showConfirm`に`opts`パラメータ追加、非破壊操作は「記録する」（黄緑）で表示
- `app.js?v=29` → `v=30`、SW `v45` → `v46`

## 2026-05-13（3）

### セット所要時間の計測・記録機能を追加（col18追加）

- 記録ボタンを「開始」→カウントアップ表示→「記録」の3状態に変更
- 「開始」を長押し（600ms）で「タイマーなしで記録」確認モーダルを表示
- セットデータに `startedAt` / `duration` フィールドを追加
- `updateTimer()` で計測中セットボタンのカウントアップ表示を毎秒更新
- GAS `saveSets` / `updateExerciseRecords` に col18（所要時間・秒）を追加
- `updateExerciseRecords` で編集時に既存の duration を引き継ぐ
- `style.css?v=39` → `v=40`、`app.js?v=28` → `v=29`、SW `v44` → `v45`

**スプレッドシート手動作業**: 記録シートのR列（col18）に「所要時間（秒）」ヘッダーを追加

## 2026-05-13（2）

### S3に種目経過時間タイマーを追加

- S3のタイマー表示を「経過時間 全体 XX:XX 種目 XX:XX」形式に変更
- `S.currentExStartTime` を追加、`enterEx()` で種目遷移時にリセット
- `updateTimer()` で `s3-ex-timer` も更新
- `s3-start-label`（開始時刻表示）を削除
- `style.css?v=38` → `v=39`、`app.js?v=27` → `v=28`、SW `v43` → `v44`

## 2026-05-13

### SKILL.md の移動と gitignore・CLAUDE.md のパス更新

- `docs/SKILL.md` → `.claude/skills/obsidian_memo/SKILL.md` に移動（ユーザー作業）
- `.gitignore` のパスを更新
- `CLAUDE.md` の Obsidian メモ参照パスを更新

## 2026-05-12（5）

### 日付軸履歴の開始時刻に「〜」を追加

- `15:06` → `15:06〜` と表示。種目軸の表示と統一
- `app.js?v=26` → `v=27`、SW `v42` → `v43`

## 2026-05-12（4）

### 日付表示の改行を修正

- 西暦追加により `2026/5/12（月）` が固定幅に収まらず曜日で改行されていた
- `.wa-session-date`（width: 110px）と `.wa-ex-hist-date`（width: 80px）の固定幅を削除し `white-space: nowrap` に変更
- `style.css?v=37` → `v=38`、`app.js?v=25` → `v=26`、SW `v41` → `v42`

## 2026-05-12（3）

### 同一セッション内で同種目を2回やると怪我データが引き継がれるバグを修正

- `enterEx` で `initS3Sections` を呼ぶ前に `s3-body` を空にすることで解決
- 怪我データは `syncS3InjuryState` がDOMから読む仕組みのため、旧DOMが残っていると引き継がれていた
- 重量・回数の前回値は `initS3Sections` が `S.s3ExData` から設定するため影響なし
- `app.js?v=24` → `v=25`、SW `v40` → `v41`

## 2026-05-12（2）

### 種目インスタンスID（exInstanceId）を追加し、同一セッション内の同種目重複・複数セッションの履歴分離を実現

- 記録シートに col 17（種目インスタンスID）を追加。フロントで `'exinst_' + Date.now() + '_' + index` を生成
- `startSession` / `startSingle` / `openSessionExAdd` で各種目に `exInstanceId` を付与
- `completeEx` で `saveSets` に `exInstanceId` を渡し、GAS 側 col 17 に書き込む
- `updateExerciseRecords` の行特定を `exInstanceId` 優先に変更（旧データは `sessionId + 種目名` にフォールバック）
- `getHistory` の `recMap` を `{exKey: {name, exInstanceId, sets}}` に変更。`sess.exercises` を object から array に変更
- `getExerciseHistory` を日付単位グループから `exInstanceId` 単位グループに変更。時刻（col C）もレスポンスに追加
- `buildSessionExRows` を array 対応に変更。編集ボタンに `data-ex-instance-id` を追加
- `openRecordEditModal` の引数に `exInstanceId` を追加。`S.editingRecord` にも保存
- `saveRecordModal` / `deleteExerciseRecordsConfirm` で `exInstanceId` を GAS に渡す
- `appendExHistItems` で時刻を日付横に表示（`HH:mm〜` 形式）。要素 ID を `exInstanceId` ベースに変更
- 解決した問題：同じ日に同じメニューを2回やると種目履歴がまとまる / 同セッション内で同種目を2回記録できなかった
- 旧データ互換：col 17 が空の行は従来ロジックで処理
- `app.js?v=23` → `v=24`、SW `v39` → `v40`

## 2026-05-12（1）

### 日付表示に西暦を追加

- `dateLabel()` の返り値を `M/D（曜日）` から `YYYY/M/D（曜日）` に変更
- アプリ全体の日付表示（履歴・前回表示・削除確認など）に適用される
- 1年以上前の記録を遡ったときに何年か分からない問題を解消
- `app.js?v=22` → `v=23`、SW `v38` → `v39`

## 2026-05-11（7）

### PC左サイドメニューにスプレッドシートリンクを追加

- `#sidebar-nav` の最下部に `<a class="sidebar-sheet-link">` を追加
- アイコン 🔗、ラベル「Sheet」、`target="_blank"` で別タブ表示
- `margin-top: auto` でサイドバー最下部に固定、`border-top` で区切り線
- ホバーで `opacity: 0.5 → 1` に変化
- `style.css?v=36` → `v=37`、SW `v37` → `v38`

## 2026-05-11（6）

### 記録済み種目のクリックを無効化

- s2（種目一覧）で `done = true` の種目をクリックしても s3 に入れてしまう問題を修正
- `done` 種目を開くと `initS3Sections` が走り今日の記録がリセットされ、再度 `completeEx` すると重複保存になるリスクがあった
- `renderS2` でイベントリスナーを `!ex.done` な種目のみに設定
- CSS に `.wa-ex-item.done { pointer-events: none; cursor: default; }` を追加
- `style.css?v=35` → `v=36`、`app.js?v=21` → `v=22`、SW `v36` → `v37`

## 2026-05-11（5）

### トレーニング完了画面に終了時刻・Obsidianメモを追加

- `goFinish()` で `endTime = timeNow()` を取得し `S.session.endTime` に保存
- 「総時間X分」表示を `19:30〜20:45（75分）` 形式（`#finish-time-range`）に変更
- サマリーカードの「開始時刻」を削除（時間帯表示に統合）
- `buildObsidianText()` 追加：完了種目・メインセット値（`formatHistSets` 形式）・時間帯を組み立て
- Obsidianメモ欄（読み取り専用 `<textarea>`）と「コピー」ボタンを追加。コピー後1.5秒「コピー済み✓」表示
- `saveSession()` の `endTime` を `S.session.endTime` 優先に変更（完了画面表示と保存値を一致）
- 単発記録は `menuDisplay = '単発記録'` のため見出しは `### 筋トレ：単発記録`
- `style.css?v=34` → `v=35`、`app.js?v=20` → `v=21`、SW `v35` → `v36`

## 2026-05-11（4）

### 記録編集モーダルの保存ボタンに「保存中…」表示を追加

- 保存ボタン押下時に `textContent = '保存中…'` + `disabled = true` に変更
- `gasPost` 完了後に `textContent = '保存'` + `disabled = false` に戻す
- トレーニング終了画面の `saveSession` と同パターン
- `app.js?v=19` → `v=20`、SW `v34` → `v35`

## 2026-05-11（3）

### 記録編集後に種目順序・時刻が壊れるバグを修正（GAS）

- **原因1（順序）**: `updateExerciseRecords` が対象行を削除後にシート末尾へ追記していたため、同セッション内での種目順が壊れていた。`getHistory` はシート行順でオブジェクトキーを積む構造のため、行位置の変化が表示順に直結する
- **原因2（時刻消失）**: 再挿入時に時刻列（col C）を `''` 固定にしていた
- **原因3（インターバル消失）**: 同様に `targetInterval`（col K）も `''` 固定だった
- **修正**: 削除前の前向きスキャンで `insertRow`（最初のマッチ行番号）と `originalData{type|setNum|side: {time, targetInterval}}` を収集。削除後、`insertRow <= getLastRow()` なら `insertRowsBefore` で元の位置に挿入、末尾の場合は末尾追記。`targetInterval` は `??` 演算子で 0 を保持

## 2026-05-11（2）

### 怪我の記録をセット単位に変更

- 従来：種目1つにつき怪我入力欄が1つ（常にメイン①セットに保存）
- 変更後：ウォームアップ・メイン各セット行に「🩹 怪我」トグルを追加。セットごとに部位・程度・メモを入力可能
- `buildSetRowHtml` / `buildRecordSetRow` に `.wa-set-injury` セクションを追加
- `buildInjuryMemoHtml` から怪我欄を削除（メモのみ残す）
- `toggleInjury` 関数を削除
- `syncS3InjuryState()` 追加：re-render前にDOMの怪我値を `S.s3Sections` に同期
- `initS3Sections` のセットオブジェクトに `injurySite / injuryLevel / injuryMemo / injuryOpen` フィールドを追加
- `completeEx`：共有怪我入力の読み取りを廃止し `S.s3Sections` から per-set で読む
- `openRecordEditModal`：`buildSide` が per-set injury を含むように変更。`firstInjury` 抽出を廃止
- `renderRecordEditBody`：共有怪我欄を削除、per-set トグルイベントを追加
- `syncRecordEditState`：per-set 怪我を各行から読む
- `saveRecordModal`：sections の per-set injury から保存
- 履歴表示（line 997, 1127）：`setNumLabel` の isWarm を正しく設定。複数怪我の区切りを `、` → `\n`（pre-wrap で改行表示）
- `.wa-ex-row-injury` / `.wa-ex-hist-injury` に `white-space: pre-wrap` を追加
- CSS: `.wa-set-row` に `flex-wrap: wrap`、`.wa-set-injury` 系クラスを追加
- `style.css?v=32` → `v=34`、`app.js?v=18` → `v=19`、SW `v33` → `v34`

## 2026-05-11

### 履歴の怪我メモ表示を修正

- 履歴タブ（日付別・種目別）と記録3右ペインの履歴で、怪我部位・レベルは表示されていたが怪我メモ（`injuryMemo`）が表示されていなかった
- `buildSessionExRows`（line 997）と `appendExHistItems`（line 1127）の injuries 文字列生成に `injuryMemo` を追加
- 表示形式: `1セット 腰・違和感：メモテキスト`（`：` 区切りでメモを末尾に付与）
- `app.js?v=17` → `v=18`、SW `v32` → `v33`

## 2026-05-10（夜16）

### 「すべて開く▼」ボタンを3箇所に追加

- 記録3右ペイン：「累計○セット　本日」の右端に配置（`.s3-hist-stats-row` でflex化）
- 履歴タブ日付別：リストの直上に右寄せで配置（`.wa-expand-all-row`）
- 履歴タブ種目別：種目名タイトルの下・リストの上に右寄せで配置
- クリックで全アイテムに `expanded` クラスを付与/除去し「すべて閉じる▲」と切り替え
- `toggleExpandAll(btnId, listId, itemClass)` ヘルパー関数を追加
- `style.css?v=31` → `v=32`、`app.js?v=16` → `v=17`、SW `v31` → `v32`

## 2026-05-10（夜15）

### 履歴タブのメモ改行表示を修正

- 記録3右ペインの履歴メモ（`.wa-ex-hist-memo`）は `white-space: pre-wrap` 済みだったが、履歴タブ日付別の `.wa-ex-row-memo` と `.wa-session-feeling` が未対応だった
- 両クラスに `white-space: pre-wrap` を追加
- `style.css?v=30` → `v=31`、SW `v30` → `v31`

## 2026-05-10（夜14）

### 記録3画面の左右ペインのすき間調整

- 左ペイン（記録）の幅を480px→500pxに拡大（縦ラインが右に20pxずれる）
- 右ペイン（履歴）のヘッダー・ボディの左paddingを20px→40pxに拡大（線からの空きを増やす）
- 左ペインの固定幅は維持（ブラウザ縮小時に左ペインが優先される）
- `style.css?v=29` → `v=30`、SW `v29` → `v30`

## 2026-05-10（夜13）

### PC表示の右余白バグを正しく修正

- 根本原因：`#app`（1280px）の内側で サイドバー200px ＋ `#content`（max-width: 880px）= 1080px しか埋まらず、残り200pxが `#app` 背景色（#111318）として右に見えていた
- 修正：`#app` を `max-width: 1280px; width: 100%` に戻し、`#content` の `max-width: 880px` を削除。`#content { flex: 1 }` が `#app` 内の残り幅を全部埋める
- `style.css?v=28` → `v=29`、SW `v28` → `v29`

## 2026-05-10（夜12・修正2）

### #appの全幅表示を正しく修正（flex:1に変更）

- `width: 100%` は flex コンテナ内で親幅が不確定な場合に循環参照になる
- `flex: 1; min-width: 0` に変更することで余剰スペースを確実に占有
- `max-width: none` はモバイルの430px上限打ち消しとして維持
- `style.css?v=27` → `v=28`、SW `v27` → `v28`

---

## 2026-05-10（夜12・修正）

### PCで#appが430px幅になるバグを修正

- 前のコミットで `max-width: 1280px` を削除した結果、ベースCSSの `max-width: 430px`（SP用）がPC表示にも効いてしまった
- PCメディアクエリで `max-width: none` を明示してSP用の430px上限を打ち消す
- `style.css?v=26` → `v=27`、SW `v26` → `v27`

---

## 2026-05-10（夜12）

### PC表示で#appが全幅を使うよう修正

- PCメディアクエリの `#app` から `max-width: 1280px` を削除
- `width: 100%` のみで全幅表示。右余白が消えサイドバー＋左ペイン＋右ペインでブラウザ全幅を使う
- `style.css?v=25` → `v=26`、SW `v25` → `v26`

---

## 2026-05-10（夜11）

### 記録3画面 PC幅拡大・メモ拡大・履歴メモ改行対応・SPトグル高さ調整

- `#app` max-width 1080px → 1280px（左ペインの横スクロール解消）
- `.s3-main-col` 左ペイン幅 400px → 480px
- `.wa-ex-hist-memo` に `white-space: pre-wrap` 追加（`.wa-prev-memo` と同様の対応）
- PC メモ欄 min-height 110px → 220px（2倍）、SP は変更なし
- SP 履歴トグルの padding 11px → 17px（1.5倍）
- `style.css?v=24` → `v=25`、SW `v24` → `v25`

---

## 2026-05-10（夜10）

### 記録3画面にPC用2カラムレイアウト（右ペイン：履歴）を追加

- **レイアウト**: `#s3-body` を `.s3-content-wrap` で包み、右に `.s3-hist-panel` を追加
- **PC（640px以上）**: flex-direction: row で横並び。左400px固定（記録エリア）、右は残り幅（履歴）
- **SP**: 履歴パネルは折りたたみトグル。開いた時点で初めてAPIを取得（`loadS3Hist`）
- **前回データブロック廃止**: `buildPrevBoxHtml` を `renderS3Body` から除去。累計セット数・前日からN日は右ペインの `s3-hist-stats` に表示
- **共通描画ヘルパー追加**: `appendExHistItems(dates, unit, container, idPrefix)` - 履歴タブと右ペインで共有
- **履歴タブ側**: `renderHistExDetail` を共通ヘルパーを使うよう整理。IDプレフィックスを `exh-h-` に変更（右ペインとの重複回避）
- **右ペイン履歴**: `loadS3Hist(append)` + `resetS3HistPanel()` + もっと見るボタン対応
- **メモ欄拡大**: rows 2→4、PCでは min-height: 110px、font-size: 15px
- `style.css?v=23` → `v=24`、`app.js?v=15` → `v=16`、SW `v23` → `v24`

---

## 2026-05-10（夜9）

### セット追加時にメモ・怪我メモが消えるバグを修正

- **原因**: `renderS3Body` が `body.innerHTML = html` で画面全体を再描画するため、入力済みのtextarea値が失われていた
- **修正**: 再描画前に `ex-memo`・`injury-memo`・`injury-site`・`injury-level`・怪我セクション開閉状態を変数に退避し、`innerHTML` 置換後に復元
- インターバル値は既に `S.s3Interval` で退避済みだったが、メモ系は未対応だった
- `app.js?v=14` → `v=15`、SW `workoutlog2-v22` → `v23`

---

## 2026-05-10（夜8）

### メモ欄を縦方向にリサイズ可能に

- `.wa-memo-input` の `resize: none` → `resize: vertical`
- 画面3の怪我メモ・自由記述、終了画面の感想、セッション編集モーダルの感想が対象
- 角丸スタイルは維持

---

## 2026-05-10（夜7）

### 前回メモの改行を表示に反映

- `.wa-prev-memo` に `white-space: pre-wrap` を追加
- スプレッドシートで改行されたメモが画面3の「前回のメモ」にも改行表示される

---

## 2026-05-10（夜6）

### キャッシュバスター更新

- `style.css?v=20` → `v=21`、`app.js?v=13` → `v=14`
- SW キャッシュ名 `workoutlog2-v19` → `v=20`
- 画面3に遷移しないバグ（SW が古いファイルをキャッシュしていたことが原因）

---

## 2026-05-10（夜5）

### 画面2・3のヘッダー日付フォーマット変更と開始時刻表示追加

- `todayDisplay()` を `YYYY年M月D日（曜）` 形式に変更（年を追加）
- 画面3ヘッダーの `s3-start-time`（「HH:mm 開始」）→ `s3-date`（日付）に変更
- 画面2・3の経過時間バーに「（HH:mm開始）」ラベルを追加（`wa-start-time-label`）
- `wa-timer-group` クラスを追加し s3 info-bar 内の経過時間 spacing を s2 と統一（gap: 8px）
- `wa-header-title` に `min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap` を追加（長い種目名を省略）
- `wa-date` に `flex-shrink:0; white-space:nowrap` を追加（日付が折り返さないよう）

---

## 2026-05-10（夜4）

### 画面3のインターバル入力を前回データ〜ウォームアップの間に移動

- `wa-info-bar` からインターバル行を削除（経過時間のみに）
- `S.s3Interval` を追加してインターバル値を状態管理
- `renderS3Body()` の先頭で既存DOM値を `S.s3Interval` に退避してから再描画
- `buildPrevBoxHtml()` の直後に `.wa-interval-in-body` としてインターバル行を挿入
- `enterEx()` では `S.s3Interval = interval` にセット（DOM直書きをやめた）

---

## 2026-05-10（夜3）

### 画面2の経過時間を左寄せに統一

- `wa-timer-bar` の `justify-content: space-between` を削除し `gap: 8px` に変更
- 「経過時間」ラベルと「00:00」が画面3と同様に左側にまとまって表示される

---

## 2026-05-10（夜2）

### ヘッダー左余白を詰め、戻るボタンとタイトルの間隔を調整

- `wa-header` の左 padding: 20px → 12px（PC: 28px → 16px）
- `wa-header-row` の gap: 14px → 19px（ボタン〜タイトル間を5px追加）

---

## 2026-05-10（夜）

### 戻るボタンのUI改善

- `border: 1px solid #2e3244` + `border-radius: 6px` で枠付きボタンに
- `padding: 2px 4px` → `7px 11px` でタップ領域を拡大
- `wa-header-row` の `gap: 10px` → `14px` でタイトルとの間隔を広げる
- タイトルは左寄せのまま維持

---

## 2026-05-10

### 記録3画面に経過時間を表示

- s3のinfo-bar左端「開始済み」を「経過時間 + 緑数字」に置き換え
- `.wa-timer-label` / `.wa-timer-val` クラスをそのまま流用（s2と同デザイン）
- `updateTimer()` / `stopTimer()` に `s3-timer` 要素への更新を追加
- CSS変更なし

---

## 2026-05-09（夜4）

### s3前回表示のラベルを今日/過去で切り替え

- 最終記録日が今日 → 「本日」、過去 → 「前回」に変更
- セット表示・メモラベル両方に適用
- `daysSinceLast === 0` で判定

---

## 2026-05-09（夜3）

### スクロールバーをダークテーマに合わせてカスタマイズ

- トラック：`#111318`（アプリ背景色）
- サム：`#2e3244` → ホバーで `#4a5068`
- Chrome/Safari/Edge：`::-webkit-scrollbar` 系、Firefox：`scrollbar-width/color` で対応
- 幅6pxでスリムに

---

## 2026-05-09（夜2）

### 記録ボタンのホバー強調

- ホバー時の opacity を 0.82 → 0.6 に変更し視覚的な差を拡大

---

## 2026-05-09（夜）

### 記録済みボタンをクリックで取り消し可能に

- 記録済みボタンをクリックすると「このセットの記録を削除しますか？」確認ダイアログを表示
- OKで `recorded = false` / `recordedAt = null` に戻しボタンを未記録状態に復元
- 従来は記録済みでもクリックが通り `recordedAt` が上書きされるバグがあったため合わせて修正

---

## 2026-05-09（夕）

### 記録ボタンの色を再変更

- 通常（未記録）：黄緑ベタ塗り（`#d4f53c`）→ ホバーで少し暗く
- 記録済み：薄い黄緑（18%透明度）→ ホバーで明るく
- 経緯：通常時を薄緑にしたが、ベタ塗りのほうが「押してほしい」意図が明確なため再変更

---

## 2026-05-09（午後）

### PC表示改善（レスポンシブ）

**コンテンツ幅拡大・フォントスケールアップ**
- `#content max-width` を 680px → 880px に拡大（サイドバー200px + コンテンツ880px = 1080px フル活用）
- `.wa-modal max-width` も同様に更新
- デスクトップ用フォントサイズを全体的に15〜30%スケールアップ（ヘッダー・メニュー・統計・履歴・設定など）
- ヘッダー・ボディ・ボタンエリアのパディングを増加

**セット入力行の大型化**
- 重量・回数入力欄のフォント 22px → 30px、幅 64px → 82px
- セット番号・単位・×記号・ウォームアップ/メインラベルも比例してスケールアップ

**前回メモのフォント拡大**
- `.wa-prev-memo` / `sets` / `stats` をPC用にスケールアップ（12px → 15px 等）

**記録ボタンの幅を固定**
- PC表示で `flex:1` により横幅が広すぎた問題を解消
- `flex: none; width: 120px` で固定

**記録ボタンの色デザイン変更**
- 通常：薄い黄緑背景（18%透明度）+ 黄緑テキスト
- ホバー：55%透明度に跳ね上げてコントラスト強調
- 記録済み：黄緑ベタ塗り（`#d4f53c`）で完了を明確に表現

**PC記録タブのヘッダータイトルを「RECORD」に変更**
- サイドバーに「WORKOUT LOG2」が既出のため、コンテンツヘッダーは「RECORD」に差し替え
- CSS `::before` でテキストを上書き（HTML変更なし、スマホは影響なし）

### UX改善

**クイックグリッドからs3に直行**
- 記録トップのクイックグリッドで単発種目をタップした際、s2（種目リスト）を経由せずs3（セット入力）に直接遷移
- 変更前：s1 → s2（カーフレイズを再タップ） → s3 という2重タップが必要だった
- 変更後：s1 → s3 に直行。◀での戻り先はs2のまま（種目追加に対応）
- 実装：`startSingleFromGrid()` に `enterEx(0)` を1行追加するだけ（JSシングルスレッドのため画面フラッシュなし）

---

## 2026-05-09

### バグ修正

**履歴タブ：メニュー内訳のセット数が異常に多く表示されるバグ**
- 症状：履歴タブでメニューの内訳を展開すると、ありえない量のセットが表示される
- 原因：`session_id` は2026-05-07のコミット（`f2404c8`）で追加されたため、それ以前の旧データはrecordシートのcol16（session_id）が空。`getHistory` 内でレコードを `recMap` に格納するキーが `sid = ''` に統一されてしまい、現在ページに含まれる複数日付の旧レコードが全て `recMap['']` に集約された。session_id が空のセッションがその全レコードを受け取るため、セット数が大幅に膨らんだ
- 修正箇所：`gas/api.gs` `getHistory()`
  - レコード格納キー：`sid || (d + '|' + String(r[3] || ''))` — session_id が空の旧データは `日付|メニュー名` をキーに
  - セッション参照キー：`sess.sessionId || (sess.date + '|' + (sess.menu || ''))` — 同様にフォールバック
- 注意：旧データで同日・同メニューのセッションが複数ある場合は引き続き混在するが、session_id 追加以前からの本質的制約のため許容

### 機能追加・改善

**統計表示を単発・メニュー別の表形式に変更**
- 記録タブ・履歴タブ上部の統計（今日の記録・継続日数・累計記録）を単発とセットメニューで分けて表示
- UIは2行4列のCSSグリッドテーブル（外枠角丸、内側区切り線のみ）
- GASの `getStats()` を6値返却に変更（`singleToday/Streak/Total`、`menuToday/Streak/Total`）
- 単発/メニューの判定：`session_idあり && menu空` = 単発、それ以外 = メニュー
  - 旧Excelインポートデータは session_id なし・menu 空のため正しくメニュー扱いになる
  - GASで読み込むカラム数を3→9に拡張（session_id列まで必要なため）

**履歴タブ：種目名を黄緑色（#d4f53c）に変更・各テキストを1px拡大**
- 種目名：白 → 黄緑（ホバーで白に反転）
- メインセット：12px → 13px、ウォームアップ：11px → 12px、怪我・メモ：11px → 12px

**記録タブのタイトルを「WORKOUT LOG2」に修正**
- SPでは「WORKOUT LOG」になっていたのを「WORKOUT LOG2」に統一

**設定タブ「種目の管理」に絞り込み検索を追加**
- 履歴タブ・分析タブと同じ `wa-ex-search-wrap` UIを流用
- `S.exercises`（起動時ロード済み）をフロントでフィルタするため通信なし
- 画面を開くたびに検索欄をリセット

**部位アイコン：ふくらはぎ・カーフを🦵→🦶に変更**
- カーフレイズとスクワットが同じアイコンになっていた問題を解消
- スプレッドシートでカーフレイズの部位を「ふくらはぎ」に変更することで適用

---

## 2026-05-08（深夜）

### 設計変更

**`overflow: hidden` を html/body から削除**
- 変更前：`html, body { height: 100%; overflow: hidden; }`
- 変更後：`html, body { height: 100%; }`
- 目的：PWAスタンドアロンモードでのネイティブ pull-to-refresh を有効化
- 経緯：旧アプリ（workoutlog）は `overflow: hidden` なしでも正常動作・PTR有効なため、workoutlog2 でも不要と判断
- **レイアウト崩れが起きたらこの変更が原因の可能性あり**。その場合は `overflow: hidden` を戻し、カスタムPTR実装を検討する

---

## 2026-05-08（夜）

### 機能追加

**分析タブ：回数グラフを追加**
- 「最高回数推移（回）」「総回数推移（回）」の2チャートを追加
- GASの `getAnalysisData` に `totalReps` を追加
- 既存の重量・ボリュームグラフはそのまま残す（重量なし種目では空になるが仕様として許容）
- `S.analysisChartR` / `S.analysisChartTR` を追加し、種目切り替え時に破棄・再生成

**記録トップ画面の大幅刷新**
- 旧：メニュー一覧がメイン表示 ＋ 下部固定「単発記録」ボタン
- 新：直近5単発種目のクイックグリッド（2列×n行）＋ 右下に「単発記録」セル ＋ 下部固定「📋 セットメニュー」ボタン
- グリッドの種目セルをタップすると即その種目の記録へ（種目選択画面をスキップ）
- 旧メニュー一覧は新画面 `s1-menu` に移動、セットメニューボタンで遷移
- `startSingleFromGrid(name)` を追加（進行中セッションの確認ダイアログ含む）
- 部位→emoji マッピング `BODY_EMOJI` を実装（脚🦵、体幹🔥、背中🏋️ など）

**クイックグリッドに前回情報を表示**
- 各種目セルに「前回 4/19（日）（19日前）」形式のサブテキストを追加
- GASの `getRecentSingleExercises` を文字列配列 → `{name, lastDate, daysAgo}` オブジェクト配列に変更
- 日付列はすでに読み込み済みの行データから取得するため追加の通信なし

**統計表示（記録・履歴タブ共通）**
- 「今日の記録」「継続日数」「累計記録」の3統計を記録タブトップと履歴タブヘッダーに追加
- GASの `getInitialData` に `getStats()` を追加（セッションシートを1回スキャン）
- ネットワーク往復は増えない（既存の `getInitialData` に乗せる）
- セッション保存後のバックグラウンド再取得時にも統計を更新

**PWA化対応**
- `make_icons.swift` を作成：🏋️絵文字＋黄緑背景（#d4f53c）＋角丸（radius 20%）
- `icon-192.png` / `icon-512.png` を生成・追加
- `manifest.webmanifest` のアイコンに `"purpose": "any maskable"` を追加（Android対応）

---

### バグ修正

**履歴タブ：同日複数単発記録が混在するバグ**
- 症状：同日に2回単発記録すると、両セッションに全種目が表示される
- 原因：`getHistory` の記録→セッション紐付けキーが `date + '|' + menu` だったため、単発（menu=''）が同一キーになり混在
- 修正：キーを `session_id` に変更。記録シートのcol16（session_id）を読み込んでマッピング

---

## 2026-05-08

### 機能改善

**S2「トレーニングを終了する」ボタンの無効化**
- 1種目も完了していない状態では押せないように変更
- `renderS2()` で `hasAnyRecord` を判定し `disabled` + `opacity: 0.3` を設定

**S2「◀」ボタンでセッションキャンセル**
- S2（メニュー進行画面）の戻るボタンでセッションを中断してS1に戻れるように変更
- 1種目でも完了済みなら確認ダイアログを表示、未完了なら即座に戻る

**S3「この種目を完了→次の種目へ」ボタンの無効化**
- セットが1件も記録されていない状態では押せないように変更
- `updateCompleteBtn()` 関数を追加
- `renderS3Body()` と `onRecordSet()` の両方から呼び出すことで、セット記録直後に即座に有効化される

---

## 2026-05-07

### パフォーマンス改善

**GAS コールドスタート対策**
- `api.gs` に `warmup()` 関数を追加
- GAS管理画面のタイムトリガーで5分おきに実行することでランタイムをウォーム状態に保つ
- 設定手順：GASエディタ → トリガー → warmup / 時間主導型 / 5分おき / Head

**フロントエンドキャッシュ（app.js）**
- `S.s3ExCache` を追加：セッション内で同じ種目に2回目以降移動するとき即時表示
- セッション保存後の `getInitialData` をバックグラウンド化：「保存して終了」後の画面遷移を即時化（`menuLastDates` と `recentSingle` は後から非同期で更新）

**通信の安定化（app.js）**
- `gasGet` タイムアウトを 15秒 → 30秒 に延長
- `gasGetWithRetry()` を追加：失敗時に自動で1回リトライ
- 「もっと見る」失敗時に既存リストを消さず、ボタンを復活させる
- 「もっと見る」押下中に「読み込み中…」表示

---

### バグ修正

**「保存して終了」ボタンが2回目以降ずっと無効状態になるバグ**
- 原因：`saveSession()` でボタンを `disabled` にした後、画面遷移してもDOM上の状態がリセットされなかった
- 修正：`goFinish()` でボタンを毎回初期状態に戻すよう修正

**インターバル「0」が「90」に戻るバグ**
- 原因：`0 || 90` という書き方が `0` を falsy と扱い、`90` を返してしまう
- 修正箇所：
  - `app.js` `saveExModal`：`parseInt(...) || 90` → `isNaN(rawInterval) ? 90 : rawInterval`
  - `api.gs` `updateExercise` / `addExercise`：`d.defaultInterval || 90` → `d.defaultInterval ?? 90`
  - `api.gs` `getExercises`：`Number(r[2] || 90)` → `r[2] !== '' && r[2] !== null ? Number(r[2]) : 90`

---

### 機能改善・設計変更

**インターバル名称の統一**
- 「デフォルトインターバル（設定）」と「目標インターバル（記録）」という2つの名前を廃止
- 全画面で「インターバル（秒）」に統一

**記録完了時のインターバル自動更新**
- `completeEx()` で記録時のインターバルが変わっていたら種目マスターも自動更新（`updateExercise` を呼ぶ）
- これにより記録画面でインターバルを変えるだけで設定にも反映される

---

### 躓いた点・調査メモ

**種目マスターのインターバル編集が効かない問題**
- 症状：名前・部位などは保存できるが、インターバルだけ保存されない
- 調査に時間がかかった。スプレッドシートの数式・保護・列数など順に確認したがいずれも問題なし
- 最終的な原因：`0` のみ失敗しており、それ以外の値は正常に保存できていた
- 根本原因：`||` 演算子が `0` を falsy 扱いするバグ ＋ GASを修正後にデプロイし忘れていた

**GAS修正後はかならず新バージョンでデプロイが必要**
- `api.gs` を修正しても、GAS管理画面で「デプロイを管理 → 新しいバージョン」で更新しないと反映されない
- 既存のデプロイURLを変えずに更新する方法：デプロイを管理 → 鉛筆アイコン → 新しいバージョン → デプロイ
