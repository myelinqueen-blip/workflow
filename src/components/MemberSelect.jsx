/**
 * MemberSelect.jsx
 * 구성원 선택 드롭다운
 * - 프로젝트 구성원 목록에서 선택
 * - 없으면 전체 구성원
 */
import { useState, useRef, useEffect } from "react";

export function MemberAvatar({ member, size="sm" }) {
  if (!member) {
    const s = size==="sm"?"w-5 h-5 text-xs":"w-6 h-6 text-xs";
    return (
      <div className={`${s} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{background:"var(--border2)",color:"var(--text5)"}}>?</div>
    );
  }
  const s = size==="sm"?"w-5 h-5 text-xs":"w-6 h-6 text-xs";
  return (
    <div className={`${s} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{background:member.color}}>
      {member.avatar||member.name[0]}
    </div>
  );
}

export default function MemberSelect({ value, onChange, members, projectMembers, allowNull=true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 표시할 구성원: 프로젝트 구성원 우선, 없으면 전체
  const list = projectMembers?.length ? projectMembers : members;
  const current = members.find(m=>m.id===value);

  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  return (
    <div ref={ref} className="relative inline-flex items-center" onClick={e=>e.stopPropagation()}>
      <button onClick={()=>setOpen(p=>!p)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all"
        style={{
          background: open ? "var(--hover)" : "transparent",
          border:"1px solid transparent",
        }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--border2)";}}
        onMouseLeave={e=>{if(!open)e.currentTarget.style.borderColor="transparent";}}>
        <MemberAvatar member={current} size="sm"/>
        <span className="text-xs" style={{color:current?"var(--text3)":"var(--text5)"}}>
          {current?.name||"미지정"}
        </span>
        <svg className={`w-3 h-3 transition-transform ${open?"rotate-180":""}`}
          style={{color:"var(--text5)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-[9999] top-full left-0 mt-1 rounded-xl shadow-xl py-1 min-w-[140px]"
          style={{background:"var(--bg2)",border:"1px solid var(--border2)"}}>
          {allowNull && (
            <button onClick={()=>{onChange(null);setOpen(false);}}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
              style={{color:"var(--text5)"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div className="w-5 h-5 rounded-full border border-dashed flex items-center justify-center flex-shrink-0"
                style={{borderColor:"var(--border2)"}}>
                <span style={{fontSize:"10px",color:"var(--text5)"}}>—</span>
              </div>
              미지정
            </button>
          )}
          {list.map(m=>(
            <button key={m.id} onClick={()=>{onChange(m.id);setOpen(false);}}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
              style={{background:value===m.id?"var(--hover)":"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
              onMouseLeave={e=>e.currentTarget.style.background=value===m.id?"var(--hover)":"transparent"}>
              <MemberAvatar member={m} size="sm"/>
              <span style={{color:"var(--text2)",fontWeight:value===m.id?"600":"400"}}>{m.name}</span>
              {m.role&&<span className="ml-auto" style={{color:"var(--text5)",fontSize:"10px"}}>{m.role}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
