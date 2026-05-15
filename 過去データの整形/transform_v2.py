#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import csv, re, os
from collections import defaultdict

SRC = "/Users/tsuyoshi/ドキュメント/AI_Project/workoutlog2/過去データの整形/エクセルで記録していた過去データ/260419フィットネス記録簿.csv"
DST = "/Users/tsuyoshi/ドキュメント/AI_Project/workoutlog2/過去データの整形/整形データv2"

MARU_CHARS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮'
MARU_RE = re.compile(f'[{MARU_CHARS}]')
MARU_IDX = {c: i+1 for i, c in enumerate(MARU_CHARS)}

EXCLUDE_EX = {
    '体型動画撮影','感想','広背筋の筋トレ','エアラットプルダウン','ダッシュ',
    'ラットプルダウン-片手','デッドリフト-ハーフ','デッドリフト（注意）',
    'リバースプッシュアップ＋ダンベルカール','ダンベルカール＋アームカール-EZバー'
}

EX_RENAME = {
    'ベントオーバーロウ': 'ベントオーバーロー',
    'ベントオーバーローイング-日課用': 'ベントオーバーロー',
    'ベントオーバーロー-毎日': 'ベントオーバーロー',
    'ベントオーバーロウ-縦': 'ベントオーバーロー',
    'ベントオーバーロウ-横': 'ベントオーバーロー',
    'ベントオーバーロウ-逆手': 'ベントオーバーロー',
    'ベントオーバーロウ-EZバー': 'ベントオーバーロー-EZバー',
    'ベントオーバー＆シュラック-日課用': 'ベントオーバーロー',
    'ダンベルカール': 'アームカール-ダンベル',
    'スクワット-ダンベル': 'スクワット',
    'スクワット-超スロー': 'スロースクワット',
    'プルオーバー-背中': 'プルオーバー',
    'プルオーバー-胸': 'プルオーバー',
    'デッドリフト-猫背用': 'デッドリフト',
}

CHEST_EX    = {'ダンベルプレス','ダンベルフライ','プッシュアップ','チェストプレス'}
BACK_EX     = {'デッドリフト','ラットプルダウン-パイプ','ラットプルダウン-チューブ',
               'ベントオーバーロー','ベントオーバーロー-ダンベル','ベントオーバーロー-EZバー',
               'ワンハンドローイング','シーテッドロー-チューブ','懸垂','懸垂マシン','プルオーバー'}
SHOULDER_EX = {'サイドレイズ','サイドレイズ-日課用','ショルダープレス','ショルダープレス-日課用',
               'フロントレイズ','リアレイズ'}
ARM_EX      = {'アームカール-ダンベル','アームカール-EZバー','フレンチプレス',
               'トライセプスキックバック','リストカール'}
LEG_EX      = {'ブルガリアンスクワット','バックランジ','バックランジ-日課用','スクワット',
               'スロースクワット','ウォールスクワット','カーフレイズ','レッグレイズ'}

# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────

def parse_date(s):
    m = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', s)
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else None

def norm_ex(name):
    name = name.strip().replace('　','').replace('　','')
    return EX_RENAME.get(name, name)

def parse_weight_str(s):
    s = str(s).strip()
    if not s or s == '---': return None
    if s in ('0','0kg','0.0','0.0kg'): return 0.0
    m = re.match(r'^(\d+\.?\d*)\s*(?:kg|ｋｇ)', s, re.I)
    if m: return float(m.group(1))
    m = re.match(r'^(\d+\.?\d*)\s*(?:LBS|lbs)', s)
    if m: return round(float(m.group(1)) / 2.20462, 1)
    m = re.match(r'^(\d+\.?\d*)$', s)
    if m: return float(m.group(1))
    return None

def extract_time(s):
    m = re.search(r'[（(](\d{1,2}:\d{2})[）)]?', s)   # closing bracket optional
    return m.group(1) if m else ''

def clean_reps(s):
    """Returns (float|None, '回'|'秒')"""
    if not s: return None, '回'
    s = str(s).strip()
    s = re.sub(r'[（(]\d{1,2}:\d{2}[）)]?','',s).strip()
    s = s.rstrip('。、').strip()
    if re.search(r'秒$', s) or re.match(r'^\d+\.?\d*s$', s, re.I):
        m = re.search(r'(\d+\.?\d*)', s)
        return (float(m.group(1)), '秒') if m else (None,'秒')
    s = re.sub(r'(\d)a\b', r'\1', s)       # strip α
    m = re.match(r'^(\d+\.?\d*)\+\d', s)   # +N → take first
    if m: return float(m.group(1)), '回'
    m = re.match(r'^(\d+\.?\d*)$', s)
    if m: return float(m.group(1)), '回'
    return None, '回'

def mk(stype, num, side, weight, reps, unit, time):
    return {'type':stype,'num':num,'side':side,'weight':weight,
            'reps':reps,'unit':unit,'time':time,'memo':''}

# ─────────────────────────────────────────────────────────
# LINE PARSER (one raw line → list of set-dicts with maru key)
# ─────────────────────────────────────────────────────────

def parse_one_line(line, base_w):
    line = line.strip()
    if not line: return []
    time = extract_time(line)
    ln   = re.sub(r'[（(]\d{1,2}:\d{2}[）)]?','',line).strip()

    # ── Left/right + circle: "3.5kg右②15、左②18" or "5kg右①15、左①11" ──
    lr = re.match(
        r'^(\d+\.?\d*)\s*kg?\s*右\s*([①-⑮])?\s*(\d+[\+\d]*\.?\d*a?)[、,]\s*左\s*[①-⑮]?\s*(\d+[\+\d]*\.?\d*a?)',
        ln, re.I)
    if lr:
        w = parse_weight_str(lr.group(1)+'kg') or base_w
        mc = lr.group(2)
        n  = MARU_IDX.get(mc,0) if mc else 0
        rr,ur = clean_reps(lr.group(3))
        rl,ul = clean_reps(lr.group(4))
        return [{'maru':n,'side':'右','weight':w,'reps':rr,'unit':ur,'time':time,'memo':''},
                {'maru':n,'side':'左','weight':w,'reps':rl,'unit':ul,'time':time,'memo':''}]

    # ── Find circle number ──
    mm = MARU_RE.search(ln)
    maru_n = MARU_IDX[mm.group()] if mm else 0

    if maru_n:
        inner = MARU_RE.sub('', ln).strip()
        parts = re.split(r'[:：]', inner, 1)
        if len(parts)==2 and parts[0].strip():
            w = parse_weight_str(parts[0].strip()) or base_w
            r,u = clean_reps(parts[1].strip())
        else:
            # "5kg16+1" or "5kg 16+1" — weight+unit immediately followed by reps
            wm = re.match(r'^(\d+\.?\d*)\s*(?:kg|LBS)\s*(.*)', inner, re.I)
            if wm and wm.group(2):
                w = parse_weight_str(wm.group(1)+'kg') or base_w
                r,u = clean_reps(wm.group(2).strip())
            else:
                # "5 16" — weight with space before reps (no unit)
                wm2 = re.match(r'^(\d+\.?\d*)\s+(.*)', inner)
                if wm2 and wm2.group(2):
                    w = parse_weight_str(wm2.group(1)) or base_w
                    r,u = clean_reps(wm2.group(2).strip())
                else:
                    w = base_w; r,u = clean_reps(inner)
        return [{'maru':maru_n,'side':'','weight':w,'reps':r,'unit':u,'time':time,'memo':''}]

    # ── No circle: warmup-style ──
    # "weight : reps"
    parts = re.split(r'[:：]', ln, 1)
    if len(parts)==2 and parts[0].strip():
        w = parse_weight_str(parts[0].strip()) or base_w
        r_part = parts[1].strip()
        items = [x.strip() for x in r_part.split(',') if x.strip() and re.search(r'\d',x)]
        if len(items)>1:
            return [{'maru':0,'side':'','weight':w,'reps':clean_reps(x)[0],
                     'unit':clean_reps(x)[1],'time':time,'memo':''} for x in items]
        r,u = clean_reps(r_part)
        return [{'maru':0,'side':'','weight':w,'reps':r,'unit':u,'time':time,'memo':''}]

    # "weight-reps" or "weight-reps,reps"
    hyph = re.match(r'^(\d+\.?\d*)\s*(?:kg|LBS)\s*[-－]\s*(.+)', ln, re.I)
    if hyph:
        w = parse_weight_str(hyph.group(1)+('LBS' if re.search(r'LBS',hyph.group(0),re.I) else 'kg')) or base_w
        items = [x.strip() for x in hyph.group(2).split(',') if x.strip() and re.search(r'\d',x)]
        return [{'maru':0,'side':'','weight':w,'reps':clean_reps(x)[0],
                 'unit':clean_reps(x)[1],'time':time,'memo':''} for x in items] \
               or [{'maru':0,'side':'','weight':w,'reps':None,'unit':'回','time':time,'memo':''}]

    # "variant、reps" — Japanese comma separator (e.g. "懸垂、0.6" or "ジャンプ降り、10+10秒")
    jp_comma = re.split(r'[、，]', ln, 1)
    if len(jp_comma)==2 and jp_comma[1].strip():
        r,u = clean_reps(jp_comma[1].strip())
        return [{'maru':0,'side':'','weight':base_w,'reps':r,'unit':u,'time':time,'memo':''}]

    # bare reps
    r,u = clean_reps(ln)
    return [{'maru':0,'side':'','weight':base_w,'reps':r,'unit':u,'time':time,'memo':''}]

# ─────────────────────────────────────────────────────────
# KAISUU FIELD PARSER
# ─────────────────────────────────────────────────────────

def parse_kaisuu(kaisuu_raw, omosa_raw):
    kaisuu  = (kaisuu_raw or '').strip()
    base_w  = parse_weight_str(omosa_raw or '')

    if not kaisuu:
        return [mk('メイン',1,'',base_w,None,'回','')]

    lines = [l.strip() for l in re.split(r'[\r\n]+', kaisuu) if l.strip()]

    # ── Single-line formats ──
    if len(lines)==1:
        line = lines[0]
        ln   = re.sub(r'[（(]\d{1,2}:\d{2}[）)]?','',line).strip()
        time = extract_time(line)

        # 左右: "右：15,15,15、左：15,15,15"
        lr = re.match(r'右[：:]\s*([\d,\s\+a\.秒]+)[、,]\s*左[：:]\s*([\d,\s\+a\.秒]+)', ln)
        if lr:
            ri = [x.strip() for x in lr.group(1).split(',') if x.strip() and re.search(r'\d',x)]
            li = [x.strip() for x in lr.group(2).split(',') if x.strip() and re.search(r'\d',x)]
            result=[]
            for i,(rs,ls) in enumerate(zip(ri,li),1):
                rr,ur=clean_reps(rs); rl,ul=clean_reps(ls)
                result.append(mk('メイン',i,'右',base_w,rr,ur,time))
                result.append(mk('メイン',i,'左',base_w,rl,ul,time))
            return result

        # 両手: "両手：12,10,10"
        ry = re.match(r'両手[：:]\s*([\d,\s\+a\.秒]+)', ln)
        if ry:
            items=[x.strip() for x in ry.group(1).split(',') if x.strip() and re.search(r'\d',x)]
            return [mk('メイン',i,'',base_w,*clean_reps(x),time) for i,x in enumerate(items,1)]

        # Has circle(s) on single line → treat as multiline
        if MARU_RE.search(ln):
            lines = [ln]; # fall through to multiline
        else:
            # Simple comma: "10,10,10" or "30秒,30秒"
            items=[x.strip() for x in ln.split(',') if x.strip() and re.search(r'\d',x)]
            if items:
                return [mk('メイン',i,'',base_w,*clean_reps(x),time) for i,x in enumerate(items,1)]
            r,u=clean_reps(ln)
            return [mk('メイン',1,'',base_w,r,u,time)]

    # ── Multi-line format ──
    has_circles = any(MARU_RE.search(l) for l in lines)
    sets=[]; wu_count=0

    for line in lines:
        for p in parse_one_line(line, base_w):
            if has_circles:
                n=p['maru']
                if n==0:
                    wu_count+=1
                    sets.append(mk('ウォームアップ',wu_count,p['side'],p['weight'],p['reps'],p['unit'],p['time']))
                else:
                    sets.append(mk('メイン',n,p['side'],p['weight'],p['reps'],p['unit'],p['time']))
            else:
                # No circles: all main, sequential
                main_n=len([s for s in sets if s['type']=='メイン'])+1
                sets.append(mk('メイン',main_n,p['side'],p['weight'],p['reps'],p['unit'],p['time']))

    return sets or [mk('メイン',1,'',base_w,None,'回','')]

# ─────────────────────────────────────────────────────────
# MEMO ASSIGNMENT
# ─────────────────────────────────────────────────────────

def assign_memos(sets, memo_raw):
    if not memo_raw or not memo_raw.strip(): return sets
    memo = memo_raw.strip()

    if not MARU_RE.search(memo):
        if sets: sets[-1]['memo'] = memo
        return sets

    segs = re.split(f'([{re.escape(MARU_CHARS)}])', memo)

    def _clean_seg(t):
        t = t.strip().lstrip('\n').strip()
        # Remove trailing weight labels like "\n5kg" or "\n2.5kg" left by markup
        t = re.sub(r'\n\d+\.?\d*\s*kg\s*$', '', t).strip()
        # Remove leading weight labels like "11kg : " — weight is stored in 重量 col
        t = re.sub(r'^\d+\.?\d*\s*(?:kg|LBS)\s*[:：]\s*', '', t, flags=re.I).strip()
        return t

    pre  = _clean_seg(segs[0])
    circle_memos={}
    for i in range(1, len(segs)-1, 2):
        if i+1<len(segs):
            c=segs[i]; txt=_clean_seg(segs[i+1])
            if txt: circle_memos[MARU_IDX[c]]=txt

    wu = [s for s in sets if s['type']=='ウォームアップ']
    main= [s for s in sets if s['type']=='メイン']

    if pre:
        target = wu[0] if wu else (sets[0] if sets else None)
        if target: target['memo'] = pre

    for s in main:
        if s['num'] in circle_memos:
            if s['side'] in ('','右'):
                s['memo'] = circle_memos[s['num']]

    return sets

# ─────────────────────────────────────────────────────────
# MENU CLASSIFICATION
# ─────────────────────────────────────────────────────────

def classify_menu(ex_list):
    ex_set = set(ex_list)
    has_stretch   = 'ストレッチ-トレーニング前' in ex_set
    has_chest     = bool(CHEST_EX    & ex_set)
    has_back      = bool(BACK_EX     & ex_set)
    has_shoulder  = bool(SHOULDER_EX & ex_set)
    has_arm       = bool(ARM_EX      & ex_set)
    has_leg       = bool(LEG_EX      & ex_set)

    if not has_stretch:
        return '旧初期記録'

    if has_chest and not has_back:   return '胸'
    if has_back  and not has_chest:  return '背中'
    if has_shoulder and has_arm:     return '肩・腕'
    if has_shoulder and not has_arm: return '肩'
    if has_arm and not has_shoulder: return '腕'
    if has_leg and not has_chest and not has_back and not has_shoulder and not has_arm:
        return '脚'
    return '旧仕訳無'

# ─────────────────────────────────────────────────────────
# MAIN TRANSFORM
# ─────────────────────────────────────────────────────────

def main():
    os.makedirs(DST, exist_ok=True)

    with open(SRC, encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))

    # ── Pass 1: group by date ──
    days_kintore = defaultdict(list)   # date → [orig rows]
    days_kansou  = defaultdict(list)   # date → [感想 text]

    for r in rows:
        d = parse_date(r['日付'])
        if not d or d == '1900-01-00': continue
        cat = r['カテゴリー'].strip()
        if cat in ('筋トレ','血圧対策'):
            days_kintore[d].append(r)
        elif cat == '感想':
            txt = r['備考'].strip()
            if txt: days_kansou[d].append(txt)

    # ── Pass 2: determine menus ──
    day_menu = {}
    for d, rows_d in days_kintore.items():
        ex_names = [norm_ex(r['種目']) for r in rows_d]
        day_menu[d] = classify_menu(ex_names)

    # ── Pass 3: build records ──
    rec_rows = []
    rec_id   = 1
    day_times = defaultdict(list)  # date → list of 'HH:MM'

    for d in sorted(days_kintore.keys()):
        menu     = day_menu[d]
        sid      = f'sid_{d.replace("-","")}'
        orig_rows = days_kintore[d]

        # Counters for set renumbering: (ex, side, type) → next set number
        set_counters = defaultdict(lambda: defaultdict(int))

        for orig in orig_rows:
            ex = norm_ex(orig['種目'])
            if ex in EXCLUDE_EX: continue
            if not ex: continue

            sets = parse_kaisuu(orig['回数'], orig['重さ'])
            sets = assign_memos(sets, orig['備考'])

            # Renumber sets sequentially across multiple original rows for same exercise
            for s in sets:
                key = (ex, s['side'], s['type'])
                set_counters[key]['n'] += 1
                s['num'] = set_counters[key]['n']

            for s in sets:
                if s['time']:
                    day_times[d].append(s['time'])
                rec_rows.append({
                    'id':             rec_id,
                    '日付':           d,
                    '時刻':           s['time'],
                    'メニュー':       menu,
                    '種目名':         ex,
                    'セット種別':     s['type'],
                    'セット番号':     s['num'],
                    '左右':           s['side'],
                    '重量':           '' if s['weight'] is None else s['weight'],
                    '回数/秒':        '' if s['reps']   is None else s['reps'],
                    '目標インターバル':'',
                    '怪我部位':       '',
                    '怪我レベル':     '',
                    '怪我メモ':       '',
                    'メモ':           s['memo'],
                    'session_id':     sid,
                    'exInstanceId':   '',
                    'duration':       '',
                })
                rec_id += 1

    # ── Pass 4: build sessions ──
    ses_rows = []
    ses_id   = 1
    for d in sorted(days_kintore.keys()):
        menu    = day_menu[d]
        sid     = f'sid_{d.replace("-","")}'
        kansou  = '／'.join(days_kansou[d]) if days_kansou[d] else ''
        times   = sorted(day_times[d])
        start   = times[0]  if times else ''
        end     = times[-1] if times else ''
        ses_rows.append({
            'id':         ses_id,
            '日付':       d,
            'メニュー':   menu,
            '開始時刻':   start,
            '終了時刻':   end,
            'コンディション':'',
            '満足度':     '',
            '感想':       kansou,
            'session_id': sid,
        })
        ses_id += 1

    # ── Write CSV ──
    rec_fields = ['id','日付','時刻','メニュー','種目名','セット種別','セット番号',
                  '左右','重量','回数/秒','目標インターバル','怪我部位','怪我レベル','怪我メモ',
                  'メモ','session_id','exInstanceId','duration']
    ses_fields = ['id','日付','メニュー','開始時刻','終了時刻',
                  'コンディション','満足度','感想','session_id']

    with open(os.path.join(DST,'records_v2.csv'),'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=rec_fields); w.writeheader(); w.writerows(rec_rows)

    with open(os.path.join(DST,'sessions_v2.csv'),'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=ses_fields); w.writeheader(); w.writerows(ses_rows)

    print(f"records_v2.csv:  {len(rec_rows):,} 行")
    print(f"sessions_v2.csv: {len(ses_rows):,} 行")

    # ── Quick sanity checks ──
    print("\n=== メニュー分布 ===")
    from collections import Counter
    mc = Counter(r['メニュー'] for r in ses_rows)
    for k,v in sorted(mc.items(), key=lambda x:-x[1]): print(f"  {k:12s}: {v}")

    print("\n=== records サンプル（2023-06-20 サイドレイズ）===")
    for r in rec_rows:
        if r['日付']=='2023-06-20' and r['種目名']=='サイドレイズ':
            print(f"  {r['セット種別']:8s} set{r['セット番号']} 重量:{str(r['重量']):6s} 回数:{str(r['回数/秒']):5s} 時刻:{r['時刻']:5s} メモ:{str(r['メモ'])[:40]}")

    print("\n=== records サンプル（2022-08-19 最初の日）===")
    for r in rec_rows:
        if r['日付']=='2022-08-19':
            print(f"  {r['種目名']:20s} {r['セット種別']:8s} set{r['セット番号']} 重量:{str(r['重量']):6s} 回数:{str(r['回数/秒']):5s}")

    print("\n=== sessions サンプル（最初5件）===")
    for r in ses_rows[:5]:
        print(f"  {r['日付']} {r['メニュー']:12s} sid:{r['session_id']} 感想:{str(r['感想'])[:30]}")

    print("\n=== 時刻があるセッション数 ===")
    print(f"  開始時刻あり: {sum(1 for r in ses_rows if r['開始時刻'])}")

if __name__=='__main__':
    main()
