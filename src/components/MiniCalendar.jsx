/**
 * MiniCalendar.jsx
 * 날짜 클릭 시 뜨는 미니 캘린더 팝업
 */
import { useState, useEffect, useRef } from "react";

const DAYS = ["일","월","화","수","목","금","토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function MiniCalendar({ value, onChange, onClose, anchorRef }) {
  const today = new Date();
  const init  = value ? new Date(value+"T00:00:00") : today;
  const [year,  setYear]  = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());
  const [sel,   setSel]   = useState(value||null);
  const ref = useRef(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const chgMonth = d => {
    let m = month+d, y = year;
    if(m<0){m=11;y--;} else if(m>11){m=0;y++;}
    setYear(y); setMonth(m);
  };

  const getDays = () => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month+1, 0);
    const days  = [];
    for(let i=first.getDay();i>0;i--) days.push({date:new Date(year,month,-i+1),cur:false});
    for(let d=1;d<=last.getDate();d++) days.push({date:new Date(year,month,d),cur:true});
    while(days.length%7!==0) days.push({date:new Date(year,month+1,days.length-last.getDate()),cur:false});
    return days;
  };

  const toISO = d => d.toISOString().slice(0,10);
  const todayISO = toISO(today);

  const select = date => {
    const iso = toISO(date);
    setSel(iso);
    onChange(iso);
    onClose();
  };

  const clear = () => { onChange(null); onClose(); };

  return (
    <div ref={ref}
      className="absolute z-[9999] rounded-2xl shadow-2xl p-3 w-64"
      style={{
        background:"var(--bg2)",
        border:"1px solid var(--border2)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.2)",
        top:"calc(100% + 4px)",
        left:0,
      }}>
      {/* header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <button onClick={()=>chgMonth(-1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{color:"var(--text4)"}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="text-xs font-bold" style={{color:"var(--text)"}}>{year}년 {MONTHS[month]}</span>
        <button onClick={()=>chgMonth(1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{color:"var(--text4)"}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d,i)=>(
          <div key={d} className="text-center text-xs py-0.5 font-medium"
            style={{color:i===0?"#f87171":i===6?"#60a5fa":"var(--text5)"}}>
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-px">
        {getDays().map(({date,cur},idx)=>{
          const iso     = toISO(date);
          const isSel   = iso === sel;
          const isToday = iso === todayISO;
          const isPast  = iso < todayISO;
          const isSun   = date.getDay()===0;
          const isSat   = date.getDay()===6;
          return (
            <button key={idx} onClick={()=>cur&&select(date)}
              disabled={!cur}
              className="h-7 w-full flex items-center justify-center rounded-lg text-xs transition-all"
              style={{
                background: isSel ? "#6366f1" : "transparent",
                color: isSel ? "#fff"
                  : !cur ? "var(--text5)"
                  : isPast ? "var(--text5)"
                  : isSun ? "#f87171"
                  : isSat ? "#60a5fa"
                  : "var(--text)",
                fontWeight: isToday ? "700" : "400",
                outline: isToday && !isSel ? "1.5px solid #6366f1" : "none",
                outlineOffset: "1px",
                opacity: !cur ? 0.3 : 1,
              }}
              onMouseEnter={e=>{if(cur&&!isSel)e.currentTarget.style.background="var(--hover)";}}
              onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2" style={{borderTop:"1px solid var(--border)"}}>
        <button onClick={()=>select(today)}
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{color:"#6366f1"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,0.1)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          오늘
        </button>
        {value && (
          <button onClick={clear}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{color:"#f87171"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            날짜 삭제
          </button>
        )}
        <button onClick={onClose}
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{color:"var(--text4)"}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          닫기
        </button>
      </div>
    </div>
  );
}
