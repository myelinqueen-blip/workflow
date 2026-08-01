/**
 * SheetsSync.jsx  v2.7
 * Google Sheets 콘텐츠 캘린더 연동
 * - 시트 URL → 공개 CSV로 파싱
 * - 프로젝트별 시트 연결
 * - 발행 일정 캘린더 뷰
 * - Task 자동 생성 옵션
 */
import { useState, useEffect, useRef } from "react";

const LS_KEY = "wf_sheets_v1";
const loadSheets = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch { return {}; } };
const saveSheets = d => localStorage.setItem(LS_KEY, JSON.stringify(d));

/* Google Sheets URL → CSV export URL 변환 */
const toCsvUrl = url => {
  try {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return null;
    const id = m[1];
    // gid(시트번호) 파싱
    const gidM = url.match(/gid=(\d+)/);
    const gid  = gidM ? gidM[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  } catch { return null; }
};

/* CSV 파싱 */
const parseCsv = text => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || line.split(",");
    const obj  = {};
    headers.forEach((h,i) => {
      obj[h] = (vals[i]||"").trim().replace(/^"|"$/g,"");
    });
    return obj;
  }).filter(r => Object.values(r).some(v=>v));
};

/* 날짜 컬럼 추측 */
const guessDateCol   = headers => headers.find(h => /날짜|date|일정|발행|publish/i.test(h));
const guessTitleCol  = headers => headers.find(h => /제목|title|타이틀|콘텐츠|content/i.test(h));
const guessStatusCol = headers => headers.find(h => /상태|status|완료|done/i.test(h));
const guessChannelCol= headers => headers.find(h => /채널|channel|플랫폼|platform/i.test(h));

const CH_COLOR = {
  "인스타그램":"#ec4899", "instagram":"#ec4899",
  "유튜브":"#ef4444",     "youtube":"#ef4444",
  "블로그":"#f59e0b",     "blog":"#f59e0b",
  "링크드인":"#0ea5e9",   "linkedin":"#0ea5e9",
  "뉴스레터":"#8b5cf6",   "newsletter":"#8b5cf6",
  "페이스북":"#3b82f6",   "facebook":"#3b82f6",
  "틱톡":"#14b8a6",       "tiktok":"#14b8a6",
};
const chColor = ch => CH_COLOR[ch?.toLowerCase()] || "#94a3b8";

export default function SheetsSync({ projects, onAddTask, onClose }) {
  const [cfg, setCfg]       = useState(loadSheets);
  const [selProj, setSelProj] = useState(projects[0]?.id || "");
  const [url, setUrl]       = useState("");
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [headers, setHeaders] = useState([]);
  const [colMap, setColMap] = useState({ date:"", title:"", status:"", channel:"" });
  const [view, setView]     = useState("table"); // table | calendar
  const [selMonth, setSelMonth] = useState(() => {
    const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });

  // 프로젝트 바뀌면 저장된 URL 로드
  useEffect(() => {
    const saved = cfg[selProj];
    if (saved?.url) { setUrl(saved.url); setColMap(saved.colMap||{}); }
    else { setUrl(""); setColMap({ date:"",title:"",status:"",channel:"" }); }
    setRows([]); setError("");
  }, [selProj]);

  const saveConfig = (projId, sheetUrl, cm) => {
    const next = { ...cfg, [projId]: { url: sheetUrl, colMap: cm, updatedAt: new Date().toISOString() } };
    setCfg(next); saveSheets(next);
  };

  const fetchSheet = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(""); setRows([]);
    try {
      const csvUrl = toCsvUrl(url);
      if (!csvUrl) throw new Error("올바른 Google Sheets URL이 아닙니다.");
      const res  = await fetch(csvUrl);
      if (!res.ok) throw new Error("시트를 불러오지 못했습니다. '링크가 있는 모든 사용자'로 공유 설정을 확인하세요.");
      const text = await res.text();
      const parsed = parseCsv(text);
      if (!parsed.length) throw new Error("데이터가 없습니다.");
      const hdrs = Object.keys(parsed[0]);
      setHeaders(hdrs);
      // 컬럼 자동 매핑
      const auto = {
        date:    guessDateCol(hdrs)    || hdrs[0] || "",
        title:   guessTitleCol(hdrs)   || hdrs[1] || "",
        status:  guessStatusCol(hdrs)  || "",
        channel: guessChannelCol(hdrs) || "",
      };
      setColMap(p => ({ ...auto, ...p }));
      setRows(parsed);
      saveConfig(selProj, url, { ...auto });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // 캘린더 뷰용 데이터
  const calRows = rows.filter(r => {
    const d = r[colMap.date];
    if (!d) return false;
    const iso = d.replace(/\./g,"-").replace(/(\d{4})-(\d{1,2})-(\d{1,2})/,"$1-$2-$3");
    return iso.startsWith(selMonth);
  });

  // 달력 생성
  const CalendarGrid = () => {
    const [y, m] = selMonth.split("-").map(Number);
    const first  = new Date(y, m-1, 1);
    const last   = new Date(y, m, 0);
    const cells  = [];
    for (let i=0; i<first.getDay(); i++) cells.push(null);
    for (let d=1; d<=last.getDate(); d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const byDate = {};
    calRows.forEach(r => {
      const raw = r[colMap.date]||"";
      const d   = raw.match(/\d+$/)?.[0];
      if (d) { if (!byDate[+d]) byDate[+d]=[]; byDate[+d].push(r); }
    });

    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {["일","월","화","수","목","금","토"].map((d,i)=>(
            <div key={d} className="text-center text-xs py-1 font-medium"
              style={{color:i===0?"#f87171":i===6?"#60a5fa":"var(--text5)"}}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day,i)=>(
            <div key={i} className="rounded-xl min-h-[72px] p-1.5"
              style={{background:day?"var(--bg2)":"transparent",border:day?"1px solid var(--border)":"none"}}>
              {day&&<>
                <span className="text-xs font-bold mb-1 block" style={{color:"var(--text4)"}}>{day}</span>
                {(byDate[day]||[]).map((r,j)=>{
                  const ch = r[colMap.channel];
                  return (
                    <div key={j} className="rounded-lg px-1.5 py-0.5 mb-0.5 truncate"
                      style={{background:`${chColor(ch)}20`,border:`1px solid ${chColor(ch)}40`}}>
                      <span className="text-xs font-medium" style={{color:chColor(ch),fontSize:"10px"}}>
                        {r[colMap.title]||"(제목없음)"}
                      </span>
                    </div>
                  );
                })}
              </>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const proj = projects.find(p=>p.id===selProj);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"90vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)"}}>📊</div>
            <div>
              <h2 className="font-bold text-base" style={{color:"var(--text)"}}>Google Sheets 콘텐츠 캘린더</h2>
              <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>프로젝트별 발행 일정 자동 연동</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 프로젝트 선택 */}
          <div className="flex gap-2 flex-wrap">
            {projects.map(p=>(
              <button key={p.id} onClick={()=>setSelProj(p.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={selProj===p.id
                  ?{background:`${p.color||"#6366f1"}18`,border:`1px solid ${p.color||"#6366f1"}40`,color:"var(--text)"}
                  :{border:"1px solid var(--border)",color:"var(--text4)"}}>
                {p.clientName&&<span style={{color:"var(--text5)"}}>{p.clientName} / </span>}
                {p.name}
              </button>
            ))}
          </div>

          {/* URL 입력 */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{color:"var(--text3)"}}>
                Google Sheets URL
              </label>
              <div className="flex gap-2">
                <input value={url} onChange={e=>setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-3 py-2 text-sm outline-none rounded-xl"
                  style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}
                  onKeyDown={e=>e.key==="Enter"&&fetchSheet()}/>
                <button onClick={fetchSheet} disabled={loading||!url.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 flex items-center gap-2"
                  style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>로딩</>
                    : "불러오기"}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{color:"var(--text5)"}}>
                ⚠️ 시트를 <strong>'링크가 있는 모든 사용자'</strong>로 공유 설정해야 합니다
              </p>
            </div>

            {/* 컬럼 매핑 */}
            {headers.length>0&&(
              <div className="grid grid-cols-2 gap-2 pt-2" style={{borderTop:"1px solid var(--border)"}}>
                {[["날짜 컬럼","date"],["제목 컬럼","title"],["채널 컬럼","channel"],["상태 컬럼","status"]].map(([label,key])=>(
                  <div key={key}>
                    <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>{label}</label>
                    <select value={colMap[key]||""} onChange={e=>setColMap(p=>({...p,[key]:e.target.value}))}
                      className="w-full px-2 py-1.5 text-xs outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}>
                      <option value="">— 선택 —</option>
                      {headers.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error&&<p className="text-sm px-1" style={{color:"#f87171"}}>{error}</p>}

          {/* 데이터 뷰 */}
          {rows.length>0&&(
            <>
              {/* 뷰 전환 + 월 선택 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1 p-1 rounded-xl"
                  style={{background:"var(--input)",border:"1px solid var(--border)"}}>
                  {[["table","☰ 목록"],["calendar","📅 달력"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setView(v)}
                      className="px-3 py-1 rounded-lg text-xs transition-all"
                      style={view===v?{background:"var(--bg2)",color:"var(--text)",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}:{color:"var(--text4)"}}>
                      {l}
                    </button>
                  ))}
                </div>
                {view==="calendar"&&(
                  <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
                    className="text-xs outline-none rounded-xl px-3 py-1.5"
                    style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
                )}
                <span className="text-xs ml-auto" style={{color:"var(--text5)"}}>
                  총 {rows.length}건
                  {cfg[selProj]?.updatedAt&&` · ${new Date(cfg[selProj].updatedAt).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 동기화`}
                </span>
              </div>

              {view==="table"&&(
                <div className="rounded-2xl overflow-hidden"
                  style={{border:"1px solid var(--border)"}}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{borderBottom:"1px solid var(--border)",background:"var(--hover)"}}>
                          {colMap.date&&<th className="px-3 py-2.5 text-left font-semibold" style={{color:"var(--text3)"}}>날짜</th>}
                          {colMap.channel&&<th className="px-3 py-2.5 text-left font-semibold" style={{color:"var(--text3)"}}>채널</th>}
                          {colMap.title&&<th className="px-3 py-2.5 text-left font-semibold" style={{color:"var(--text3)"}}>타이틀</th>}
                          {colMap.status&&<th className="px-3 py-2.5 text-left font-semibold" style={{color:"var(--text3)"}}>상태</th>}
                          <th className="px-3 py-2.5 text-center font-semibold" style={{color:"var(--text3)"}}>Task</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0,50).map((row,i)=>{
                          const ch = row[colMap.channel];
                          const cc = chColor(ch);
                          return (
                            <tr key={i} style={{borderBottom:"1px solid var(--border)"}}
                              onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              {colMap.date&&(
                                <td className="px-3 py-2 font-mono whitespace-nowrap" style={{color:"var(--text4)"}}>
                                  {row[colMap.date]}
                                </td>
                              )}
                              {colMap.channel&&(
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs"
                                    style={{background:`${cc}15`,color:cc,border:`1px solid ${cc}30`}}>
                                    {ch||"—"}
                                  </span>
                                </td>
                              )}
                              {colMap.title&&(
                                <td className="px-3 py-2 max-w-xs" style={{color:"var(--text)"}}>
                                  <p className="truncate">{row[colMap.title]||"—"}</p>
                                </td>
                              )}
                              {colMap.status&&(
                                <td className="px-3 py-2" style={{color:"var(--text4)"}}>
                                  {row[colMap.status]||"—"}
                                </td>
                              )}
                              <td className="px-3 py-2 text-center">
                                {onAddTask&&row[colMap.title]&&(
                                  <button
                                    onClick={()=>onAddTask(row[colMap.title], row[colMap.date])}
                                    className="text-xs px-2 py-1 rounded-lg transition-all"
                                    style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.25)"}}>
                                    + Task
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length>50&&(
                      <p className="px-4 py-2 text-xs text-center" style={{color:"var(--text5)"}}>
                        외 {rows.length-50}건 (최대 50건 표시)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {view==="calendar"&&(
                <div className="rounded-2xl p-4"
                  style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
                  <CalendarGrid/>
                  {/* 채널 범례 */}
                  <div className="flex gap-3 flex-wrap mt-3 pt-3" style={{borderTop:"1px solid var(--border)"}}>
                    {[...new Set(rows.map(r=>r[colMap.channel]).filter(Boolean))].map(ch=>(
                      <div key={ch} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{background:chColor(ch)}}/>
                        <span className="text-xs" style={{color:"var(--text4)"}}>{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
