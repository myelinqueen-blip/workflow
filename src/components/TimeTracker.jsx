/**
 * TimeTracker.jsx  v2.7
 * 타임트래킹:
 * - Task별 작업 시간 기록
 * - 스탑워치 타이머
 * - 클라이언트·프로젝트별 집계
 * - localStorage 저장
 */
import { useState, useEffect, useRef } from "react";

const LS_KEY  = "wf_time_v1";
const loadLog = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch { return []; } };
const saveLog = d => localStorage.setItem(LS_KEY, JSON.stringify(d));

const mkId    = () => Math.random().toString(36).slice(2,9);
const fmtSec  = s => {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
              : `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
};
const fmtMin  = s => {
  const h = Math.floor(s/3600), m = Math.round((s%3600)/60);
  return h>0 ? `${h}시간 ${m}분` : `${m}분`;
};
const todayISO = () => new Date().toISOString().slice(0,10);

export default function TimeTracker({ clients, members, onClose }) {
  const [log,       setLog]       = useState(loadLog);
  const [running,   setRunning]   = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [selClient, setSelClient] = useState(clients[0]?.id||"");
  const [selProj,   setSelProj]   = useState(clients[0]?.projects[0]?.id||"");
  const [selTask,   setSelTask]   = useState("");
  const [memo,      setMemo]      = useState("");
  const [tabView,   setTabView]   = useState("timer"); // timer | log
  const [filterM,   setFilterM]   = useState(todayISO().slice(0,7));
  const iRef = useRef(null);

  useEffect(() => { saveLog(log); }, [log]);

  useEffect(() => {
    if (running) {
      iRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now()-startTime)/1000));
      }, 500);
    } else {
      clearInterval(iRef.current);
    }
    return () => clearInterval(iRef.current);
  }, [running, startTime]);

  const client  = clients.find(c=>c.id===selClient);
  const project = client?.projects.find(p=>p.id===selProj);
  const taskList= project?.tasks || [];

  const switchClient = cid => {
    setSelClient(cid);
    const c = clients.find(x=>x.id===cid);
    const firstProj = c?.projects[0]?.id||"";
    setSelProj(firstProj);
    setSelTask(c?.projects[0]?.tasks[0]?.id||"");
  };

  const start = () => {
    setStartTime(Date.now()-elapsed*1000);
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const stop = () => {
    setRunning(false);
    if (elapsed < 10) { setElapsed(0); return; }
    const entry = {
      id: mkId(),
      clientId:   selClient,
      clientName: client?.name||"",
      projId:     selProj,
      projName:   project?.name||"",
      taskId:     selTask,
      taskName:   taskList.find(t=>t.id===selTask)?.name||"(기타)",
      memo,
      seconds:    elapsed,
      date:       todayISO(),
      createdAt:  new Date().toISOString(),
    };
    setLog(prev=>[entry,...prev]);
    setElapsed(0); setMemo(""); setStartTime(null);
  };

  const deleteEntry = id => setLog(prev=>prev.filter(e=>e.id!==id));

  // 집계
  const filtLog = log.filter(e=>e.date.startsWith(filterM));
  const totalSec = filtLog.reduce((a,e)=>a+e.seconds,0);

  // 클라이언트별 합계
  const byClient = {};
  filtLog.forEach(e=>{
    if (!byClient[e.clientName]) byClient[e.clientName]=0;
    byClient[e.clientName]+=e.seconds;
  });

  // 날짜별 그룹
  const byDate = {};
  filtLog.forEach(e=>{
    if (!byDate[e.date]) byDate[e.date]=[];
    byDate[e.date].push(e);
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"90vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)"}}>⏱️</div>
            <div>
              <h2 className="font-bold text-base" style={{color:"var(--text)"}}>타임트래킹</h2>
              <p className="text-xs" style={{color:"var(--text5)"}}>Task별 작업 시간 기록 · localStorage 저장</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
        </div>

        {/* sub-tab */}
        <div className="flex px-4 pt-3 gap-1 flex-shrink-0">
          {[["timer","⏱ 타이머"],["log","📋 기록 로그"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTabView(k)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={tabView===k
                ?{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.35)",color:"#818cf8"}
                :{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── 타이머 ── */}
          {tabView==="timer"&&(<>
            {/* 선택 */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
              {/* client */}
              <div className="flex gap-1.5 flex-wrap">
                {clients.map(c=>(
                  <button key={c.id} onClick={()=>switchClient(c.id)}
                    className="px-2.5 py-1 rounded-xl text-xs transition-all"
                    style={selClient===c.id
                      ?{background:`${c.color}18`,border:`1px solid ${c.color}40`,color:"var(--text)"}
                      :{border:"1px solid var(--border)",color:"var(--text4)"}}>
                    {c.name}
                  </button>
                ))}
              </div>
              {/* project */}
              {client&&(
                <select value={selProj} onChange={e=>{setSelProj(e.target.value);setSelTask("");}}
                  className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                  style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}>
                  {client.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {/* task */}
              {taskList.length>0&&(
                <select value={selTask} onChange={e=>setSelTask(e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                  style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}>
                  <option value="">— Task 선택 (선택사항) —</option>
                  {taskList.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              {/* memo */}
              <input value={memo} onChange={e=>setMemo(e.target.value)}
                placeholder="메모 (선택) — 어떤 작업인지"
                className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
            </div>

            {/* 타이머 디스플레이 */}
            <div className="rounded-2xl p-8 text-center"
              style={{background:`linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.06))`,border:"1px solid rgba(99,102,241,0.2)"}}>
              <div className="text-6xl font-black font-mono mb-6 tabular-nums"
                style={{color:running?"#818cf8":"var(--text)",letterSpacing:"-2px",textShadow:running?"0 0 30px rgba(99,102,241,0.4)":"none"}}>
                {fmtSec(elapsed)}
              </div>
              <div className="flex items-center justify-center gap-3">
                {!running ? (
                  <button onClick={start}
                    className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all"
                    style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)",boxShadow:"0 4px 16px rgba(99,102,241,0.3)"}}>
                    {elapsed>0?"▶ 재개":"▶ 시작"}
                  </button>
                ) : (
                  <button onClick={pause}
                    className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
                    style={{background:"rgba(99,102,241,0.5)"}}>
                    ⏸ 일시정지
                  </button>
                )}
                {elapsed>0&&(
                  <button onClick={stop}
                    className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all"
                    style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
                    ✓ 저장
                  </button>
                )}
                {elapsed>0&&!running&&(
                  <button onClick={()=>setElapsed(0)}
                    className="px-4 py-3 rounded-2xl text-sm"
                    style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
                    ✕ 초기화
                  </button>
                )}
              </div>
            </div>

            {/* 오늘 집계 */}
            {log.filter(e=>e.date===todayISO()).length>0&&(
              <div className="rounded-2xl p-4"
                style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
                <p className="text-xs font-semibold mb-2" style={{color:"var(--text3)"}}>오늘 작업 시간</p>
                {Object.entries(
                  log.filter(e=>e.date===todayISO())
                    .reduce((a,e)=>{a[e.clientName]=(a[e.clientName]||0)+e.seconds;return a;},{})
                ).map(([name,sec])=>(
                  <div key={name} className="flex items-center justify-between py-1">
                    <span className="text-xs" style={{color:"var(--text4)"}}>{name}</span>
                    <span className="text-xs font-mono font-semibold" style={{color:"var(--text)"}}>{fmtMin(sec)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-1" style={{borderTop:"1px solid var(--border)"}}>
                  <span className="text-xs font-semibold" style={{color:"var(--text3)"}}>합계</span>
                  <span className="text-sm font-black" style={{color:"#818cf8"}}>{fmtMin(log.filter(e=>e.date===todayISO()).reduce((a,e)=>a+e.seconds,0))}</span>
                </div>
              </div>
            )}
          </>)}

          {/* ── 로그 ── */}
          {tabView==="log"&&(<>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="month" value={filterM} onChange={e=>setFilterM(e.target.value)}
                className="text-xs outline-none rounded-xl px-3 py-1.5"
                style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
              <div className="flex gap-4 ml-auto flex-wrap">
                {Object.entries(byClient).map(([name,sec])=>(
                  <div key={name} className="text-right">
                    <p className="text-xs" style={{color:"var(--text5)"}}>{name}</p>
                    <p className="text-sm font-bold" style={{color:"var(--text)"}}>{fmtMin(sec)}</p>
                  </div>
                ))}
                <div className="text-right">
                  <p className="text-xs" style={{color:"var(--text5)"}}>총합</p>
                  <p className="text-sm font-black" style={{color:"#818cf8"}}>{fmtMin(totalSec)}</p>
                </div>
              </div>
            </div>

            {Object.entries(byDate).length===0 ? (
              <p className="text-sm text-center py-8" style={{color:"var(--text5)"}}>기록 없음</p>
            ) : (
              Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,entries])=>(
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold" style={{color:"var(--text3)"}}>{date}</span>
                    <div className="flex-1 h-px" style={{background:"var(--border)"}}/>
                    <span className="text-xs font-mono" style={{color:"var(--text5)"}}>{fmtMin(entries.reduce((a,e)=>a+e.seconds,0))}</span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {entries.map(e=>(
                      <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group/le"
                        style={{background:"var(--bg2)",border:"1px solid var(--border)"}}
                        onMouseEnter={el=>el.currentTarget.style.background="var(--hover)"}
                        onMouseLeave={el=>el.currentTarget.style.background="var(--bg2)"}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate" style={{color:"var(--text)"}}>{e.taskName}</p>
                          </div>
                          <p className="text-xs" style={{color:"var(--text5)"}}>
                            {e.clientName} · {e.projName}
                            {e.memo&&<span> · {e.memo}</span>}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono flex-shrink-0" style={{color:"#818cf8"}}>
                          {fmtMin(e.seconds)}
                        </span>
                        <button onClick={()=>deleteEntry(e.id)}
                          className="opacity-0 group-hover/le:opacity-100 transition-opacity text-xs"
                          style={{color:"#f87171"}}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>)}
        </div>
      </div>
    </div>
  );
}
