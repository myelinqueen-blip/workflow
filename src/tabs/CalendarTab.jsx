import { useState, useMemo } from "react";
import { calcTaskPct, fmtDate } from "../utils.js";

const STATUS_DOT = { done:"#34d399", in_progress:"#fbbf24", pending:"#475569" };
const DAYS_KO    = ["일","월","화","수","목","금","토"];
const MONTHS_KO  = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function CalendarTab({ projects }) {
  const flatSubs = useMemo(() => projects.flatMap(p =>
    p.tasks.flatMap(t => t.subtasks.filter(s => s.dueDate).map(s => ({
      ...s, taskName:t.name, projectName:p.name, color:p.color||"#6366f1"
    })))
  ), [projects]);

  const today = new Date();
  const [year,  setYear]   = useState(today.getFullYear());
  const [month, setMonth]  = useState(today.getMonth());
  const [selWeek, setSelWeek] = useState(today);
  const [filter, setFilter] = useState(new Set());

  const getDays = () => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month+1, 0);
    const days  = [];
    for (let i = first.getDay(); i > 0; i--) days.push({ date: new Date(year, month, -i+1), cur: false });
    for (let d = 1; d <= last.getDate(); d++) days.push({ date: new Date(year, month, d), cur: true });
    for (let i = 1; i <= 6 - last.getDay(); i++) days.push({ date: new Date(year, month+1, i), cur: false });
    return days;
  };

  const dotsFor = date => {
    const iso = date.toISOString().slice(0, 10);
    return flatSubs.filter(s => s.dueDate === iso && (!filter.size || filter.has(s.status)));
  };

  const weekDays = (() => {
    const d = new Date(selWeek);
    d.setDate(d.getDate() - d.getDay());
    return Array.from({ length:7 }, (_, i) => { const dd = new Date(d); dd.setDate(dd.getDate()+i); return dd; });
  })();

  const byDay = weekDays.reduce((m, d) => {
    const iso = d.toISOString().slice(0, 10);
    m[iso] = flatSubs.filter(s => s.dueDate === iso);
    return m;
  }, {});

  const chgMonth = delta => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setYear(y); setMonth(m);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* calendar */}
      <div className="lg:w-80 xl:w-96 flex-shrink-0 px-4 py-4 overflow-y-auto" style={{ borderRight:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => chgMonth(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/8"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg></button>
          <span className="text-sm font-bold text-white">{year}년 {MONTHS_KO[month]}</span>
          <button onClick={() => chgMonth(1)}  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/8"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg></button>
        </div>
        {/* filter pills */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {[["done","완료","#34d399"],["in_progress","진행","#fbbf24"],["pending","대기","#475569"]].map(([k,l,c]) => (
            <button key={k} onClick={() => setFilter(p => { const n = new Set(p); n.has(k)?n.delete(k):n.add(k); return n; })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all"
              style={filter.has(k)?{background:`${c}18`,borderColor:`${c}50`,color:c}:{borderColor:"rgba(255,255,255,0.08)",color:"#475569"}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:c }}/>{l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAYS_KO.map((d,i) => <div key={d} className={`text-center text-xs py-1 font-medium ${i===0?"text-rose-400":i===6?"text-blue-400":"text-slate-600"}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {getDays().map(({ date, cur }, idx) => {
            const dots   = dotsFor(date);
            const isToday = date.toISOString().slice(0,10) === today.toISOString().slice(0,10);
            const inWeek  = weekDays.some(d => d.toISOString().slice(0,10) === date.toISOString().slice(0,10));
            return (
              <button key={idx} onClick={() => setSelWeek(date)}
                className={`flex flex-col items-center pt-1.5 pb-1.5 rounded-lg min-h-[46px] transition-all ${!cur?"opacity-30":""}`}
                style={inWeek?{background:"rgba(99,102,241,0.15)",outline:"1px solid rgba(99,102,241,0.3)"}:{}}>
                <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${isToday?"bg-indigo-500 text-white font-bold":cur?"text-slate-300":"text-slate-700"} ${date.getDay()===0?"!text-rose-300":date.getDay()===6?"!text-blue-300":""}`}>
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full px-0.5">
                  {dots.slice(0,3).map((d,i) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:STATUS_DOT[d.status]||"#475569" }}/>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* weekly */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">주간 업무</h3>
          <span className="text-xs text-slate-500">{weekDays[0]?.getMonth()+1}/{weekDays[0]?.getDate()} — {weekDays[6]?.getMonth()+1}/{weekDays[6]?.getDate()}</span>
        </div>
        <div className="space-y-2">
          {weekDays.map(day => {
            const iso   = day.toISOString().slice(0, 10);
            const subs  = byDay[iso] || [];
            const isToday = iso === today.toISOString().slice(0, 10);
            return (
              <div key={iso} className="rounded-xl overflow-hidden" style={{ border:`1px solid ${isToday?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.06)"}`, background:isToday?"rgba(49,46,129,0.2)":"rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0`}
                    style={isToday?{background:"#6366f1",color:"#fff"}:{background:"rgba(255,255,255,0.05)",color:day.getDay()===0?"#fca5a5":day.getDay()===6?"#93c5fd":"#94a3b8"}}>
                    {day.getDate()}
                  </div>
                  <span className={`text-xs font-semibold ${isToday?"text-indigo-300":"text-slate-500"}`}>{DAYS_KO[day.getDay()]}요일</span>
                  {isToday&&<span className="ml-auto text-xs text-indigo-400 px-1.5 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.3)"}}>오늘</span>}
                  {subs.length>0&&!isToday&&<span className="ml-auto text-xs text-slate-700">{subs.length}건</span>}
                </div>
                <div className="px-2 py-1.5">
                  {subs.length===0 ? <p className="text-xs text-slate-800 px-1 py-1">—</p> : subs.map((s,i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${s.status==="done"?"bg-emerald-500 border-emerald-500":"border-white/20"}`}>
                        {s.status==="done"&&<svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs block truncate ${s.status==="done"?"line-through text-slate-600":"text-slate-200"}`}>{s.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1 h-1 rounded-full" style={{ background:s.color }}/>
                          <span className="text-xs text-slate-600 truncate">{s.taskName}</span>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:STATUS_DOT[s.status]||"#475569" }}/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
