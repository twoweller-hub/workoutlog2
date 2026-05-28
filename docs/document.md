# workoutlog2 アプリ仕様書

## 概要

筋トレ記録 PWA（Progressive Web App）。  
フロントエンドは HTML/CSS/JS の静的ファイル。バックエンドは Google Apps Script + Google Sheets。  
スマホへのホーム画面追加により、ネイティブアプリに近い UX を実現する。

---

## アーキテクチャ

```
[ブラウザ / PWA]
    ↕ JSONP GET（読み取り）
    ↕ fetch POST no-cors（書き込み）
[Google Apps Script (GAS)]
    ↕ SpreadsheetApp
[Google Sheets（データストア）]
```

- GET: JSONP（script タグ注入）→ クロスオリジン制約を回避してレスポンスを受け取れる
- POST: `mode: 'no-cors'` → レスポンスは受け取れないが書き込みは成功する
- Service Worker によりオフライン閲覧（過去データの参照）が可能

---

## 画面構成（タブ）

### 記録タブ（record）
| 画面ID | 内容 |
|--------|------|
| s1 | メニュー選択（前回実施日表示付き） |
| s1-single | 単発記録用 種目選択 |
| s2 | セッション中の種目リスト（チェックリスト） |
| s3 | 種目の入力画面（セット・重量・回数の入力） |
| sFinish | トレーニング完了画面（コンディション・満足度・感想） |

**フロー（メニュー記録）**: s1 → s2 → s3（種目ごと繰り返し） → sFinish  
**フロー（単発記録）**: s1-single → s2 → s3 → sFinish

### 履歴タブ（history）
- **日付軸ビュー**: セッション単位で新しい順に表示。種目ごとのセットが折りたたまれた形で確認可能
  - セッション編集ボタン：コンディション・満足度・感想を後から編集、セッション削除
  - 種目行の編集ボタン：セット内容を後から編集、その種目の記録を全削除
- **種目軸ビュー**: 種目ごとに日付順で履歴を表示

### 分析タブ（analysis）
- 種目を選択すると最高重量・ボリューム（重量×回数）の推移グラフを表示
- Chart.js 使用、X軸は `YYYY/M/D` 形式（年省略なし）
- 統計：最高重量、累計ボリューム、最多セット数

### 設定タブ（settings）
- **種目管理**: 追加・編集（名前変更は記録・メニューにカスケード更新）・削除
- **メニュー管理**: メニューの追加・削除、メニュー内の種目追加・削除・並び替え（SortableJS）
- **怪我部位管理**: 追加・編集・削除

---

## データ構造（Google Sheets）

### 記録シート
各セット1行。1種目で複数セットある場合は複数行に渡る。

| 列 | フィールド | 例 |
|----|-----------|-----|
| A | ID | 1, 2, 3... |
| B | 日付 | 2026-05-07 |
| C | 時刻 | 11:51 |
| D | メニュー名 | チェスト（単発は空） |
| E | 種目名 | ダンベルプレス |
| F | セット種別 | ウォームアップ / メイン |
| G | セット番号 | 1, 2, 3... |
| H | サイド | 右 / 左 / （空） |
| I | 重量(kg) | 20 |
| J | 回数 or 秒数 | 10 |
| K | 目標インターバル(秒) | 90 |
| L | 怪我部位 | 肩 |
| M | 怪我レベル | 違和感 / 支障あり / 中断レベル |
| N | 怪我メモ | 自由記述 |
| O | メモ | 自由記述 |
| P | session_id | sid_1746600000000 |

### セッションシート
1セッション1行。

| 列 | フィールド | 例 |
|----|-----------|-----|
| A | ID | 1, 2, 3... |
| B | 日付 | 2026-05-07 |
| C | メニュー名 | チェスト（単発は空） |
| D | 開始時刻 | 09:00 |
| E | 終了時刻 | 10:30 |
| F | コンディション | 好調 / 普通 / 不調 |
| G | 満足度 | よくできた / まあまあ / いまいち |
| H | 感想 | 自由記述 |
| I | session_id | sid_1746600000000 |

### session_id について
- フロント側で `'sid_' + Date.now()` として生成（ミリ秒タイムスタンプ）
- セッション開始時（`startSession` / `startSingle`）に決定し、S.session.sessionId として保持
- 記録シート col P とセッションシート col I に同じ値を保存
- カスケード削除: セッション削除時に、同一 session_id を持つ記録行を全削除

### メニューシート
1種目1行（1メニュー＝複数行）。

| 列 | 内容 |
|----|------|
| A | メニュー名（'メニュー' なし。例: 'チェスト'） |
| B | 表示順番 |
| C | 種目名 |

### 種目マスターシート

| 列 | 内容 |
|----|------|
| A | 種目名 |
| B | 単位（回 / 秒） |
| C | デフォルトインターバル（秒） |
| D | 部位 |
| E | メイン器具 |
| F | サブ器具 |
| G | 左右区別（あり / なし） |

### 怪我部位マスターシート
- A列: 部位名のみ

---

## 命名規則

### メニュー名のDisplay/Storage変換

| 種別 | 形式 | 例 |
|------|------|-----|
| Storage（DB・API） | 'メニュー' なし | 'チェスト' |
| Display（UI表示） | 'メニュー' あり | 'チェストメニュー' |

```javascript
menuDisplay('チェスト')        // → 'チェストメニュー'
menuStorage('チェストメニュー') // → 'チェスト'
```

GAS（api.gs）内でのメニュー名はすべてStorage形式で処理する。  
フロントの `S.menus[].name` もStorage形式。UIへの表示時のみDisplayに変換。

---

## GAS API仕様

### GET（JSONP）

#### getInitialData
アプリ起動時に1回呼ぶ。マスターデータ一式を返す。
```json
{
  "exercises": [...],
  "menus": [...],
  "injurySites": [...],
  "menuLastDates": {},
  "recentSingle": [...]
}
```

#### getExerciseData
種目入力画面（s3）入場時に呼ぶ。前回データを取得。
```
?action=getExerciseData&exercise=種目名
```
```json
{
  "lastDate": "2026-04-01",
  "lastSets": [...],
  "lastMemo": "",
  "totalMainSets": 45,
  "daysSinceLast": 7
}
```

#### getHistory
履歴タブ（日付軸）のページング取得。
```
?action=getHistory&offset=0
```
```json
{
  "sessions": [
    {
      "id": 1,
      "date": "2026-05-07",
      "menu": "チェスト",
      "startTime": "09:00",
      "endTime": "10:30",
      "condition": "好調",
      "satisfaction": "よくできた",
      "comment": "",
      "sessionId": "sid_1746600000000",
      "exercises": {
        "ダンベルプレス": [ {...sets} ]
      }
    }
  ],
  "hasMore": true
}
```

#### getExerciseHistory
種目軸ビューの履歴。
```
?action=getExerciseHistory&exercise=種目名&offset=0
```

#### getAnalysisData
分析グラフ用データ。
```
?action=getAnalysisData&exercise=種目名
```
```json
{
  "data": [
    { "date": "2026-01-01", "maxWeight": 30, "maxReps": 10, "totalVolume": 900, "totalSets": 3 }
  ]
}
```

#### getExercisesWithLastDate
履歴タブ種目軸ビューの一覧用。
```
?action=getExercisesWithLastDate
```

### POST（no-cors、書き込みのみ・レスポンス無視）

#### saveSets
種目完了時にセット一覧を保存。
```json
{
  "action": "saveSets",
  "date": "2026-05-07",
  "menu": "チェスト",
  "exercise": "ダンベルプレス",
  "sessionId": "sid_1746600000000",
  "sets": [
    { "time": "09:15", "type": "メイン", "setNum": 1, "side": "", "weight": 20, "reps": 10, "memo": "" }
  ]
}
```

#### saveSession
sFinish画面の「保存して終了」押下時。
```json
{
  "action": "saveSession",
  "date": "2026-05-07",
  "menu": "チェスト",
  "startTime": "09:00",
  "endTime": "10:30",
  "condition": "好調",
  "satisfaction": "よくできた",
  "comment": "調子良かった",
  "sessionId": "sid_1746600000000"
}
```

#### updateSession / deleteSession
履歴タブからセッションを編集・削除。
```json
{ "action": "updateSession", "id": 1, "condition": "普通", "satisfaction": "まあまあ", "comment": "" }
{ "action": "deleteSession", "id": 1, "sessionId": "sid_1746600000000" }
```
deleteSession は session_id が一致する記録シートの行も全削除する。

#### updateExerciseRecords
履歴タブから種目の記録を編集・削除。
- session_id が一致する記録行を全削除し、新しいセットを再挿入する
- session_id がない（旧データ）場合は date + menu の組み合わせでフォールバック
```json
{
  "action": "updateExerciseRecords",
  "date": "2026-05-07",
  "menu": "チェスト",
  "exercise": "ダンベルプレス",
  "sessionId": "sid_1746600000000",
  "sets": [...]
}
```

#### updateExercise（カスケード更新）
種目名を変更すると記録シート・メニューシートも全行更新する。
```json
{
  "action": "updateExercise",
  "name": "新しい種目名",
  "oldName": "元の種目名",
  "unit": "回",
  "defaultInterval": 90,
  "bodyPart": "胸",
  "hasSides": false
}
```

---

## Service Worker（sw.js）

| リソース種別 | キャッシュ戦略 |
|------------|--------------|
| HTML / CSS / JS | Network-first（失敗時はキャッシュから） |
| 画像・マニフェスト | Cache-first |
| `script.google.com` | キャッシュしない |

現在のキャッシュ名: `workoutlog2-v2`  
キャッシュバスター: `style.css?v=2`、`app.js?v=4`

---

## デプロイ手順

### フロントエンド
1. `index.html` / `app.js` / `style.css` / `sw.js` を変更
2. `index.html` 内の `?vN` を更新（CSS/JS）
3. `sw.js` の `CACHE` 名を更新（例: `workoutlog2-v3`）
4. GitHub Pages など静的ホスティングにデプロイ

### GAS バックエンド
1. Google Apps Script エディタで `gas/api.gs` を編集
2. デプロイ → 新バージョンとしてデプロイ（既存のURLを維持）
3. URLが変わった場合は `app.js` の `GAS_URL` を更新

---

## PWAインストール手順

### アプリURL
```
https://twoweller-hub.github.io/workoutlog2/
```

### Android（Chrome）でホーム画面に追加する方法
1. 上記URLをChromeで開く
2. 右上のメニュー（⋮）→「ホーム画面に追加」をタップ
3. 名前を確認して「追加」

### 再インストールが必要な場合
1. ホーム画面のアイコンを長押し →「アンインストール」
2. 上記URLをChromeで開いて再度インストール

---

## 既知の技術的注意点

### 時刻の取り扱い
Google Sheetsに時刻を保存すると、GASが読み出す際にUTC基準のDateオブジェクトになる。  
`Utilities.formatDate(val, 'Asia/Tokyo', 'HH:mm')` とすると+9時間された値が返ってしまうため、  
**必ず `'UTC'` を使用する**。

```javascript
// NG（+9時間になる）
Utilities.formatDate(val, 'Asia/Tokyo', 'HH:mm')

// OK
Utilities.formatDate(val, 'UTC', 'HH:mm')
```

### 確認ダイアログの重なり
編集モーダル（`#modal-record-edit`, `#modal-session-edit`）が z-index: 200 で開いているとき、  
削除確認ダイアログ（`#modal-confirm`）が背面に隠れてしまう問題があった。  
`#modal-confirm { z-index: 210 }` で解決済み。

### 分析チャートのX軸ラベル
Chart.js の `maxTicksLimit` により年変わり目のラベルが省略されることがあった。  
全ラベルを `YYYY/M/D` 形式にすることで解決。

---

## 外部ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| Chart.js | 4.4.0 | 分析グラフ |
| SortableJS | 1.15.2 | メニュー内種目の並び替え |
