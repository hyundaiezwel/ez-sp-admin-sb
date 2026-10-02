# catalog.json(DB 카탈로그 덤프) → erd.html(공유 페이지) + ERD.md(GitHub Mermaid). 01_ddl·04_comment 를 바꾸면 다시 돌린다.
import json, html

cat = json.load(open('catalog.json', encoding='utf-8'))
T = {t['name']: t for t in cat}
esc = html.escape

# --- SVG ERD (표시 컬럼은 핵심만, 전체는 아래 명세) ---
W, RH, HH = 250, 20, 46
EXT = {  # 이지웰 테이블 (첨부 샘플 기준)
    'ct_cc_dtl_c': ('고객사공통상세코드', ['clnt_cd', 'cc_cd', 'cc_dtl_cd', 'high_cc_dtl_cd', 'sort_ordg']),
    'ct_usr_b': ('사용자기본 (휴가샵 회원)', ['user_key', 'wrkr_no  (우리 키 · 신설)', 'clnt_cd', 'cc_br_cd  (소속1 연도)', 'cc_dept_cd  (소속2 기업)']),
    'cp_wsp_asg_wrk_b': ('복지제도포인트배정작업기본', ['wsp_asg_wrk_no', 'clnt_cd', 'wsp_asg_wrk_typ_cd']),
    'cp_wsp_asg_b': ('복지제도포인트배정기본', ['wsp_asg_no', 'user_key', 'wsp_asg_wrk_no', 'wsp_cd  (특복)', 'wsp_amt', 'use_poss_end_dtm']),
}
SHOW = {
    'vs_biz_b': ['biz_no', 'biz_yr', 'sprt_div_cd', 'biz_nm', 'gov_shr_amt', 'comp_shr_amt', 'indv_shr_amt'],
    'vs_dvlp_co_b': ['biz_no', 'bizr_no', 'co_nm', 'lnk_dtm'],
    'vs_co_b': ['bizr_no', 'co_nm', 'rprs_nm', 'corp_yn', 'accum_pcpt_yr_cnt', 'rfnd_acnt_no_enc', 'version'],
    'vs_join_b': ['join_no', 'biz_no', 'join_add_rn', 'up_join_no', 'bizr_no', 'co_fg_cd', 'join_st_cd', 'fnl_wrkr_cnt',
                  'vacct_no', 'dpst_amt', 'ezwel_br_cd', 'ezwel_dept_cd', 'version'],
    'vs_join_wrkr_b': ['wrkr_no', 'join_no', 'wrkr_nm', 'person_key', 'wrkr_jdg_st_cd', 'mbr_st_cd', 'use_stop_rsn_cd',
                       'rfnd_comp_amt', 'mbr_lnk_st_cd', 'version'],
    'vs_mngr_b': ['mngr_id', 'mngr_div_cd', 'auth_cd', 'bizr_no', 'acnt_st_cd', 'lgin_fail_cnt'],
    'vs_ban_b': ['ban_no', 'ban_div_cd', 'bizr_no', 'person_key', 'wrkr_no', 'ban_end_dt'],
    'vs_hist_h': ['hist_no', 'hist_typ_cd', 'tgt_tbl_nm', 'tgt_key', 'dtl_json'],
    'vs_file_b': ['file_no', 'tgt_tbl_nm', 'tgt_key', 'file_div_cd', 'strg_path'],
    'vs_bbs_b': ['bbs_no', 'bbs_div_cd', 'up_bbs_no', 'ctgr_cd', 'prcs_st_cd', 'wrkr_no', 'ans_cntn'],
    'vs_cd_c': ['cd_grp', 'cd', 'cd_nm', 'sort_ordg'],
}
BOT = 870  # 공통 행 y
POS = {'vs_biz_b': (24, 20), 'vs_co_b': (24, 240), 'vs_mngr_b': (24, 460), 'vs_ban_b': (24, 660),
       'vs_join_b': (314, 20), 'vs_join_wrkr_b': (604, 20), 'vs_dvlp_co_b': (314, 470),
       'ct_cc_dtl_c': (904, 20), 'ct_usr_b': (904, 214), 'cp_wsp_asg_wrk_b': (904, 386), 'cp_wsp_asg_b': (904, 524),
       'vs_hist_h': (24, BOT), 'vs_file_b': (314, BOT), 'vs_bbs_b': (604, BOT), 'vs_cd_c': (904, BOT)}
EZW_COLS = {'wrkr_no', 'ezwel_clnt_cd', 'ezwel_br_cd', 'ezwel_dept_cd', 'br_lnk_st_cd', 'br_lnk_dtm',
            'mbr_lnk_st_cd', 'mbr_lnk_dtm'}
KNAME = {n: T[n]['cmt'].split(' — ')[0] for n in T}

def col(tn, cn):
    return next(c for c in T[tn]['cols'] if c['n'] == cn)

def box(tn):
    x, y = POS[tn]
    ext = tn in EXT
    rows = EXT[tn][1] if ext else SHOW[tn]
    h = HH + len(rows) * RH + 8
    cls = 'ext' if ext else ('core' if tn in ('vs_biz_b', 'vs_co_b', 'vs_join_b', 'vs_join_wrkr_b') else 'tb')
    k = EXT[tn][0] if ext else KNAME[tn]
    out = [f'<g class="box {cls}"><rect x="{x}" y="{y}" width="{W}" height="{h}" rx="6" class="bg"/>',
           f'<rect x="{x}" y="{y}" width="{W}" height="{HH - 6}" rx="6" class="hd"/><rect x="{x}" y="{y + HH - 14}" width="{W}" height="8" class="hd"/>',
           f'<text x="{x + 12}" y="{y + 18}" class="tn">{tn}</text><text x="{x + 12}" y="{y + 33}" class="tk">{esc(k)}</text>']
    for i, r in enumerate(rows):
        ry = y + HH + 4 + i * RH + 14
        if ext:
            mark, cname, ez = '', r, True
        else:
            c = col(tn, r)
            mark = 'PK' if c['pk'] else ('FK' if c['fk'] else '')
            cname, ez = r, r in EZW_COLS
        out.append(f'<text x="{x + 12}" y="{ry}" class="mk">{mark}</text>'
                   f'<text x="{x + 38}" y="{ry}" class="cn{" ez" if ez else ""}">{esc(cname)}</text>')
    if not ext and len(T[tn]['cols']) > len(rows):
        out.append(f'<text x="{x + W - 12}" y="{y + 18}" class="more" text-anchor="end">컬럼 {len(T[tn]["cols"])}개</text>')
    out.append('</g>')
    return '\n'.join(out), h

def rowy(tn, cn):
    rows = EXT[tn][1] if tn in EXT else SHOW[tn]
    i = next(i for i, r in enumerate(rows) if r.split()[0] == cn)
    return POS[tn][1] + HH + 4 + i * RH + 10

boxes = {}
svg_boxes = []
for tn in POS:
    s, h = box(tn)
    boxes[tn] = h
    svg_boxes.append(s)

L, R = (lambda t: POS[t][0]), (lambda t: POS[t][0] + W)
def path(d, cls, label=None, lx=0, ly=0, anchor='start'):
    s = f'<path d="{d}" class="ln {cls}"/>'
    if label:
        s += f'<text x="{lx}" y="{ly}" class="ll {cls}" text-anchor="{anchor}">{esc(label)}</text>'
    return s

lines = []
# 사업(DVLP 행) → 발전모델 지정기업
y1, y2 = rowy('vs_biz_b', 'biz_no'), rowy('vs_dvlp_co_b', 'biz_no')
lines.append(path(f'M{R("vs_biz_b")} {y1} H282 V{y2} H{L("vs_dvlp_co_b")}', 'rel', '1:N 발전모델 지정기업', 318, POS['vs_dvlp_co_b'][1] - 6))
# 사업 → 참여건
y1, y2 = rowy('vs_biz_b', 'biz_no'), rowy('vs_join_b', 'biz_no')
lines.append(path(f'M{R("vs_biz_b")} {y1} H289 V{y2} H{L("vs_join_b")}', 'rel', '1:N', 280, y1 - 4, 'end'))
# 참여건 자기참조 (추가차수)
y1, y2 = rowy('vs_join_b', 'up_join_no'), rowy('vs_join_b', 'join_no')
lines.append(path(f'M{L("vs_join_b")} {y1} H300 V{y2} H{L("vs_join_b")}', 'rel'))
# 참여건 → 근로자
y1, y2 = rowy('vs_join_b', 'join_no'), rowy('vs_join_wrkr_b', 'join_no')
lines.append(path(f'M{R("vs_join_b")} {y1} H584 V{y2} H{L("vs_join_wrkr_b")}', 'rel', '1:N', 574, y1 - 4, 'end'))
# 기업 → 참여건 / 계정 (사업자번호 FK), 기업 ⇢ 참여불가
yc = rowy('vs_co_b', 'bizr_no')
lines.append(path(f'M{R("vs_co_b")} {yc} H296 V{rowy("vs_join_b", "bizr_no")} H{L("vs_join_b")}', 'rel', '1:N', 290, yc - 4, 'end'))
lines.append(path(f'M{L("vs_co_b")} {yc} H12 V{rowy("vs_mngr_b", "bizr_no")} H{L("vs_mngr_b")}', 'rel'))
lines.append(path(f'M12 {rowy("vs_mngr_b", "bizr_no")} V{rowy("vs_ban_b", "bizr_no")} H{L("vs_ban_b")}', 'soft'))
# 근로자 ⇢ 참여불가 회원 (person_key)
yp = rowy('vs_ban_b', 'person_key')
lines.append(path(f'M{L("vs_join_wrkr_b")} {rowy("vs_join_wrkr_b", "person_key")} H590 V{yp} H{R("vs_ban_b")}', 'soft', 'person_key', 440, yp - 6, 'middle'))
# 참여건 → 이지웰 소속코드
jb = POS['vs_join_b'][1] + boxes['vs_join_b']
lines.append(path(f'M{R("vs_join_b")} {rowy("vs_join_b", "ezwel_dept_cd")} H576 V{jb + 16} H870 V{rowy("ct_cc_dtl_c", "cc_dtl_cd")} H{L("ct_cc_dtl_c")}', 'ezw',
                  '소속1=연도 · 소속2=기업 코드 생성', 729, jb + 32, 'middle'))
lines.append(path(f'M870 {rowy("ct_cc_dtl_c", "cc_dtl_cd")} V{rowy("ct_usr_b", "cc_br_cd")} H{L("ct_usr_b")}', 'ezw'))
# 근로자 → 이지웰 회원생성 + 배정 (API 1회, 이지웰이 wrkr_no 저장)
yw = rowy('vs_join_wrkr_b', 'wrkr_no')
lines.append(path(f'M{R("vs_join_wrkr_b")} {yw} H884 V{rowy("ct_usr_b", "wrkr_no")} H{L("ct_usr_b")}', 'ezw'))
# 이지웰 내부: 회원 → 배정 (user_key 로 이지웰이 잇는다)
lines.append(path(f'M{R("ct_usr_b")} {rowy("ct_usr_b", "user_key")} H{R("ct_usr_b") + 22} V{rowy("cp_wsp_asg_b", "user_key")} H{R("cp_wsp_asg_b")}', 'ext'))
lines.append(f'<text x="729" y="{jb + 52}" class="ll ezw" text-anchor="middle">회원생성 + 포인트 배정 = API 1회 · 이지웰이 wrkr_no 저장</text>')
# 배정 → 배정작업
y1, y2 = rowy('cp_wsp_asg_b', 'wsp_asg_wrk_no'), rowy('cp_wsp_asg_wrk_b', 'wsp_asg_wrk_no')
lines.append(path(f'M{R("cp_wsp_asg_b")} {y1} H{R("cp_wsp_asg_b") + 14} V{y2} H{R("cp_wsp_asg_wrk_b")}', 'ext'))
# 게시물 자기참조
y1, y2 = rowy('vs_bbs_b', 'up_bbs_no'), rowy('vs_bbs_b', 'bbs_no')
lines.append(path(f'M{R("vs_bbs_b")} {y1} H{R("vs_bbs_b") + 14} V{y2} H{R("vs_bbs_b")}', 'rel'))

VB_H = BOT + max(boxes[t] for t in ('vs_hist_h', 'vs_file_b', 'vs_bbs_b', 'vs_cd_c')) + 20
band = (f'<text x="24" y="{BOT - 18}" class="band">공통 — 이력 · 첨부는 tgt_tbl_nm + tgt_key 로 어느 테이블이든 가리킨다 (FK 없음)</text>'
        f'<text x="904" y="12" class="band ezb">이지웰 (복지몰) — 조회는 우리 키(wrkr_no)로</text>')
svg = (f'<svg viewBox="0 0 1180 {VB_H}" role="img" aria-label="노동자 휴가지원사업 DB ERD">'
       + '\n'.join(lines) + '\n' + '\n'.join(svg_boxes) + band + '</svg>')

# --- 테이블 명세 ---
def spec(t):
    rows = []
    for c in t['cols']:
        key = 'PK' if c['pk'] else ('FK' if c['fk'] else '')
        fk = f' → {c["fk"]}' if c['fk'] else ''
        cls = ' class="ez"' if c['n'] in EZW_COLS else ''
        rows.append(f'<tr{cls} data-s="{esc((c["n"] + " " + (c["c"] or "")).lower())}"><td class="k">{key}</td><td class="mono">{c["n"]}</td>'
                    f'<td>{esc(c["c"] or "")}<span class="fk">{fk}</span></td><td class="mono t">{esc(c["t"])}</td><td class="nn">{"●" if c["nn"] else ""}</td></tr>')
    name, _, desc = t['cmt'].partition(' — ')
    return (f'<details class="spec" id="{t["name"]}" open><summary><span class="mono sn">{t["name"]}</span><span class="sk">{esc(name)}</span>'
            f'<span class="sc">{len(t["cols"])}</span></summary><p class="sd">{esc(desc)}</p>'
            '<div class="tw"><table><thead><tr><th>키</th><th>컬럼</th><th>설명</th><th>타입</th><th>필수</th></tr></thead><tbody>'
            + ''.join(rows) + '</tbody></table></div></details>')

specs = '\n'.join(spec(t) for t in cat)
toc = ''.join(f'<a href="#{t["name"]}"><span class="mono">{t["name"]}</span> {esc(KNAME[t["name"]])}</a>' for t in cat)

MAP = [
    ('참여기업 코드', 'vs_join_b.co_nm · bizr_no · 사업연도', 'ct_cc_dtl_c — 소속1(연도) 아래 소속2(기업). high_cc_dtl_cd = 소속1', 'ezwel_br_cd · ezwel_dept_cd'),
    ('회원생성 + 포인트 배정 (API 1회)', 'wrkr_no · wrkr_nm · brdt · 휴대폰 · 이메일 · 소속1·2 · 참여건 1인 분담금 · 사업 기본 사용기간', '휴가샵 회원(ct_usr_b 계열) + cp_wsp_asg_wrk_b / cp_wsp_asg_b (wsp_cd = 특복). 이지웰 회원 테이블에만 wrkr_no 저장 컬럼 신설', 'mbr_lnk_st_cd · mbr_lnk_dtm'),
    ('3분할 비율', 'vs_join_b.gov/comp/indv_shr_amt (근로자 전원 동일)', '결제·취소 시 비율 연산 테이블 (이지웰 측)', '—'),
    ('이용정지', 'wrkr_no · mbr_st_cd = S', '회원 이용 차단 API', '—'),
    ('조회 (잔액 · 이용내역 · 청구)', 'wrkr_no / ezwel_br_cd + ezwel_dept_cd', '이지웰이 저장한 우리 키로 조건 조회 — 우리 DB에는 저장하지 않음', '—'),
]
maprows = ''.join(f'<tr><td>{a}</td><td class="mono sm">{esc(b)}</td><td>{esc(c)}</td><td class="mono sm">{esc(d)}</td></tr>' for a, b, c, d in MAP)

page = f'''<title>휴가지원 DB 설계도</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
:root{{--bg:#F5F7F9;--sf:#FFFFFF;--ink:#1B2330;--mut:#5D6A7C;--ln:#D9DFE6;--ac:#1F6A86;--acs:#E3EFF4;--ez:#A86A12;--ezs:#FBF1E1;--hd:#EEF2F5;color-scheme:light}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#12161C;--sf:#1A2029;--ink:#E4E9F0;--mut:#93A0B2;--ln:#2C3542;--ac:#5FB3CF;--acs:#18303A;--ez:#E0A84A;--ezs:#33281A;--hd:#222A35;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#12161C;--sf:#1A2029;--ink:#E4E9F0;--mut:#93A0B2;--ln:#2C3542;--ac:#5FB3CF;--acs:#18303A;--ez:#E0A84A;--ezs:#33281A;--hd:#222A35;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font:15px/1.6 "IBM Plex Sans KR",system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}}
.wrap{{max-width:1240px;margin:0 auto;padding-inline:20px;padding-block:32px 64px;display:grid;gap:28px}}
.mono{{font-family:"IBM Plex Mono",ui-monospace,Consolas,monospace}}
header h1{{font-size:28px;line-height:1.25;margin:0 0 6px;font-weight:700;text-wrap:balance}}
header p{{margin:0;color:var(--mut);max-width:70ch}}
.meta{{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px;font-size:13px;color:var(--mut)}}
.meta b{{color:var(--ink);font-weight:600}}
h2{{font-size:18px;margin:0 0 10px;font-weight:600}}
.legend{{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--mut);margin-bottom:10px}}
.legend i{{display:inline-block;width:22px;height:0;border-top:2px solid var(--ac);vertical-align:middle;margin-right:6px}}
.legend i.s{{border-top-style:dashed;border-color:var(--mut)}} .legend i.e{{border-color:var(--ez);border-top-style:dashed}}
.legend em{{font-style:normal;color:var(--ez);font-family:"IBM Plex Mono",monospace}}
.diagram{{background:var(--sf);border:1px solid var(--ln);border-radius:10px;overflow-x:auto;padding:8px}}
.diagram svg{{display:block;min-width:960px;width:100%;height:auto}}
svg .bg{{fill:var(--sf);stroke:var(--ln);stroke-width:1.2}} svg .hd{{fill:var(--hd)}}
svg .core .bg{{stroke:var(--ac);stroke-width:1.6}} svg .core .hd{{fill:var(--acs)}}
svg .ext .bg{{stroke:var(--ez);stroke-dasharray:5 4}} svg .ext .hd{{fill:var(--ezs)}}
svg .tn{{font:600 13px "IBM Plex Mono",monospace;fill:var(--ink)}} svg .tk{{font:500 12px "IBM Plex Sans KR",sans-serif;fill:var(--mut)}}
svg .cn{{font:400 12px "IBM Plex Mono",monospace;fill:var(--ink)}} svg .cn.ez{{fill:var(--ez);font-weight:500}}
svg .mk{{font:600 10px "IBM Plex Mono",monospace;fill:var(--ac)}} svg .more{{font:400 11px "IBM Plex Sans KR",sans-serif;fill:var(--mut)}}
svg .ln{{fill:none;stroke-width:1.6}} svg .ln.rel{{stroke:var(--ac)}} svg .ln.soft{{stroke:var(--mut);stroke-dasharray:4 4}}
svg .ln.ezw{{stroke:var(--ez);stroke-dasharray:6 4}} svg .ln.ext{{stroke:var(--ez)}}
svg .ll{{font:500 11px "IBM Plex Sans KR",sans-serif}} svg .ll.rel{{fill:var(--ac)}} svg .ll.soft{{fill:var(--mut)}} svg .ll.ezw{{fill:var(--ez)}}
svg .band{{font:600 12px "IBM Plex Sans KR",sans-serif;fill:var(--mut)}} svg .band.ezb{{fill:var(--ez)}}
.notes{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}}
.note{{background:var(--sf);border:1px solid var(--ln);border-radius:8px;padding:14px 16px}}
.note h3{{margin:0 0 4px;font-size:14px;font-weight:600}} .note p{{margin:0;font-size:13.5px;color:var(--mut)}}
.tw{{overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:13.5px}}
th{{text-align:left;font-weight:600;font-size:12px;letter-spacing:.04em;color:var(--mut);border-bottom:1px solid var(--ln);padding:8px 10px;white-space:nowrap}}
td{{border-bottom:1px solid var(--ln);padding:6px 10px;vertical-align:top}}
td.mono{{white-space:nowrap}} td.sm{{font-size:12.5px;white-space:normal}} td.t{{color:var(--mut);font-size:12.5px}}
td.k{{font:600 11px "IBM Plex Mono",monospace;color:var(--ac);width:28px}} td.nn{{color:var(--mut);text-align:center;width:36px}}
.fk{{color:var(--ac);font-family:"IBM Plex Mono",monospace;font-size:12px}}
tr.ez td.mono:first-of-type{{color:var(--ez)}} tr.ez{{background:color-mix(in srgb,var(--ezs) 55%,transparent)}}
.map{{background:var(--sf);border:1px solid var(--ln);border-radius:10px;padding:6px 6px 2px}}
.tools{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:10px;z-index:2}}
.tools input{{flex:1 1 260px;font:inherit;padding:8px 12px;border:1px solid var(--ln);border-radius:6px;background:var(--sf);color:var(--ink)}}
.tools input:focus-visible,.toc a:focus-visible,summary:focus-visible{{outline:2px solid var(--ac);outline-offset:2px}}
.tools button{{font:inherit;font-size:13px;padding:7px 12px;border:1px solid var(--ln);border-radius:6px;background:var(--sf);color:var(--ink);cursor:pointer}}
.toc{{display:flex;flex-wrap:wrap;gap:6px}}
.toc a{{font-size:12.5px;color:var(--ink);text-decoration:none;border:1px solid var(--ln);border-radius:999px;padding:3px 10px;background:var(--sf)}}
.toc a .mono{{color:var(--ac)}}
.spec{{background:var(--sf);border:1px solid var(--ln);border-radius:10px;padding:4px 14px 10px;scroll-margin-top:70px}}
.spec summary{{cursor:pointer;display:flex;gap:12px;align-items:baseline;padding:10px 0;list-style:none}}
.spec summary::-webkit-details-marker{{display:none}}
.sn{{font-weight:600;color:var(--ac)}} .sk{{font-weight:600}} .sc{{margin-left:auto;font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}}
.sc::after{{content:" 컬럼"}} .sd{{margin:0 0 8px;color:var(--mut);font-size:13.5px}}
.specs{{display:grid;gap:12px}}
.empty{{color:var(--mut);font-size:13px}}
@media (max-width:640px){{header h1{{font-size:23px}}}}
</style>
<div class="wrap">
<header>
<h1>노동자 휴가지원사업 DB 설계도</h1>
<p>누리집 · 기업 어드민 · 공사 어드민이 함께 쓰는 초기 설계(강병헌안 v3). 업무단위 와이드 테이블 {len(cat)}개에, 이지웰 복지몰 테이블 4개와의 연동 지점을 함께 그렸다.</p>
<div class="meta"><span>기준 <b>2026-10-02 (v3)</b></span><span>PostgreSQL <b>16</b></span><span>테이블 <b>{len(cat)}</b> · 컬럼 <b>{sum(len(t["cols"]) for t in cat)}</b></span><span>소스 <b class="mono">db/강병헌/</b></span></div>
</header>
<section>
<h2>ERD</h2>
<div class="legend"><span><i></i>FK 관계</span><span><i class="s"></i>키로만 잇는 관계 (bizr_no)</span><span><i class="e"></i>이지웰 연동</span><span><em>앰버 컬럼</em> = 이지웰과 주고받는 값</span><span>PK/FK 표시 · 상자에는 핵심 컬럼만, 전체는 아래 명세</span></div>
<div class="diagram">{svg}</div>
</section>
<section class="notes">
<div class="note"><h3>기업은 고정정보와 그해 값으로</h3><p>기업명 · 대표자 · 주소 · 환불계좌는 기업기본(vs_co_b)에, 기업구분 · 인원 · 신청 담당자 · 입금은 그해 참여건에 둔다.</p></div>
<div class="note"><h3>추가인원은 다음 차수 행</h3><p>join_add_rn 1, 2… 인 새 행이 최초 행(up_join_no)을 가리키고, 7600대 상태 · 자기 입금 · 자기 근로자를 갖는다.</p></div>
<div class="note"><h3>이지웰은 우리 키로</h3><p>회원생성과 포인트 배정은 API 한 번이고, 우리는 성공/실패만 남긴다. 이지웰이 회원 테이블에 wrkr_no를 저장하고, 잔액 · 사용기한 · 이용내역은 wrkr_no로 조회한다.</p></div>
<div class="note"><h3>이력은 지울 수 없다</h3><p>vs_hist_h 한 곳에 모든 이벤트를 쌓고, 트리거가 UPDATE · DELETE를 거부한다. 일괄 처리는 bulk_job_no로 건별 결과를 묶는다.</p></div>
<div class="note"><h3>동시 처리 · 중복 로그인</h3><p>상태가 바뀌는 테이블은 version이 맞을 때만 갱신한다. 중복 로그인 차단 · 무활동 로그아웃 · 2차 인증번호는 Redis(운영 ElastiCache)가 맡는다.</p></div>
</section>
<section>
<h2>이지웰 연동 매핑</h2>
<div class="map tw"><table><thead><tr><th>단계</th><th>우리가 보내는 값</th><th>이지웰 대상</th><th>받아서 저장</th></tr></thead><tbody>{maprows}</tbody></table></div>
</section>
<section>
<h2>테이블 명세</h2>
<div class="tools"><input id="q" type="search" placeholder="컬럼명이나 설명으로 찾기 (예: 환불, wrkr_no)" aria-label="컬럼 검색"><button id="tog" type="button">모두 접기</button></div>
<div class="toc">{toc}</div>
<p class="empty" id="none" hidden>일치하는 컬럼이 없습니다.</p>
<div class="specs">{specs}</div>
</section>
</div>
<script>
const q=document.getElementById('q'),none=document.getElementById('none'),tog=document.getElementById('tog');
q.addEventListener('input',()=>{{const v=q.value.trim().toLowerCase();let any=0;
document.querySelectorAll('.spec').forEach(d=>{{let n=0;d.querySelectorAll('tbody tr').forEach(r=>{{const m=!v||r.dataset.s.includes(v);r.hidden=!m;n+=m}});
d.hidden=!n;if(v&&n)d.open=true;any+=n}});none.hidden=!!any}});
tog.addEventListener('click',()=>{{const ds=[...document.querySelectorAll('.spec')];const open=ds.some(d=>d.open);ds.forEach(d=>d.open=!open);tog.textContent=open?'모두 펼치기':'모두 접기'}});
</script>
'''
open('erd.html', 'w', encoding='utf-8').write(page)

# --- erd.svg (GitHub README 에 이미지로 박는다. 리포 권한만 있으면 보인다) ---
import re
LIGHT = dict(re.findall(r'--(\w+):(#[0-9A-Fa-f]{6})', page.split('@media')[0]))
svg_css = '\n'.join(l for l in page.splitlines() if l.startswith('svg .'))
svg_css = re.sub(r'var\(--(\w+)\)', lambda m: LIGHT[m.group(1)], svg_css)
svg_css = svg_css.replace('"IBM Plex Mono",monospace', 'Consolas,"D2Coding",monospace').replace('"IBM Plex Sans KR",sans-serif', '"Malgun Gothic","Apple SD Gothic Neo",sans-serif')
alone = svg.replace('<svg viewBox', f'<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="{VB_H}" viewBox', 1).replace(
    'aria-label="노동자 휴가지원사업 DB ERD">',
    f'aria-label="노동자 휴가지원사업 DB ERD"><style>{svg_css}</style><rect width="100%" height="100%" fill="#FFFFFF"/>', 1)
open('erd.svg', 'w', encoding='utf-8').write(alone)

# --- ERD.md (GitHub 가 Mermaid 로 그린다) ---
def mtype(t):
    return t.split('(')[0].replace(' ', '_')
ents = []
for t in cat:
    attrs = []
    for c in t['cols']:
        k = 'PK' if c['pk'] else ('FK' if c['fk'] else '')
        attrs.append(f'        {mtype(c["t"])} {c["n"]} {k} "{(c["c"] or "").replace(chr(34), "")}"')
    ents.append(f'    {t["name"]} {{\n' + '\n'.join(attrs) + '\n    }')
rels = '''    vs_co_b ||--o{ vs_join_b : "bizr_no"
    vs_co_b ||--o{ vs_mngr_b : "bizr_no"
    vs_biz_b ||--o{ vs_join_b : "biz_no"
    vs_biz_b ||--o{ vs_dvlp_co_b : "biz_no 발전모델 지정기업"
    vs_join_b ||--o{ vs_join_b : "up_join_no 추가차수"
    vs_join_b ||--o{ vs_join_wrkr_b : "join_no"
    vs_co_b }o..o{ vs_ban_b : "bizr_no"
    vs_join_wrkr_b }o..o{ vs_ban_b : "person_key · wrkr_no"
    vs_join_wrkr_b }o..o{ vs_bbs_b : "wrkr_no 부정행위"
    vs_bbs_b ||--o{ vs_bbs_b : "up_bbs_no"'''
md = ('# ERD — 전체 컬럼\n\n`gen_erd.py`가 DB 카탈로그(테이블·컬럼 COMMENT)에서 생성한다. 손으로 고치지 말 것.\n'
      '이력(`vs_hist_h`)·첨부(`vs_file_b`)는 `tgt_tbl_nm + tgt_key`로 어느 테이블이든 가리키므로 관계선을 그리지 않았다.\n'
      '이지웰 연동 지점까지 그린 그림: **[ERD 보기 (웹 페이지)](https://claude.ai/artifact/BG4DHMUaxjBHsM8iZXQxF6)** (공유받은 사람만 열림) · 파일로는 [erd.html](erd.html) · 설명은 README 4절.\n\n'
      '```mermaid\nerDiagram\n' + rels + '\n' + '\n'.join(ents) + '\n```\n')
open('ERD.md', 'w', encoding='utf-8').write(md)
print('ok', len(page), len(md))
