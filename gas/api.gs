const SPREADSHEET_ID = '1jrzmBbfhMSMSLmnt08D64z6AOTR-L0VDJQx_tuu60sQ';

const SHEET_RECORDS  = '記録';
const SHEET_SESSIONS = 'セッション';
const SHEET_EXERCISES= '種目マスター';
const SHEET_MENUS    = 'メニュー';
const SHEET_INJURIES = '怪我部位マスター';

// ============================================================
//  warmup（タイムトリガーで5分おきに呼ぶ → コールドスタート防止）
// ============================================================
function warmup() {
  SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ============================================================
//  doGet（JSONP）
// ============================================================
function doGet(e) {
  const cb     = e.parameter.callback || 'callback';
  const action = e.parameter.action   || 'getInitialData';
  try {
    let data;
    switch (action) {
      case 'getInitialData':
        data = getInitialData(); break;
      case 'getExerciseData':
        data = getExerciseData(e.parameter.exercise); break;
      case 'getExercisesWithLastDate':
        data = getExercisesWithLastDate(); break;
      case 'getHistory':
        data = getHistory(parseInt(e.parameter.offset || '0')); break;
      case 'getExerciseHistory':
        data = getExerciseHistory(e.parameter.exercise, parseInt(e.parameter.offset || '0')); break;
      case 'getAnalysisData':
        data = getAnalysisData(e.parameter.exercise); break;
      default:
        data = { error: 'Unknown action: ' + action };
    }
    return jsonp(cb, data);
  } catch (err) {
    return jsonp(cb, { error: err.message });
  }
}

// ============================================================
//  doPost
// ============================================================
function doPost(e) {
  try {
    const d      = JSON.parse(e.postData.contents);
    const action = d.action;
    switch (action) {
      case 'saveSets':             return saveSets(d);
      case 'saveSession':          return saveSession(d);
      case 'addExercise':          return addExercise(d);
      case 'updateExercise':       return updateExercise(d);
      case 'deleteExercise':       return deleteExercise(d);
      case 'addMenu':              return addMenu(d);
      case 'deleteMenu':           return deleteMenu(d);
      case 'addMenuExercise':      return addMenuExercise(d);
      case 'removeMenuExercise':   return removeMenuExercise(d);
      case 'reorderMenuExercises': return reorderMenuExercises(d);
      case 'addInjurySite':        return addInjurySite(d);
      case 'updateInjurySite':     return updateInjurySite(d);
      case 'deleteInjurySite':     return deleteInjurySite(d);
      case 'updateSession':          return updateSession(d);
      case 'deleteSession':          return deleteSession(d);
      case 'updateExerciseRecords':  return updateExerciseRecords(d);
      default: return errorRes('Unknown action: ' + action);
    }
  } catch (err) {
    return errorRes(err.message);
  }
}

// ============================================================
//  getInitialData（アプリ起動時に1回呼ぶ）
// ============================================================
function getInitialData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    exercises:     getExercises(ss),
    menus:         getMenus(ss),
    injurySites:   getInjurySites(ss),
    menuLastDates: getMenuLastDates(ss),
    recentSingle:  getRecentSingleExercises(ss)
  };
}

// ============================================================
//  マスターデータ取得
// ============================================================
function getExercises(ss) {
  const rows = ss.getSheetByName(SHEET_EXERCISES).getDataRange().getValues();
  return rows.slice(1).filter(r => r[0]).map(r => ({
    name:            String(r[0]),
    unit:            String(r[1] || '回'),
    defaultInterval: r[2] !== '' && r[2] !== null ? Number(r[2]) : 90,
    bodyPart:        String(r[3] || ''),
    mainEquipment:   String(r[4] || ''),
    subEquipment:    String(r[5] || ''),
    hasSides:        String(r[6] || 'なし') === 'あり'
  }));
}

function getMenus(ss) {
  const rows = ss.getSheetByName(SHEET_MENUS).getDataRange().getValues();
  const map  = {};
  rows.slice(1).forEach(r => {
    if (!r[0]) return;
    const name = String(r[0]);
    if (!map[name]) map[name] = [];
    map[name].push({ order: Number(r[1]), exercise: String(r[2] || '') });
  });
  return Object.keys(map).map(name => ({
    name,
    exercises: map[name]
      .filter(e => e.exercise)
      .sort((a, b) => a.order - b.order)
      .map(e => e.exercise)
  }));
}

function getInjurySites(ss) {
  const rows = ss.getSheetByName(SHEET_INJURIES).getDataRange().getValues();
  return rows.slice(1).filter(r => r[0]).map(r => String(r[0]));
}

// ============================================================
//  各メニューの前回実施日（画面1のメニューリスト用）
// ============================================================
function getMenuLastDates(ss) {
  const rows  = ss.getSheetByName(SHEET_SESSIONS).getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const map   = {};

  rows.slice(1).forEach(r => {
    if (!r[0]) return;
    const menu = String(r[2] || '');
    if (!menu) return;
    const d = fmtDate(r[1]);
    if (!map[menu] || d > map[menu]) map[menu] = d;
  });

  const todayMs = new Date(today).getTime();
  const result  = {};
  Object.keys(map).forEach(menu => {
    const daysAgo = Math.round((todayMs - new Date(map[menu]).getTime()) / 86400000);
    result[menu] = { date: map[menu], daysAgo };
  });
  return result;
}

// ============================================================
//  最近の単発種目5件（単発記録の候補表示用）
// ============================================================
function getRecentSingleExercises(ss) {
  const sheet   = ss.getSheetByName(SHEET_RECORDS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const startRow = Math.max(2, lastRow - 500);
  const numRows  = lastRow - startRow + 1;
  const rows     = sheet.getRange(startRow, 1, numRows, 5).getValues();

  const seen   = new Set();
  const result = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const menu   = String(rows[i][3] || '');
    const exName = String(rows[i][4] || '');
    if (menu === '' && exName && !seen.has(exName)) {
      seen.add(exName);
      result.push(exName);
      if (result.length >= 5) break;
    }
  }
  return result;
}

// ============================================================
//  種目の前回データ取得（画面3入場時）
// ============================================================
function getExerciseData(exerciseName) {
  if (!exerciseName) return { error: 'exerciseName required' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const last  = sheet.getLastRow();
  if (last < 2) return { lastDate: null, lastSets: [], lastMemo: '', totalMainSets: 0, daysSinceLast: null };

  const rows  = sheet.getRange(2, 1, last - 1, 15).getValues();
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  let lastDate      = null;
  let totalMainSets = 0;
  const exRows      = [];

  rows.forEach(r => {
    if (!r[0] || String(r[4]) !== exerciseName) return;
    const d = fmtDate(r[1]);
    if (String(r[5]) === 'メイン') totalMainSets++;
    if (!lastDate || d > lastDate) lastDate = d;
    exRows.push({
      date:    d,
      setType: String(r[5]),
      setNum:  Number(r[6]),
      side:    String(r[7] || ''),
      weight:  r[8] !== '' ? Number(r[8]) : null,
      reps:    r[9] !== '' ? Number(r[9]) : null,
      memo:    String(r[14] || '')
    });
  });

  if (!lastDate) return { lastDate: null, lastSets: [], lastMemo: '', totalMainSets: 0, daysSinceLast: null };

  const lastRecs     = exRows.filter(r => r.date === lastDate);
  const lastSets     = lastRecs.map(r => ({ type: r.setType, setNum: r.setNum, side: r.side, weight: r.weight, reps: r.reps }));
  const lastMemo     = (lastRecs.find(r => r.memo) || {}).memo || '';
  const daysSinceLast= Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000);

  return { lastDate, lastSets, lastMemo, totalMainSets, daysSinceLast };
}

// ============================================================
//  全種目＋最終実施日（履歴タブ 種目軸ビュー用）
// ============================================================
function getExercisesWithLastDate() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const last  = sheet.getLastRow();
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const map   = {};

  if (last >= 2) {
    const rows = sheet.getRange(2, 1, last - 1, 5).getValues();
    rows.forEach(r => {
      if (!r[0]) return;
      const name = String(r[4] || '');
      if (!name) return;
      const d = fmtDate(r[1]);
      if (!map[name] || d > map[name]) map[name] = d;
    });
  }

  const todayMs = new Date(today).getTime();
  const result  = Object.keys(map).map(name => {
    const daysAgo = Math.round((todayMs - new Date(map[name]).getTime()) / 86400000);
    return { name, lastDate: map[name], daysAgo };
  });
  result.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return { exercises: result };
}

// ============================================================
//  履歴（日付軸）取得
// ============================================================
function getHistory(offset) {
  const PER_PAGE = 20;
  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sessRows = ss.getSheetByName(SHEET_SESSIONS).getDataRange().getValues();
  const sessions = sessRows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:           Number(r[0]),
      date:         fmtDate(r[1]),
      menu:         String(r[2] || ''),
      startTime:    fmtTime(r[3]),
      endTime:      r[4] ? fmtTime(r[4]) : '',
      condition:    String(r[5] || ''),
      satisfaction: String(r[6] || ''),
      comment:      String(r[7] || ''),
      sessionId:    String(r[8] || '')
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const paged   = sessions.slice(offset, offset + PER_PAGE);
  const hasMore = sessions.length > offset + PER_PAGE;
  if (paged.length === 0) return { sessions: [], hasMore: false };

  const dateSet  = new Set(paged.map(s => s.date));
  const recSheet = ss.getSheetByName(SHEET_RECORDS);
  const recLast  = recSheet.getLastRow();
  const recMap   = {};

  if (recLast >= 2) {
    const recRows = recSheet.getRange(2, 1, recLast - 1, 15).getValues();
    recRows.forEach(r => {
      if (!r[0]) return;
      const d = fmtDate(r[1]);
      if (!dateSet.has(d)) return;
      const menu   = String(r[3] || '');
      const exName = String(r[4] || '');
      const key    = d + '|' + menu;
      if (!recMap[key])         recMap[key] = {};
      if (!recMap[key][exName]) recMap[key][exName] = [];
      recMap[key][exName].push({
        setType:     String(r[5] || ''),
        setNum:      Number(r[6] || 0),
        side:        String(r[7] || ''),
        weight:      r[8] !== '' ? Number(r[8]) : null,
        reps:        r[9] !== '' ? Number(r[9]) : null,
        injurySite:  String(r[11] || ''),
        injuryLevel: String(r[12] || ''),
        injuryMemo:  String(r[13] || ''),
        memo:        String(r[14] || '')
      });
    });
  }

  paged.forEach(sess => {
    const key      = sess.date + '|' + sess.menu;
    sess.exercises = recMap[key] || {};
  });

  return { sessions: paged, hasMore };
}

// ============================================================
//  種目別履歴取得
// ============================================================
function getExerciseHistory(exerciseName, offset) {
  if (!exerciseName) return { error: 'exerciseName required' };
  const PER_PAGE = 20;
  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet    = ss.getSheetByName(SHEET_RECORDS);
  const last     = sheet.getLastRow();
  if (last < 2) return { dates: [], hasMore: false };

  const rows    = sheet.getRange(2, 1, last - 1, 15).getValues();
  const today   = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const dateMap = {};

  rows.forEach(r => {
    if (!r[0] || String(r[4]) !== exerciseName) return;
    const d = fmtDate(r[1]);
    if (!dateMap[d]) dateMap[d] = [];
    dateMap[d].push({
      setType:     String(r[5] || ''),
      setNum:      Number(r[6] || 0),
      side:        String(r[7] || ''),
      weight:      r[8] !== '' ? Number(r[8]) : null,
      reps:        r[9] !== '' ? Number(r[9]) : null,
      injurySite:  String(r[11] || ''),
      injuryLevel: String(r[12] || ''),
      injuryMemo:  String(r[13] || ''),
      memo:        String(r[14] || '')
    });
  });

  const sorted  = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
  const paged   = sorted.slice(offset, offset + PER_PAGE);
  const hasMore = sorted.length > offset + PER_PAGE;
  const todayMs = new Date(today).getTime();

  return {
    dates: paged.map(date => ({
      date,
      daysAgo: Math.round((todayMs - new Date(date).getTime()) / 86400000),
      sets: dateMap[date]
    })),
    hasMore
  };
}

// ============================================================
//  分析データ取得
// ============================================================
function getAnalysisData(exerciseName) {
  if (!exerciseName) return { error: 'exerciseName required' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const last  = sheet.getLastRow();
  if (last < 2) return { data: [] };

  const rows    = sheet.getRange(2, 1, last - 1, 11).getValues();
  const dateMap = {};

  rows.forEach(r => {
    if (!r[0] || String(r[4]) !== exerciseName || String(r[5]) !== 'メイン') return;
    const d      = fmtDate(r[1]);
    const weight = r[8] !== '' ? Number(r[8]) : 0;
    const reps   = r[9] !== '' ? Number(r[9]) : 0;
    if (!dateMap[d]) dateMap[d] = { maxWeight: 0, maxReps: 0, totalVolume: 0, totalSets: 0 };
    dateMap[d].maxWeight    = Math.max(dateMap[d].maxWeight, weight);
    dateMap[d].maxReps      = Math.max(dateMap[d].maxReps, reps);
    dateMap[d].totalVolume += weight * reps;
    dateMap[d].totalSets++;
  });

  return {
    data: Object.keys(dateMap).sort().map(date => ({
      date,
      maxWeight:   dateMap[date].maxWeight,
      maxReps:     dateMap[date].maxReps,
      totalVolume: Math.round(dateMap[date].totalVolume * 10) / 10,
      totalSets:   dateMap[date].totalSets
    }))
  };
}

// ============================================================
//  saveSets（種目完了時にセットをまとめて保存）
// ============================================================
function saveSets(d) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const last  = sheet.getLastRow();
  const sets  = d.sets || [];
  if (sets.length === 0) return okRes();

  let baseId = 1;
  if (last >= 2) {
    const lastId = sheet.getRange(last, 1).getValue();
    baseId = (typeof lastId === 'number' && lastId > 0 ? lastId : last - 1) + 1;
  }

  const rows = sets.map((s, i) => [
    baseId + i,
    d.date,
    s.time            || '',
    d.menu            || '',
    d.exercise,
    s.type,
    s.setNum,
    s.side            || '',
    s.weight  != null ? s.weight  : '',
    s.reps    != null ? s.reps    : '',
    s.targetInterval != null ? s.targetInterval : '',
    s.injurySite      || '',
    s.injuryLevel     || '',
    s.injuryMemo      || '',
    s.memo            || '',
    d.sessionId       || ''
  ]);

  sheet.getRange(last + 1, 1, rows.length, 16).setValues(rows);
  return okRes();
}

// ============================================================
//  saveSession（保存して終了 ボタン押下時）
// ============================================================
function saveSession(d) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SESSIONS);
  const last  = sheet.getLastRow();

  let nextId = 1;
  if (last >= 2) {
    const lastId = sheet.getRange(last, 1).getValue();
    nextId = (typeof lastId === 'number' && lastId > 0 ? lastId : last - 1) + 1;
  }

  sheet.appendRow([
    nextId,
    d.date,
    d.menu         || '',
    d.startTime,
    d.endTime      || '',
    d.condition    || '',
    d.satisfaction || '',
    d.comment      || '',
    d.sessionId    || ''
  ]);
  return okRes();
}

// ============================================================
//  セッション更新・削除
// ============================================================
function updateSession(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SESSIONS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== Number(d.id)) continue;
    sheet.getRange(i + 1, 6, 1, 3).setValues([[
      d.condition    || '',
      d.satisfaction || '',
      d.comment      || ''
    ]]);
    break;
  }
  return okRes();
}

function deleteSession(d) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (d.sessionId) {
    const recSheet = ss.getSheetByName(SHEET_RECORDS);
    const recRows  = recSheet.getDataRange().getValues();
    for (let i = recRows.length - 1; i >= 1; i--) {
      if (String(recRows[i][15]) === String(d.sessionId)) recSheet.deleteRow(i + 1);
    }
  }
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  const sessRows  = sessSheet.getDataRange().getValues();
  for (let i = 1; i < sessRows.length; i++) {
    if (Number(sessRows[i][0]) === Number(d.id)) { sessSheet.deleteRow(i + 1); break; }
  }
  return okRes();
}

// ============================================================
//  記録の更新・削除（種目単位）
// ============================================================
function updateExerciseRecords(d) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][4]) !== String(d.exercise)) continue;
    const byId       = d.sessionId && String(rows[i][15]) === String(d.sessionId);
    const byFallback = !d.sessionId &&
                       fmtDate(rows[i][1]) === String(d.date) &&
                       String(rows[i][3]) === String(d.menu || '');
    if (byId || byFallback) sheet.deleteRow(i + 1);
  }

  const sets = d.sets || [];
  if (sets.length === 0) return okRes();

  const last = sheet.getLastRow();
  let baseId = 1;
  if (last >= 2) {
    const lastId = sheet.getRange(last, 1).getValue();
    baseId = (typeof lastId === 'number' && lastId > 0 ? lastId : last - 1) + 1;
  }

  const newRows = sets.map((s, i) => [
    baseId + i,
    d.date,
    '',
    d.menu        || '',
    d.exercise,
    s.type,
    s.setNum,
    s.side        || '',
    s.weight != null ? s.weight : '',
    s.reps   != null ? s.reps   : '',
    '',
    s.injurySite  || '',
    s.injuryLevel || '',
    s.injuryMemo  || '',
    s.memo        || '',
    d.sessionId   || ''
  ]);

  sheet.getRange(last + 1, 1, newRows.length, 16).setValues(newRows);
  return okRes();
}

// ============================================================
//  種目 CRUD
// ============================================================
function addExercise(d) {
  SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_EXERCISES)
    .appendRow([d.name, d.unit || '回', d.defaultInterval ?? 90,
      d.bodyPart || '', d.mainEquipment || '', d.subEquipment || '',
      d.hasSides ? 'あり' : 'なし']);
  return okRes();
}

function updateExercise(d) {
  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet      = ss.getSheetByName(SHEET_EXERCISES);
  const rows       = sheet.getDataRange().getValues();
  const searchName = d.oldName || d.name;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(searchName)) continue;
    sheet.getRange(i + 1, 1, 1, 7).setValues([[
      d.name, d.unit || '回', d.defaultInterval ?? 90,
      d.bodyPart || '', d.mainEquipment || '', d.subEquipment || '',
      d.hasSides ? 'あり' : 'なし'
    ]]);
    break;
  }
  if (d.oldName && d.oldName !== d.name) {
    const recSheet = ss.getSheetByName(SHEET_RECORDS);
    const recRows  = recSheet.getDataRange().getValues();
    for (let i = 1; i < recRows.length; i++) {
      if (String(recRows[i][4]) === String(d.oldName)) recSheet.getRange(i + 1, 5).setValue(d.name);
    }
    const menuSheet = ss.getSheetByName(SHEET_MENUS);
    const menuRows  = menuSheet.getDataRange().getValues();
    for (let i = 1; i < menuRows.length; i++) {
      if (String(menuRows[i][2]) === String(d.oldName)) menuSheet.getRange(i + 1, 3).setValue(d.name);
    }
  }
  return okRes();
}

function deleteExercise(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_EXERCISES);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.name)) { sheet.deleteRow(i + 1); break; }
  }
  return okRes();
}

// ============================================================
//  メニュー CRUD
// ============================================================
function addMenu(d) {
  SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_MENUS)
    .appendRow([d.name, 1, '']);
  return okRes();
}

function deleteMenu(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENUS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.name)) sheet.deleteRow(i + 1);
  }
  return okRes();
}

function addMenuExercise(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENUS);
  const rows  = sheet.getDataRange().getValues();
  let maxOrder = 0;
  rows.slice(1).forEach(r => {
    if (String(r[0]) === String(d.menu)) maxOrder = Math.max(maxOrder, Number(r[1] || 0));
  });
  sheet.appendRow([d.menu, maxOrder + 1, d.exercise]);
  return okRes();
}

function removeMenuExercise(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENUS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.menu) && String(rows[i][2]) === String(d.exercise)) {
      sheet.deleteRow(i + 1); break;
    }
  }
  return okRes();
}

function reorderMenuExercises(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENUS);
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.menu)) sheet.deleteRow(i + 1);
  }
  d.exercises.forEach((ex, idx) => sheet.appendRow([d.menu, idx + 1, ex]));
  return okRes();
}

// ============================================================
//  怪我部位 CRUD
// ============================================================
function addInjurySite(d) {
  SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_INJURIES)
    .appendRow([d.name]);
  return okRes();
}

function updateInjurySite(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INJURIES);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.oldName)) {
      sheet.getRange(i + 1, 1).setValue(d.newName); break;
    }
  }
  return okRes();
}

function deleteInjurySite(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INJURIES);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.name)) { sheet.deleteRow(i + 1); break; }
  }
  return okRes();
}

// ============================================================
//  ユーティリティ
// ============================================================
function fmtDate(val) {
  return typeof val.getTime === 'function'
    ? Utilities.formatDate(val, 'Asia/Tokyo', 'yyyy-MM-dd')
    : String(val);
}

function fmtTime(val) {
  if (!val && val !== 0) return '';
  return typeof val.getTime === 'function'
    ? Utilities.formatDate(val, 'UTC', 'HH:mm')
    : String(val);
}

function jsonp(cb, data) {
  return ContentService
    .createTextOutput(cb + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function okRes() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorRes(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
