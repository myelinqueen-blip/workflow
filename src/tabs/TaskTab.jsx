import { useState, useRef, useCallback } from "react";
import { calcTaskPct, calcProjPct, fmtDate, sortSubs, mkId, todayISO } from "../utils.js";
import MiniCalendar from "../components/MiniCalendar.jsx";
import MemberSelect, { MemberAvatar } from "../components/MemberSelect.jsx";
import NasLink from "../components/NasLink.jsx";

const ST = {
  pending:     {label:"대기",dot:"#94a3b8",active:"rgba(71,85,105,0.8)"},
  in_progress: {label:"진행",dot:"#fbbf24",active:"rgba(217,119,6,0.85)"},
  done:        {label:"완료",dot:"#34d399",active:"rgba(5,150,105,0.85)"},
};
const CLIENT_COLORS = ["#6366f1","#f43f5e","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

/* ── Date Button with Mini Calendar ── */
function DateBtn({ value, onChange, className="" }) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button onClick={e=>{e.stopPropagation();setOpen(p=>!p);}}
        className="flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-lg border transition-all"
        style={value
          ?{color:"var(--text3)",borderColor:"var(--border)",background:"var(--hover)"}
          :{color:"var(--text5)",borderColor:"var(--border)",background:"transparent"}}>
        <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {value ? fmtDate(value) : "날짜"}
      </button>
      {open && (
        <MiniCalendar value={value} anchorRef={ref}
          onChange={v=>{onChange(v);setOpen(false);}}
          onClose={()=>setOpen(false)}/>
      )}
    </div>
  );
}

/* ── Status Buttons ── */
function SBtn({ current, onChange }) {
  return (
    <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
      {Object.entries(ST).map(([k,v])=>{
        const on=current===k;
        return <button key={k} onClick={()=>onChange(k)}
          className="px-2 py-0.5 rounded-lg text-xs font-medium transition-all"
          style={on?{background:v.active,color:"#fff"}:{background:`${v.dot}18`,color:v.dot}}>
          {v.label}
        </button>;
      })}
    </div>
  );
}

/* ── Confirm ── */
function Confirm({title,onOk,onCancel}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative rounded-2xl p-5 w-72 shadow-2xl"
        style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
        <p className="text-sm font-semibold mb-4" style={{color:"var(--text)"}}>{title}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-xs"
            style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
          <button onClick={onOk} className="px-3 py-1.5 rounded-xl text-xs text-white bg-rose-600">삭제</button>
        </div>
      </div>
    </div>
  );
}

/* ── Subtask Row ── */
function SubRow({ st, idx, total, members, projMembers, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [open,setOpen]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [editName,setEditName]=useState(false);
  const [nameDraft,setNameDraft]=useState(st.name);
  const isDone=st.status==="done";
  const member=members.find(m=>m.id===st.assigneeId);
  const saveName=()=>{if(nameDraft.trim())onUpdate({name:nameDraft.trim()});setEditName(false);};

  return (<>
    {confirm&&<Confirm title={`"${st.name}" 삭제할까요?`} onOk={()=>{onDelete();setConfirm(false);}} onCancel={()=>setConfirm(false)}/>}
    <div className={`group/sr rounded-xl ${isDone?"opacity-50":""}`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
        onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        {/* reorder */}
        <div className="flex flex-col gap-px opacity-0 group-hover/sr:opacity-100 transition-opacity flex-shrink-0">
          {[["u","M18 15l-6-6-6 6"],["d","M6 9l6 6 6-6"]].map(([dir,path])=>(
            <button key={dir} disabled={dir==="u"?idx===0:idx===total-1}
              onClick={()=>dir==="u"?onMoveUp(idx):onMoveDown(idx)}
              className="w-4 h-3 flex items-center justify-center disabled:opacity-20"
              style={{color:"var(--text5)"}}>
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3}><path d={path}/></svg>
            </button>
          ))}
        </div>
        {/* check */}
        <button onClick={()=>onUpdate({status:isDone?"pending":"done"})}
          className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all"
          style={isDone?{background:"#10b981",borderColor:"#10b981"}:{borderColor:"var(--border2)"}}>
          {isDone&&<svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
        </button>
        {/* name */}
        <div className="flex-1 min-w-0">
          {editName
            ? <input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} autoFocus
                onBlur={saveName} onKeyDown={e=>{if(e.key==="Enter")saveName();if(e.key==="Escape"){setEditName(false);setNameDraft(st.name);}}}
                className="w-full px-2 py-0.5 text-sm outline-none rounded-lg"
                style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.5)",color:"var(--text)"}}/>
            : <span onClick={()=>{setNameDraft(st.name);setEditName(true);}} title="클릭하여 수정"
                className={`text-sm cursor-text block truncate ${isDone?"line-through":""}`}
                style={{color:isDone?"var(--text5)":"var(--text)"}}>
                {st.name}
              </span>}
        </div>
        {/* date */}
        <DateBtn value={st.dueDate} onChange={v=>onUpdate({dueDate:v})}/>
        {/* assignee */}
        <MemberSelect value={st.assigneeId} onChange={v=>onUpdate({assigneeId:v})}
          members={members} projectMembers={projMembers}/>
        <SBtn current={st.status} onChange={v=>onUpdate({status:v})}/>
        <button onClick={()=>setOpen(p=>!p)}
          className="opacity-0 group-hover/sr:opacity-60 hover:!opacity-100 flex-shrink-0 transition-opacity"
          style={{color:"var(--text4)"}}>
          <svg className={`w-3.5 h-3.5 transition-transform ${open?"rotate-180":""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      {open&&(
        <div className="ml-9 mr-2 mb-2 px-3 py-3 rounded-xl space-y-2"
          style={{background:"var(--input)",border:"1px solid var(--border)"}}>
          <NasLink nasPath={st.nasPath} links={st.links||[]}
            onUpdateNas={v=>onUpdate({nasPath:v})}
            onUpdateLinks={v=>onUpdate({links:v})}/>
          <div className="flex justify-end pt-1">
            <button onClick={()=>setConfirm(true)} className="text-xs" style={{color:"#f87171"}}>삭제</button>
          </div>
        </div>
      )}
    </div>
  </>);
}

/* ── Task Card ── */
function TaskCard({ task, members, projMembers, onUpdateTask, onUpdateSubtask, onAddSubtask, onDeleteSubtask, onDeleteTask }) {
  const [exp,setExp]=useState(true);
  const [addMode,setAddMode]=useState(false);
  const [newN,setNewN]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [editName,setEditName]=useState(false);
  const [nameDraft,setNameDraft]=useState(task.name);
  const [showDetail,setShowDetail]=useState(false);

  const pct=calcTaskPct(task.subtasks);
  const sorted=sortSubs(task.subtasks);
  const member=members.find(m=>m.id===task.assigneeId);

  const move=(idx,dir)=>{
    const s=[...sorted];const sw=dir==="u"?idx-1:idx+1;
    if(sw<0||sw>=s.length)return;
    [s[idx],s[sw]]=[s[sw],s[idx]];
    s.forEach((st,i)=>onUpdateSubtask(task.id,st.id,{order:i,orderOverridden:true}));
  };

  const saveName=()=>{if(nameDraft.trim())onUpdateTask(task.id,{name:nameDraft.trim()});setEditName(false);};
  const addSub=()=>{if(!newN.trim())return;onAddSubtask(task.id,newN.trim());setNewN("");setAddMode(false);};

  return (<>
    {confirm&&<Confirm title={`"${task.name}" 전체 삭제할까요?`} onOk={()=>{onDeleteTask(task.id);setConfirm(false);}} onCancel={()=>setConfirm(false)}/>}

    <div className="rounded-2xl overflow-hidden transition-all"
      style={{border:`1px solid ${exp?"var(--border2)":"var(--border)"}`,background:"var(--bg2)",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>

      {/* task header */}
      <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer group/hd"
        onClick={()=>setExp(p=>!p)}>
        {/* expand */}
        <div className="w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0"
          style={{background:exp?"var(--border2)":"var(--hover)",borderColor:"var(--border2)"}}>
          <svg className={`w-3 h-3 transition-transform ${exp?"rotate-90":""}`}
            style={{color:"var(--text4)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </div>

        {/* name - 클릭하면 인라인 편집 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editName
              ? <div className="flex-1" onClick={e=>e.stopPropagation()}>
                  <input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} autoFocus
                    onBlur={saveName}
                    onKeyDown={e=>{if(e.key==="Enter")saveName();if(e.key==="Escape"){setEditName(false);setNameDraft(task.name);}}}
                    className="w-full px-2 py-0.5 text-sm font-semibold outline-none rounded-lg"
                    style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.5)",color:"var(--text)"}}/>
                </div>
              : <span onClick={e=>{e.stopPropagation();setNameDraft(task.name);setEditName(true);}}
                  className="font-semibold text-sm cursor-text" style={{color:"var(--text)"}} title="클릭: 이름 수정">
                  {task.name}
                </span>}
            {(!task.assigneeId||!task.dueDate)&&(
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{background:"rgba(244,63,94,0.1)",color:"#fb7185",border:"1px solid rgba(244,63,94,0.2)"}}>
                미지정
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* date - 클릭하면 달력 */}
            <div onClick={e=>e.stopPropagation()}>
              <DateBtn value={task.dueDate} onChange={v=>onUpdateTask(task.id,{dueDate:v})}/>
            </div>
            {/* assignee - 클릭하면 드롭다운 */}
            <div onClick={e=>e.stopPropagation()}>
              <MemberSelect value={task.assigneeId} onChange={v=>onUpdateTask(task.id,{assigneeId:v})}
                members={members} projectMembers={projMembers}/>
            </div>
            {task.nasPath&&<span className="text-xs" style={{color:"var(--text5)"}}>📁</span>}
            {(task.links||[]).length>0&&<span className="text-xs" style={{color:"var(--text5)"}}>{(task.links||[]).length}개 링크</span>}
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{background:"var(--border2)"}}>
              <div className="h-full rounded-full transition-all"
                style={{width:`${pct}%`,background:pct===100?"#34d399":pct>=50?"#fbbf24":"#94a3b8"}}/>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-mono font-bold tabular-nums"
            style={{color:pct===100?"#34d399":pct>0?"#fbbf24":"var(--text5)"}}>
            {pct}<span className="text-xs" style={{color:"var(--text5)"}}>%</span>
          </span>
          {/* detail toggle */}
          <button onClick={e=>{e.stopPropagation();setShowDetail(p=>!p);}}
            className="opacity-0 group-hover/hd:opacity-60 hover:!opacity-100 p-1.5 rounded-lg transition-all"
            style={{color:"var(--text4)"}} title="NAS·링크 편집">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* detail panel (NAS, links, delete) */}
      {showDetail&&(
        <div className="px-4 pb-3 pt-0" style={{borderTop:"1px solid var(--border)"}}>
          <div className="mt-2.5">
            <NasLink nasPath={task.nasPath} links={task.links||[]}
              onUpdateNas={v=>onUpdateTask(task.id,{nasPath:v})}
              onUpdateLinks={v=>onUpdateTask(task.id,{links:v})}/>
          </div>
          <div className="flex justify-end mt-2">
            <button onClick={()=>setConfirm(true)} className="text-xs" style={{color:"#f87171"}}>Task 삭제</button>
          </div>
        </div>
      )}

      {/* subtasks */}
      {exp&&(
        <div style={{borderTop:"1px solid var(--border)"}}>
          {!sorted.length&&<p className="px-6 py-2 text-xs italic" style={{color:"var(--text5)"}}>세부 업무 없음</p>}
          <div className="px-1 pt-1">
            {sorted.map((st,i)=>(
              <SubRow key={st.id} st={st} idx={i} total={sorted.length}
                members={members} projMembers={projMembers}
                onUpdate={u=>onUpdateSubtask(task.id,st.id,u)}
                onDelete={()=>onDeleteSubtask(task.id,st.id)}
                onMoveUp={idx=>move(idx,"u")}
                onMoveDown={idx=>move(idx,"d")}/>
            ))}
          </div>
          <div className="px-3 py-2">
            {addMode
              ? <div className="flex gap-1.5">
                  <input value={newN} onChange={e=>setNewN(e.target.value)} autoFocus
                    onKeyDown={e=>{if(e.key==="Enter")addSub();if(e.key==="Escape"){setAddMode(false);setNewN("");}}}
                    placeholder="세부 업무 이름" className="flex-1 px-2 py-1.5 text-xs outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text)"}}/>
                  <button onClick={addSub} className="px-3 py-1.5 rounded-xl text-xs text-white bg-indigo-600">추가</button>
                  <button onClick={()=>{setAddMode(false);setNewN("");}} className="px-2 py-1.5 rounded-xl text-xs"
                    style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
                </div>
              : <button onClick={e=>{e.stopPropagation();setAddMode(true);}}
                  className="flex items-center gap-1.5 text-xs transition-colors" style={{color:"var(--text5)"}}>
                  <span className="w-4 h-4 rounded-lg border flex items-center justify-center" style={{borderColor:"var(--border2)"}}>+</span>
                  세부 업무 추가
                </button>}
          </div>
        </div>
      )}
    </div>
  </>);
}

/* ── Add Client/Project Modals ── */
function AddClientModal({onAdd,onClose}) {
  const [name,setName]=useState("");const [color,setColor]=useState(CLIENT_COLORS[0]);
  const submit=()=>{if(!name.trim())return;onAdd(name.trim(),color);onClose();};
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative rounded-2xl p-5 w-72 shadow-2xl"
        style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
        <h3 className="font-bold mb-4 text-sm" style={{color:"var(--text)"}}>새 클라이언트</h3>
        <input value={name} onChange={e=>setName(e.target.value)} autoFocus
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="클라이언트 이름" className="w-full px-3 py-2 text-sm outline-none rounded-xl mb-3"
          style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
        <div className="flex gap-2 flex-wrap mb-4">
          {CLIENT_COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} className="w-7 h-7 rounded-full transition-all"
              style={{background:c,outline:color===c?`2px solid ${c}`:"2px solid transparent",outlineOffset:"2px"}}/>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs"
            style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
          <button onClick={submit} className="px-4 py-1.5 rounded-xl text-xs text-white"
            style={{background:color}}>추가</button>
        </div>
      </div>
    </div>
  );
}

function AddProjectModal({onAdd,onClose}) {
  const [name,setName]=useState("");const [desc,setDesc]=useState("");
  const submit=()=>{if(!name.trim())return;onAdd(name.trim(),desc.trim());onClose();};
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative rounded-2xl p-5 w-80 shadow-2xl"
        style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
        <h3 className="font-bold mb-4 text-sm" style={{color:"var(--text)"}}>새 프로젝트</h3>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} autoFocus
            onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="프로젝트 이름 *" className="w-full px-3 py-2 text-sm outline-none rounded-xl"
            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
          <input value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="설명 (선택)" className="w-full px-3 py-2 text-sm outline-none rounded-xl"
            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs"
            style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
          <button onClick={submit} className="px-4 py-1.5 rounded-xl text-xs text-white bg-indigo-600">추가</button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Tab Root ── */
export default function TaskTab({
  clients, members,
  onUpdateSubtask, onUpdateTask,
  onAddTask, onAddSubtask,
  onDeleteSubtask, onDeleteTask,
  onAddClient, onAddProject,
  onReorderProjects,
  // 사이드바에서 프로젝트 선택 시 전달
  selectedClientId, selectedProjectId,
}) {
  const [ac,setAc]=useState(selectedClientId||clients[0]?.id);
  const [ap,setAp]=useState(selectedProjectId||clients[0]?.projects[0]?.id);
  const [view,setView]=useState("list");
  const [addTaskMode,setAddTaskMode]=useState(false);
  const [nt,setNt]=useState({name:"",assigneeId:null,dueDate:""});
  const [showAddClient,setShowAddClient]=useState(false);
  const [showAddProject,setShowAddProject]=useState(false);

  // 사이드바에서 선택 바뀌면 반영
  useState(()=>{
    if(selectedClientId) setAc(selectedClientId);
    if(selectedProjectId) setAp(selectedProjectId);
  });

  const switchClient=cid=>{
    const c=clients.find(x=>x.id===cid);
    setAc(cid); setAp(c?.projects[0]?.id||null);
  };

  const client=clients.find(c=>c.id===ac);
  const project=client?.projects.find(p=>p.id===ap);
  const pct=project?calcProjPct(project.tasks):0;
  const allSubs=project?.tasks.flatMap(t=>t.subtasks)||[];
  const projMembers=project ? members.filter(m=>(project.memberIds||[]).includes(m.id)) : members;

  const handleAddTask=()=>{
    if(!nt.name.trim())return;
    onAddTask(ac,ap,nt.name.trim(),nt.assigneeId,nt.dueDate||null);
    setNt({name:"",assigneeId:null,dueDate:""}); setAddTaskMode(false);
  };

  /* drag-to-reorder projects */
  const dragItem=useRef(null);
  const dragOver=useRef(null);
  const handleDragStart=(e,idx)=>{dragItem.current=idx;e.dataTransfer.effectAllowed="move";};
  const handleDragEnter=(e,idx)=>{dragOver.current=idx;e.preventDefault();};
  const handleDrop=()=>{
    if(dragItem.current===null||dragOver.current===null||!client)return;
    onReorderProjects(ac,dragItem.current,dragOver.current);
    dragItem.current=null;dragOver.current=null;
  };

  const bucket=t=>{const p=calcTaskPct(t.subtasks);return p===100?"done":p>0?"in_progress":"pending";};

  return (<>
    {showAddClient&&<AddClientModal onAdd={(n,c)=>{onAddClient(n,c);setShowAddClient(false);}} onClose={()=>setShowAddClient(false)}/>}
    {showAddProject&&<AddProjectModal onAdd={(n,d)=>{onAddProject(ac,n,d);setShowAddProject(false);}} onClose={()=>setShowAddProject(false)}/>}

    <div className="flex flex-col h-full overflow-hidden">
      {/* top bar */}
      <div className="flex-shrink-0 px-5 py-3 space-y-2" style={{borderBottom:"1px solid var(--border)"}}>
        {/* clients */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {clients.map(c=>(
            <button key={c.id} onClick={()=>switchClient(c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={ac===c.id
                ?{background:`${c.color}18`,border:`1px solid ${c.color}40`,color:"var(--text)"}
                :{border:"1px solid transparent",color:"var(--text4)"}}>
              <div className="w-2 h-2 rounded-full" style={{background:c.color}}/>{c.name}
            </button>
          ))}
          <button onClick={()=>setShowAddClient(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all"
            style={{border:"1px dashed var(--border2)",color:"var(--text5)"}}>
            + 클라이언트
          </button>
        </div>

        {/* projects — drag to reorder */}
        {client&&(
          <div className="flex gap-1 flex-wrap items-center">
            {client.projects.map((p,idx)=>(
              <button key={p.id}
                draggable
                onDragStart={e=>handleDragStart(e,idx)}
                onDragEnter={e=>handleDragEnter(e,idx)}
                onDragOver={e=>e.preventDefault()}
                onDrop={handleDrop}
                onClick={()=>setAp(p.id)}
                className="px-3 py-1 rounded-xl text-xs transition-all cursor-grab active:cursor-grabbing"
                style={ap===p.id
                  ?{background:"var(--border2)",border:"1px solid var(--border2)",color:"var(--text)"}
                  :{border:"1px solid transparent",color:"var(--text4)"}}>
                {p.name}
                <span className="ml-1.5 font-mono" style={{color:"var(--text5)"}}>{calcProjPct(p.tasks)}%</span>
              </button>
            ))}
            <button onClick={()=>setShowAddProject(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs"
              style={{border:"1px dashed var(--border2)",color:"var(--text5)"}}>
              + 프로젝트
            </button>
          </div>
        )}

        {/* project stats */}
        {project&&(
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm" style={{color:"var(--text)"}}>{project.name}</h2>
                {project.description&&<span className="text-xs hidden md:block" style={{color:"var(--text5)"}}>{project.description}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="w-24 h-1 rounded-full overflow-hidden" style={{background:"var(--border2)"}}>
                  <div className="h-full rounded-full" style={{width:`${pct}%`,background:pct===100?"#34d399":pct>=50?"#fbbf24":"#94a3b8"}}/>
                </div>
                <span className="text-sm font-mono font-bold"
                  style={{color:pct===100?"#34d399":pct>0?"#fbbf24":"var(--text5)"}}>{pct}%</span>
                {[["완료",allSubs.filter(s=>s.status==="done").length,"#34d399"],
                  ["진행",allSubs.filter(s=>s.status==="in_progress").length,"#fbbf24"],
                  ["대기",allSubs.filter(s=>s.status==="pending").length,"#94a3b8"]].map(([l,n,c])=>(
                  <span key={l} className="text-xs px-2 py-0.5 rounded-full"
                    style={{color:c,background:`${c}15`,border:`1px solid ${c}30`}}>{l} {n}</span>
                ))}
                {/* 구성원 아바타 */}
                <div className="flex -space-x-1.5 ml-1">
                  {projMembers.slice(0,5).map(m=>(
                    <div key={m.id} title={m.name}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold"
                      style={{background:m.color,borderColor:"var(--bg2)"}}>
                      {m.avatar||m.name[0]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-xl flex-shrink-0"
              style={{background:"var(--input)",border:"1px solid var(--border)"}}>
              {[["list","☰"],["kanban","⊞"]].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)}
                  className="px-3 py-1 rounded-lg text-xs transition-all"
                  style={view===v?{background:"var(--bg2)",color:"var(--text)",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}:{color:"var(--text4)"}}>
                  {l} {v==="list"?"리스트":"칸반"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {project ? (
          view==="list" ? (
            <div className="space-y-3 max-w-3xl">
              {project.tasks.map(task=>(
                <TaskCard key={task.id} task={task} members={members} projMembers={projMembers}
                  onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)}
                  onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)}
                  onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)}
                  onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)}
                  onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>
              ))}
              {/* add task */}
              <div className="pt-1">
                {addTaskMode ? (
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{border:"1px solid rgba(99,102,241,0.3)",background:"var(--bg2)"}}>
                    <input value={nt.name} onChange={e=>setNt(p=>({...p,name:e.target.value}))} autoFocus
                      onKeyDown={e=>{if(e.key==="Enter")handleAddTask();if(e.key==="Escape")setAddTaskMode(false);}}
                      placeholder="Task 이름 *" className="w-full px-3 py-2 text-sm outline-none rounded-xl font-medium"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{color:"var(--text4)"}}>담당자</span>
                        <MemberSelect value={nt.assigneeId} onChange={v=>setNt(p=>({...p,assigneeId:v}))}
                          members={members} projectMembers={projMembers}/>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{color:"var(--text4)"}}>마감일</span>
                        <DateBtn value={nt.dueDate} onChange={v=>setNt(p=>({...p,dueDate:v||""}))}/>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>setAddTaskMode(false)} className="px-3 py-1.5 rounded-xl text-sm"
                        style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
                      <button onClick={handleAddTask}
                        className="px-4 py-1.5 rounded-xl text-sm text-white bg-indigo-600 hover:bg-indigo-500">
                        Task 추가
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setAddTaskMode(true)}
                    className="flex items-center gap-2 text-sm px-1 transition-colors" style={{color:"var(--text5)"}}>
                    <span className="w-5 h-5 rounded-lg border flex items-center justify-center"
                      style={{borderColor:"var(--border2)"}}>+</span>
                    새 Task 추가
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["pending","in_progress","done"].map(status=>{
                const cfg={pending:{label:"대기중",color:"#94a3b8"},in_progress:{label:"진행중",color:"#fbbf24"},done:{label:"완료",color:"#34d399"}}[status];
                const ct=project.tasks.filter(t=>bucket(t)===status);
                return (
                  <div key={status} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-2 h-2 rounded-full" style={{background:cfg.color}}/>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text4)"}}>{cfg.label}</span>
                      <span className="text-xs px-1.5 rounded-full" style={{background:"var(--hover)",color:"var(--text5)"}}>{ct.length}</span>
                    </div>
                    <div className="space-y-3 min-h-16">
                      {ct.map(task=>(
                        <TaskCard key={task.id} task={task} members={members} projMembers={projMembers}
                          onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)}
                          onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)}
                          onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)}
                          onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)}
                          onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>
                      ))}
                      {!ct.length&&<div className="h-16 rounded-2xl flex items-center justify-center"
                        style={{border:"1px dashed var(--border)"}}>
                        <span className="text-xs" style={{color:"var(--text5)"}}>없음</span>
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2" style={{color:"var(--text5)"}}>◈</div>
              <p className="text-sm" style={{color:"var(--text4)"}}>프로젝트를 선택하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}
