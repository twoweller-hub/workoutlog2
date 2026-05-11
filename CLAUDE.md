# workoutlog2 — Claude向けプロジェクトコンテキスト

## 開発ログ

**セッション開始時に必ず `docs/dev-log.md` を読む。** 開発経緯・設計判断・バグ修正の背景を把握するため。

## コミットルール

コードを修正・追加したら必ずコミットする。Push はユーザーが行うため Claude は行わない。コミットメッセージは日本語で書く。

**コミットには必ず `docs/dev-log.md` への追記を含める。** コードと同じコミットに入れること。ユーザーが明示的に「記録して」と言った場合は未記録分をまとめて追記する。

## プロジェクト概要

自重トレーニング記録 PWA。フロントエンドは静的ファイル（GitHub Pages等）、バックエンドは Google Apps Script（GAS）+ Google Sheets。

## 重要な設定値

| 項目 | 値 |
|------|-----|
| GAS URL | `https://script.google.com/macros/s/AKfycbzfXMbAScXVYktNKv44qVu7tdQgjMoDFeRdx4zcJ7AZy6q47zl9VxRadfg6oSj4pzoH9Q/exec` |
| スプレッドシートID | `1jrzmBbfhMSMSLmnt08D64z6AOTR-L0VDJQx_tuu60sQ` |

## ファイル構成

```
workoutlog2/
├── index.html          # PWA ルート
├── app.js              # 全フロントエンドロジック（単一ファイル）
├── style.css           # 全スタイル
├── sw.js               # Service Worker（network-first for html/css/js）
├── manifest.webmanifest
├── icon-192.png / icon-512.png
├── gas/
│   └── api.gs          # GAS バックエンド（全APIはここ）
└── docs/
    └── document.md     # 人間向け仕様書
```

## Google Sheets シート構成

### 記録シート（SHEET_RECORDS）
| col | 内容 |
|-----|------|
| 1 (A) | ID（連番） |
| 2 (B) | 日付 |
| 3 (C) | 時刻 |
| 4 (D) | メニュー名（単発は空文字） |
| 5 (E) | 種目名 |
| 6 (F) | セット種別（'ウォームアップ' or 'メイン'） |
| 7 (G) | セット番号 |
| 8 (H) | サイド（'右' / '左' / ''） |
| 9 (I) | 重量（kg） |
| 10 (J) | 回数／秒数 |
| 11 (K) | 目標インターバル（秒） |
| 12 (L) | 怪我部位 |
| 13 (M) | 怪我レベル |
| 14 (N) | 怪我メモ |
| 15 (O) | メモ |
| 16 (P) | **session_id**（フロントで生成、`'sid_' + Date.now()`） |

### セッションシート（SHEET_SESSIONS）
| col | 内容 |
|-----|------|
| 1 | ID（連番） |
| 2 | 日付 |
| 3 | メニュー名（単発は空文字） |
| 4 | 開始時刻 |
| 5 | 終了時刻 |
| 6 | コンディション（好調/普通/不調） |
| 7 | 満足度（よくできた/まあまあ/いまいち） |
| 8 | 感想コメント |
| 9 | **session_id** |

### 種目マスター（SHEET_EXERCISES）
| col | 内容 |
|-----|------|
| 1 | 種目名 |
| 2 | 単位（回 / 秒） |
| 3 | デフォルトインターバル（秒） |
| 4 | 部位 |
| 5 | メイン器具 |
| 6 | サブ器具 |
| 7 | 左右区別（あり / なし） |

### メニューシート（SHEET_MENUS）
| col | 内容 |
|-----|------|
| 1 | メニュー名 |
| 2 | 順番 |
| 3 | 種目名 |

1メニュー = 複数行。メニューに属する種目の数だけ行が存在する。

### 怪我部位マスター（SHEET_INJURIES）
- col 1: 部位名

## 重要なコーディング規約

### menuDisplay / menuStorage
```javascript
menuDisplay(name)   // → 'チェストメニュー'  (表示用: 'メニュー' を付与)
menuStorage(name)   // → 'チェスト'          (保存用: 'メニュー' を除去)
```
- DBとAPI間は **storage名**（'メニュー'なし）
- UI表示は **display名**（'メニュー'あり）

### session_id
- フロントエンドで生成: `'sid_' + Date.now()`
- `startSession()` と `startSingle()` 両方で生成
- 記録シートのcol 16とセッションシートのcol 9に同じ値が入る
- カスケード削除でセッション削除時に記録も一括削除するために使用

### fmtTime（GASのUTCバグ修正済み）
```javascript
function fmtTime(val) {
  if (!val && val !== 0) return '';
  return typeof val.getTime === 'function'
    ? Utilities.formatDate(val, 'UTC', 'HH:mm')  // ← 'Asia/Tokyo' は使わない！
    : String(val);
}
```
Google Sheetsの時刻はUTC day fractionとして格納されており、`'Asia/Tokyo'`を使うと+9時間されてしまう。

## API パターン

### GET（JSONP）
```javascript
gasGet({ action: 'getInitialData' })
gasGet({ action: 'getExerciseData', exercise: '...名前...' })
gasGet({ action: 'getHistory', offset: 0 })
gasGet({ action: 'getExerciseHistory', exercise: '...', offset: 0 })
gasGet({ action: 'getAnalysisData', exercise: '...' })
gasGet({ action: 'getExercisesWithLastDate' })
```

### POST（no-cors、レスポンス不要）
```javascript
gasPost({ action: 'saveSets',             date, exercise, menu, sets, sessionId })
gasPost({ action: 'saveSession',          date, menu, startTime, endTime, condition, satisfaction, comment, sessionId })
gasPost({ action: 'updateSession',        id, condition, satisfaction, comment })
gasPost({ action: 'deleteSession',        id, sessionId })  // cascade delete records
gasPost({ action: 'updateExerciseRecords',date, menu, exercise, sets, sessionId })
gasPost({ action: 'addExercise',          name, unit, defaultInterval, bodyPart, hasSides })
gasPost({ action: 'updateExercise',       name, oldName, unit, defaultInterval, bodyPart, hasSides })  // cascade rename
gasPost({ action: 'deleteExercise',       name })
gasPost({ action: 'addMenu',              name })
gasPost({ action: 'deleteMenu',           name })
gasPost({ action: 'addMenuExercise',      menu, exercise })
gasPost({ action: 'removeMenuExercise',   menu, exercise })
gasPost({ action: 'reorderMenuExercises', menu, exercises: [...] })
gasPost({ action: 'addInjurySite',        name })
gasPost({ action: 'updateInjurySite',     oldName, newName })
gasPost({ action: 'deleteInjurySite',     name })
```

## フロントエンド状態管理

```javascript
const S = {
  exercises: [],        // 種目マスター
  menus: [],            // メニュー一覧
  injurySites: [],      // 怪我部位マスター
  menuLastDates: {},    // {menuStorageName: {date, daysAgo}}
  recentSingle: [],     // 直近の単発記録（5件）
  activeTab: 'record',
  recordScreen: 's1',
  settingsScreen: 's-top',
  session: null,        // {sessionId, menu, menuDisplay, startTime, exercises:[{name, done, sets:[]}]}
  currentExIdx: null,
  timerInterval: null,
  timerStart: null,
  s3ExData: null,       // getExerciseData の結果
  s3Sections: [],       // [{side, warmup:[{weight,reps,recorded,recordedAt}], main:[...]}]
  histDateOffset: 0,
  histDateItems: [],
  histDateHasMore: false,
  histExWithLastDate: null,
  histCurrentEx: null,
  histFromSession: null,
  histExOffset: 0,
  histExItems: [],
  histExHasMore: false,
  analysisExList: null,
  analysisExercise: null,
  analysisChartW: null,
  analysisChartV: null,
  currentMenu: null,
  sortable: null,
  editingExName: null,
  editingInjuryOld: null,
  editingSession: null,   // セッション編集モーダル用
  editingRecord: null,    // 記録編集モーダル用
  confirmCb: null,
};
```

## UI / デザイントークン

| 変数 | 値 | 用途 |
|------|-----|------|
| bg | `#111318` | アプリ背景 |
| surface | `#1c1f2a` | カード・モーダル背景 |
| accent | `#d4f53c` | ボタン・ハイライト |
| text-sub | `#b0b8c8` | サブテキスト |

- z-index: 通常モーダル `200`、確認ダイアログ(`#modal-confirm`) `210`（編集モーダルの上に出るため）
- フォント: Bebas Neue（見出し）、Noto Sans JP（本文）

## Service Worker

- キャッシュ名: `workoutlog2-v2`（バージョンを変えるとキャッシュが強制クリアされる）
- HTML/CSS/JS → **network-first**（取得失敗時のみキャッシュから返す）
- 画像・マニフェスト → **cache-first**
- GAS（`script.google.com`）→ **キャッシュしない**

## キャッシュバスター

`index.html` の読み込み: `style.css?v=2` / `app.js?v=4`  
変更が反映されない場合は `?v=N` を上げ、`sw.js` の `CACHE` 名も変更する。

**`style.css` または `app.js` を変更したコミットには必ずキャッシュバスターの更新を含める。**
- `style.css` 変更時 → `index.html` の `style.css?vN` を +1、`sw.js` の `CACHE` 名を +1
- `app.js` 変更時 → `index.html` の `app.js?vN` を +1、`sw.js` の `CACHE` 名を +1
- 両方変更時 → 両方 +1、`CACHE` 名は1回だけ +1

## 分析チャート

- Chart.js 4.4.0 を CDN から読み込み
- X軸ラベルは全て `YYYY/M/D` 形式（年を省略しない）
- `ticks.callback` での年表示は SW キャッシュ問題でうまく動かなかった経緯あり
- SortableJS 1.15.2 でメニュー内種目の並び替えに使用

## カスケード処理まとめ

| 操作 | カスケード |
|------|-----------|
| セッション削除 | 同一 session_id の記録シート行も全削除 |
| 種目名変更 | 記録シート col5、メニューシート col3 を全行更新 |
| 記録削除（種目単位） | session_id で対象行を特定・削除し、新セットを再挿入 |

## 注意点・過去のバグ

- **時刻+9時間バグ**: GASの `fmtTime` で `'Asia/Tokyo'` → `'UTC'` に修正済み
- **確認ダイアログが背面に隠れる**: `#modal-confirm` に `z-index: 210` で修正済み
- **CSS変更が反映されない**: SW が古いファイルをキャッシュ。`?vN` とCACHE名変更で対処
- **単発記録削除後にセッション行に時刻が残る**: 種目がない場合のセッション表示は時刻のみ表示されるが仕様として許容

## Obsidianメモ

ユーザーが「Obsidianにメモして」と言ったら `docs/SKILL.md` を読んでその手順に従う。
