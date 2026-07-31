import { useState, useCallback } from "react";
import { calcTaskPct, calcProjPct, fmtDate, sortSubs } from "../utils.js";

/* ── Design tokens ── */
const STATUS = {
  pending:     {label:"대기",short:"대기",dot:"bg-slate-500",   activeBg:"bg-slate-500",   text:"text-slate-300",  border:"border-slate-500/40"},
  in_progress: {label:"진행",short:"진행",dot:"bg-amber-400",   activeBg:"bg-amber-500",   text:"text-amber-300",  border:"border-amber-500/40"},
  done:        {label:"완료",short:"완료",dot:"bg-emerald-400", activeBg:"bg-emerald-500", text:"text-emerald-300",border:"border-emerald-500/40"},
};

/* ── Shared atoms ── */
const PBar = ({pct})=>{
  const bg=pct===100?"#34d399":pct>=50?"#fbbf24":"#475569";
  return <div className="w-full h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.08)"}}><div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:bg}}/></div>;
};

const SBtn = ({current,onChange})=>(
  <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
    {Object.entries(STATUS).map(([k,v])=>{const on=current===k;return <button key={k} onClick={()=>onChange(k)} className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${on?`${v.activeBg} text-white border-transparent`:`bg-transparent ${v.text} ${v.border} hover:bg-white/5`}`}>{v.short}</button>;})}
  </div>
);

const Modal = ({title,desc,onConfirm,onCancel})=>(
  <div className="fixed inset-0 flex items-center justify-center" style={{zIndex:9999}}>
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}/>
    <div className="relative rounded-2xl p-6 w-80 shadow-2xl" style={{background:"#111120",border:"1px solid rgba(255,255,255,0.12)",zIndex:10000}}>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">{desc}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-400" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>취소</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm text-white bg-rose-600/80 hover:bg-rose-600 transition-colors">삭제</button>
      </div>
    </div>
  </div>
);

const NasMemo = ({value,onChange})=>{
  const [ed,setEd]=useState(false);const [d,setD]=useState(value||"");const [cp,setCp]=useState(false);
  const copy=()=>{if(!value)return;navigator.clipboard.writeText(value).then(()=>{setCp(true);setTimeout(()=>setCp(false),1500);});};
  const save=()=>{onChange(d);setEd(false);};
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-1"><span className="text-xs text-slate-600 font-mono">NAS</span><div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.05)"}}/></div>
      {ed?<div className="flex gap-1.5"><input value={d} onChange={e=>setD(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEd(false);}} className="flex-1 px-2 py-1 text-xs text-slate-300 font-mono outline-none rounded" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.12)"}} placeholder="\\NAS01\프로젝트\폴더명"/><button onClick={save} className="px-2 py-1 rounded bg-indigo-600/70 text-xs text-white">저장</button><button onClick={()=>setEd(false)} className="px-2 py-1 rounded text-xs text-slate-400" style={{background:"rgba(255,255,255,0.05)"}}>취소</button></div>
      :value?<div className="flex items-center gap-1.5"><span className="flex-1 text-xs font-mono text-slate-500 truncate px-2 py-1 rounded" style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.05)"}}>{value}</span><button onClick={copy} className="text-xs text-slate-600 hover:text-slate-300 px-1.5 py-1">{cp?"✓":"복사"}</button><button onClick={()=>{setD(value);setEd(true);}} className="text-xs text-slate-600 hover:text-slate-300 px-1.5 py-1">수정</button></div>
      :<button onClick={()=>setEd(true)} className="text-xs text-slate-700 hover:text-slate-500">+ NAS 경로 추가</button>}
    </div>
  );
};

function SubtaskRow({st,idx,total,onUpdate,onDelete,onMoveUp,onMoveDown}) {
  const [open,setOpen]=useState(false);const [confirm,setConfirm]=useState(false);
  const isDone=st.status==="done";
  return (<>
    {confirm&&<Modal title="세부 업무 삭제" desc={`"${st.name}" 을 삭제할까요?`} onConfirm={()=>{onDelete();setConfirm(false);}} onCancel={()=>setConfirm(false)}/>}
    <div className={`group/sr rounded-lg ${isDone?"opacity-55":""}`}>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-lg">
        <div className="flex flex-col gap-px flex-shrink-0 opacity-0 group-hover/sr:opacity-100 transition-opacity">
          {[["up","M18 15l-6-6-6 6"],["down","M6 9l6 6 6-6"]].map(([dir,path])=>(
            <button key={dir} onClick={()=>dir==="up"?onMoveUp(idx):onMoveDown(idx)} disabled={dir==="up"?idx===0:idx===total-1} className="w-4 h-3 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-20">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3}><path d={path}/></svg>
            </button>
          ))}
        </div>
        <button onClick={()=>onUpdate({status:isDone?"pending":"done"})} className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${isDone?"bg-emerald-500 border-emerald-500":"border-white/20 hover:border-white/50"}`}>
          {isDone&&<svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
        </button>
        {st.dueDate&&<span className={`flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border ${!st.assignee&&!isDone?"text-amber-400 border-amber-500/40 bg-amber-950/30 font-bold":"text-slate-500 border-white/8 bg-white/4"}`}>{fmtDate(st.dueDate)}</span>}
        <span className={`flex-1 text-sm truncate ${isDone?"line-through text-slate-600":!st.assignee?"font-bold text-white":"text-slate-200"}`}>{st.name}</span>
        <span className={`hidden sm:block text-xs flex-shrink-0 px-1.5 py-0.5 rounded border ${!st.assignee&&!isDone?"text-rose-400 font-bold border-rose-500/40 bg-rose-950/30":"text-slate-500 border-white/8 bg-white/4"}`}>{st.assignee||"미지정"}</span>
        <SBtn current={st.status} onChange={v=>onUpdate({status:v})}/>
        <button onClick={()=>setOpen(p=>!p)} className="opacity-0 group-hover/sr:opacity-60 hover:!opacity-100 transition-opacity text-slate-400">
          <svg className={`w-3.5 h-3.5 transition-transform ${open?"rotate-180":""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      {open&&(
        <div className="ml-9 mr-2 mb-2 px-3 py-3 rounded-xl space-y-3" style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500 block mb-1">담당자</label><input value={st.assignee||""} onChange={e=>onUpdate({assignee:e.target.value||null})} className="w-full bg-transparent border-b border-white/10 text-xs text-slate-300 outline-none focus:border-indigo-400 py-0.5" placeholder="이름 입력"/></div>
            <div><label className="text-xs text-slate-500 block mb-1">마감일</label><input type="date" value={st.dueDate||""} onChange={e=>onUpdate({dueDate:e.target.value||null})} className="w-full bg-transparent border-b border-white/10 text-xs text-slate-400 outline-none focus:border-indigo-400 py-0.5" style={{colorScheme:"dark"}}/></div>
          </div>
          <NasMemo value={st.nasPath} onChange={v=>onUpdate({nasPath:v})}/>
          <div className="flex justify-end"><button onClick={()=>setConfirm(true)} className="text-xs text-rose-500/60 hover:text-rose-400">삭제</button></div>
        </div>
      )}
    </div>
  </>);
}

function TaskCard({task,onUpdateTask,onUpdateSubtask,onAddSubtask,onDeleteSubtask,onDeleteTask}) {
  const [exp,setExp]=useState(true);const [edit,setEdit]=useState(false);const [add,setAdd]=useState(false);const [newN,setNewN]=useState("");const [conf,setConf]=useState(false);
  const [dr,setDr]=useState({name:task.name,assignee:task.assignee||"",dueDate:task.dueDate||""});
  const pct=calcTaskPct(task.subtasks);const sorted=sortSubs(task.subtasks);
  const move=(idx,dir)=>{const s=[...sorted];const sw=dir==="up"?idx-1:idx+1;if(sw<0||sw>=s.length)return;[s[idx],s[sw]]=[s[sw],s[idx]];s.forEach((st,i)=>onUpdateSubtask(task.id,st.id,{order:i,orderOverridden:true}));};
  const save=()=>{onUpdateTask(task.id,{name:dr.name.trim()||task.name,assignee:dr.assignee||null,dueDate:dr.dueDate||null});setEdit(false);};
  const addSub=()=>{if(!newN.trim())return;onAddSubtask(task.id,newN.trim());setNewN("");setAdd(false);};
  return (<>
    {conf&&<Modal title="Task 삭제" desc={`"${task.name}"과 모든 세부 업무를 삭제할까요?`} onConfirm={()=>{onDeleteTask(task.id);setConf(false);}} onCancel={()=>setConf(false)}/>}
    <div className="rounded-xl overflow-hidden transition-all" style={{border:`1px solid ${exp?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.06)"}`,background:exp?"rgba(15,15,30,0.6)":"rgba(15,15,30,0.3)"}}>
      {edit?(
        <div className="px-4 py-3 space-y-2.5 border-b" style={{background:"rgba(0,0,0,0.2)",borderColor:"rgba(255,255,255,0.08)"}}>
          <input value={dr.name} onChange={e=>setDr(p=>({...p,name:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEdit(false);}} className="w-full px-3 py-1.5 text-sm text-white font-semibold outline-none rounded-lg" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.12)"}}/>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500 block mb-1">담당자</label><input value={dr.assignee} onChange={e=>setDr(p=>({...p,assignee:e.target.value}))} className="w-full bg-transparent border-b border-white/10 px-0 py-0.5 text-xs text-slate-300 outline-none focus:border-indigo-400" placeholder="이름"/></div>
            <div><label className="text-xs text-slate-500 block mb-1">마감일</label><input type="date" value={dr.dueDate} onChange={e=>setDr(p=>({...p,dueDate:e.target.value}))} className="w-full bg-transparent border-b border-white/10 px-0 py-0.5 text-xs text-slate-400 outline-none focus:border-indigo-400" style={{colorScheme:"dark"}}/></div>
          </div>
          <NasMemo value={task.nasPath} onChange={v=>onUpdateTask(task.id,{nasPath:v})}/>
          <div className="flex gap-2 justify-end pt-0.5">
            <button onClick={()=>setConf(true)} className="text-xs text-rose-500/50 hover:text-rose-400 mr-auto">Task 삭제</button>
            <button onClick={()=>setEdit(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400" style={{background:"rgba(255,255,255,0.05)"}}>취소</button>
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs text-white bg-indigo-600/80 hover:bg-indigo-600">저장</button>
          </div>
        </div>
      ):(
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group/hd" onClick={()=>setExp(p=>!p)}>
          <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${exp?"bg-white/10 border-white/20":"bg-white/3 border-white/8"}`}>
            <svg className={`w-3 h-3 text-slate-400 transition-transform ${exp?"rotate-90":""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white">{task.name}</span>
              {(!task.assignee||!task.dueDate)&&<span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{background:"rgba(190,18,60,0.2)",border:"1px solid rgba(244,63,94,0.3)",color:"#fb7185"}}>미지정</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.dueDate&&<span className="text-xs text-slate-500 font-mono">{fmtDate(task.dueDate)}</span>}
              {task.assignee&&<span className="text-xs text-slate-500">{task.assignee}</span>}
              {task.nasPath&&<span className="text-xs text-slate-700">📁 NAS</span>}
              <div className="w-20"><PBar pct={pct}/></div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xl font-mono font-bold tabular-nums ${pct===100?"text-emerald-400":pct>0?"text-amber-400":"text-slate-700"}`}>{pct}<span className="text-xs text-slate-700">%</span></span>
            <button onClick={e=>{e.stopPropagation();setDr({name:task.name,assignee:task.assignee||"",dueDate:task.dueDate||""});setEdit(true);}} className="opacity-0 group-hover/hd:opacity-60 hover:!opacity-100 p-1.5 rounded-lg hover:bg-white/8 text-slate-400">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      )}
      {exp&&!edit&&(
        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {!sorted.length&&<p className="px-6 py-3 text-xs text-slate-700 italic">세부 업무가 없습니다</p>}
          <div className="px-1 pt-1">
            {sorted.map((st,i)=><SubtaskRow key={st.id} st={st} idx={i} total={sorted.length} onUpdate={upd=>onUpdateSubtask(task.id,st.id,upd)} onDelete={()=>onDeleteSubtask(task.id,st.id)} onMoveUp={idx=>move(idx,"up")} onMoveDown={idx=>move(idx,"down")}/>)}
          </div>
          <div className="px-3 py-2">
            {add?<div className="flex gap-1.5"><input value={newN} onChange={e=>setNewN(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")addSub();if(e.key==="Escape"){setAdd(false);setNewN("");}}} className="flex-1 px-2 py-1.5 text-xs text-slate-200 outline-none rounded-lg" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.12)"}} placeholder="세부 업무 이름"/><button onClick={addSub} className="px-3 py-1.5 rounded-lg text-xs text-white bg-indigo-600/80">추가</button><button onClick={()=>{setAdd(false);setNewN("");}} className="px-2 py-1.5 rounded-lg text-xs text-slate-400" style={{background:"rgba(255,255,255,0.05)"}}>취소</button></div>
            :<button onClick={e=>{e.stopPropagation();setAdd(true);}} className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-400 group"><span className="w-4 h-4 rounded border border-slate-800 group-hover:border-slate-600 flex items-center justify-center">+</span>세부 업무 추가</button>}
          </div>
        </div>
      )}
    </div>
  </>);
}

export default function TaskTab({clients,onUpdateSubtask,onUpdateTask,onAddTask,onAddSubtask,onDeleteSubtask,onDeleteTask}) {
  const [ac,setAc]=useState(clients[0]?.id);const [ap,setAp]=useState(clients[0]?.projects[0]?.id);const [view,setView]=useState("list");const [addM,setAddM]=useState(false);const [nt,setNt]=useState({name:"",assignee:"",dueDate:""});
  const client=clients.find(c=>c.id===ac);const project=client?.projects.find(p=>p.id===ap);const pct=project?calcProjPct(project.tasks):0;
  const allSubs=project?.tasks.flatMap(t=>t.subtasks)||[];
  const handleAdd=()=>{if(!nt.name.trim())return;onAddTask(ac,ap,nt.name.trim(),nt.assignee||null,nt.dueDate||null);setNt({name:"",assignee:"",dueDate:""});setAddM(false);};
  const bucket=t=>{const p=calcTaskPct(t.subtasks);return p===100?"done":p>0?"in_progress":"pending";};
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-5 py-4 space-y-3" style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="flex gap-1.5 flex-wrap">{clients.map(c=><button key={c.id} onClick={()=>{setAc(c.id);setAp(c.projects[0]?.id);}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all" style={ac===c.id?{background:`${c.color}18`,border:`1px solid ${c.color}44`,color:"#fff"}:{border:"1px solid transparent",color:"#64748b"}}><div className="w-2 h-2 rounded-full" style={{background:c.color}}/>{c.name}</button>)}</div>
        {client&&<div className="flex gap-1 flex-wrap">{client.projects.map(p=><button key={p.id} onClick={()=>setAp(p.id)} className={`px-3 py-1 rounded-xl text-xs transition-all ${ap===p.id?"text-white":"text-slate-500 hover:text-slate-300"}`} style={ap===p.id?{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.18)"}:{border:"1px solid transparent"}}>{p.name}<span className="ml-1.5 font-mono text-slate-600">{calcProjPct(p.tasks)}%</span></button>)}</div>}
        {project&&(
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><h2 className="font-bold text-white text-base">{project.name}</h2><span className="text-xs text-slate-600 hidden md:block">{project.description}</span></div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="w-32"><PBar pct={pct}/></div>
                <span className={`text-sm font-mono font-bold ${pct===100?"text-emerald-400":pct>0?"text-amber-400":"text-slate-600"}`}>{pct}%</span>
                <div className="flex gap-1.5">{[["완료",allSubs.filter(s=>s.status==="done").length,"#34d399"],["진행",allSubs.filter(s=>s.status==="in_progress").length,"#fbbf24"],["대기",allSubs.filter(s=>s.status==="pending").length,"#94a3b8"]].map(([l,n,c])=><span key={l} className="text-xs px-2 py-0.5 rounded-full" style={{color:c,background:`${c}18`,border:`1px solid ${c}30`}}>{l} {n}</span>)}</div>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-lg flex-shrink-0" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)"}}>
              {[["list","☰ 리스트"],["kanban","⊞ 칸반"]].map(([v,l])=><button key={v} onClick={()=>setView(v)} className={`px-3 py-1 rounded text-xs transition-all ${view===v?"text-white":"text-slate-500 hover:text-slate-300"}`} style={view===v?{background:"rgba(255,255,255,0.1)"}:{}}>{l}</button>)}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {project?(
          view==="list"?(
            <div className="space-y-3 max-w-3xl">
              {project.tasks.map(task=><TaskCard key={task.id} task={task} onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)} onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)} onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)} onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)} onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>)}
              <div className="pt-1">
                {addM?(
                  <div className="rounded-xl p-4 space-y-3" style={{border:"1px solid rgba(99,102,241,0.3)",background:"rgba(15,15,30,0.6)"}}>
                    <input value={nt.name} onChange={e=>setNt(p=>({...p,name:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")handleAdd();if(e.key==="Escape")setAddM(false);}} className="w-full px-3 py-2 text-sm text-slate-200 outline-none rounded-xl font-medium" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.12)"}} placeholder="Task 이름"/>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-slate-500 block mb-1">담당자</label><input value={nt.assignee} onChange={e=>setNt(p=>({...p,assignee:e.target.value}))} className="w-full bg-transparent border-b border-white/10 text-xs text-slate-300 outline-none focus:border-indigo-400 py-0.5" placeholder="이름"/></div>
                      <div><label className="text-xs text-slate-500 block mb-1">마감일</label><input type="date" value={nt.dueDate} onChange={e=>setNt(p=>({...p,dueDate:e.target.value}))} className="w-full bg-transparent border-b border-white/10 text-xs text-slate-400 outline-none focus:border-indigo-400 py-0.5" style={{colorScheme:"dark"}}/></div>
                    </div>
                    <div className="flex gap-2 justify-end"><button onClick={()=>setAddM(false)} className="px-3 py-1.5 rounded-xl text-sm text-slate-400" style={{background:"rgba(255,255,255,0.05)"}}>취소</button><button onClick={handleAdd} className="px-4 py-1.5 rounded-xl text-sm text-white bg-indigo-600/80 hover:bg-indigo-600">Task 추가</button></div>
                  </div>
                ):<button onClick={()=>setAddM(true)} className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-400 group px-1"><span className="w-5 h-5 rounded border border-slate-800 group-hover:border-indigo-500/40 flex items-center justify-center">+</span>새 Task 추가</button>}
              </div>
            </div>
          ):(
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["pending","in_progress","done"].map(status=>{
                const cfg={pending:{label:"대기중",dot:"bg-slate-400"},in_progress:{label:"진행중",dot:"bg-amber-400"},done:{label:"완료",dot:"bg-emerald-400"}}[status];
                const ct=project.tasks.filter(t=>bucket(t)===status);
                return <div key={status} className="flex flex-col gap-3"><div className="flex items-center gap-2 px-1"><div className={`w-2 h-2 rounded-full ${cfg.dot}`}/><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cfg.label}</span><span className="text-xs text-slate-700 px-1.5 rounded-full" style={{background:"rgba(255,255,255,0.04)"}}>{ct.length}</span></div><div className="space-y-3 min-h-16">{ct.map(task=><TaskCard key={task.id} task={task} onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)} onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)} onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)} onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)} onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>)}{!ct.length&&<div className="h-16 rounded-xl flex items-center justify-center" style={{border:"1px dashed rgba(255,255,255,0.05)"}}><span className="text-xs text-slate-800">없음</span></div>}</div></div>;
              })}
            </div>
          )
        ):<div className="flex items-center justify-center h-full text-slate-700"><div className="text-center"><div className="text-4xl mb-2">◈</div><div className="text-sm">프로젝트를 선택하세요</div></div></div>}
      </div>
    </div>
  );
}
