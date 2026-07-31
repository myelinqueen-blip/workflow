/**
 * TaskTab.jsx  v2.2
 * - 모든 Task / Subtask 인라인 수정 가능
 * - 클라이언트·프로젝트 추가/수정
 * - 라이트/다크 테마 대응
 */
import { useState, useCallback } from "react";
import { calcTaskPct, calcProjPct, fmtDate, sortSubs, mkId } from "../utils.js";

/* ── Design tokens ── */
const STATUS = {
  pending:     { label:"대기", short:"대기", dot:"#94a3b8",  active:"#475569" },
  in_progress: { label:"진행", short:"진행", dot:"#fbbf24",  active:"#d97706" },
  done:        { label:"완료", short:"완료", dot:"#34d399",  active:"#059669" },
};

const CLIENT_COLORS = ["#6366f1","#f43f5e","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

/* ── Primitives ── */
const PBar = ({ pct }) => {
  const bg = pct===100?"#34d399":pct>=50?"#fbbf24":"#94a3b8";
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{background:"var(--border2)"}}>
      <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:bg}}/>
    </div>
  );
};

const SBtn = ({ current, onChange }) => (
  <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
    {Object.entries(STATUS).map(([k,v])=>{
      const on = current===k;
      return (
        <button key={k} onClick={()=>onChange(k)}
          className="px-2 py-0.5 rounded text-xs font-medium border transition-all"
          style={on
            ? {background:v.active,color:"#fff",borderColor:"transparent"}
            : {background:"transparent",color:v.dot,borderColor:`${v.dot}50`}}>
          {v.short}
        </button>
      );
    })}
  </div>
);

const Modal = ({ title, desc, onConfirm, onCancel }) => (
  <div className="fixed inset-0 flex items-center justify-center" style={{zIndex:9999}}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel}/>
    <div className="relative rounded-2xl p-6 w-80 shadow-2xl"
      style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
      <h3 className="font-bold mb-2" style={{color:"var(--text)"}}>{title}</h3>
      <p className="text-sm mb-5 leading-relaxed" style={{color:"var(--text3)"}}>{desc}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm transition-colors"
          style={{background:"var(--hover)",color:"var(--text3)",border:"1px solid var(--border)"}}>취소</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm text-white bg-rose-600 hover:bg-rose-500 transition-colors">삭제</button>
      </div>
    </div>
  </div>
);

const InlineInput = ({ value, onChange, onBlur, placeholder, className="" }) => (
  <input
    value={value} onChange={e=>onChange(e.target.value)}
    onBlur={onBlur} autoFocus
    placeholder={placeholder}
    className={`outline-none rounded-lg px-2 py-1 text-sm transition-all ${className}`}
    style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text)",width:"100%"}}
  />
);

const NasMemo = ({ value, onChange }) => {
  const [ed,setEd]=useState(false);const [d,setD]=useState(value||"");const [cp,setCp]=useState(false);
  const copy=()=>{if(!value)return;navigator.clipboard.writeText(value).then(()=>{setCp(true);setTimeout(()=>setCp(false),1500);});};
  const save=()=>{onChange(d);setEd(false);};
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-mono" style={{color:"var(--text5)"}}>NAS</span>
        <div className="flex-1 h-px" style={{background:"var(--border)"}}/>
      </div>
      {ed
        ? <div className="flex gap-1.5">
            <input value={d} onChange={e=>setD(e.target.value)} autoFocus
              onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEd(false);}}
              className="flex-1 px-2 py-1 text-xs font-mono outline-none rounded-lg"
              style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text3)"}}
              placeholder="\\NAS01\프로젝트\폴더명"/>
            <button onClick={save} className="px-2 py-1 rounded-lg bg-indigo-600 text-xs text-white">저장</button>
            <button onClick={()=>setEd(false)} className="px-2 py-1 rounded-lg text-xs"
              style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
          </div>
        : value
          ? <div className="flex items-center gap-1.5">
              <span className="flex-1 text-xs font-mono truncate px-2 py-1 rounded-lg"
                style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>{value}</span>
              <button onClick={copy} className="text-xs px-1.5 py-1 transition-colors"
                style={{color:"var(--text5)"}}>{cp?"✓":"복사"}</button>
              <button onClick={()=>{setD(value);setEd(true);}} className="text-xs px-1.5 py-1 transition-colors"
                style={{color:"var(--text5)"}}>수정</button>
            </div>
          : <button onClick={()=>setEd(true)} className="text-xs transition-colors" style={{color:"var(--text5)"}}>
              + NAS 경로 추가
            </button>}
    </div>
  );
};

/* ── Subtask Row ── */
function SubtaskRow({ st, idx, total, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(st.name);
  const isDone = st.status==="done";

  const saveName = () => { if(nameDraft.trim()) onUpdate({name:nameDraft.trim()}); setEditName(false); };

  return (
    <>
      {confirm&&<Modal title="세부 업무 삭제" desc={`"${st.name}"을 삭제할까요?`}
        onConfirm={()=>{onDelete();setConfirm(false);}} onCancel={()=>setConfirm(false)}/>}
      <div className={`group/sr rounded-lg ${isDone?"opacity-55":""}`}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{":hover":{background:"var(--hover)"}}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          {/* move buttons */}
          <div className="flex flex-col gap-px flex-shrink-0 opacity-0 group-hover/sr:opacity-100 transition-opacity">
            {[["up","M18 15l-6-6-6 6"],["down","M6 9l6 6 6-6"]].map(([dir,path])=>(
              <button key={dir}
                onClick={()=>dir==="up"?onMoveUp(idx):onMoveDown(idx)}
                disabled={dir==="up"?idx===0:idx===total-1}
                className="w-4 h-3 flex items-center justify-center disabled:opacity-20 transition-colors"
                style={{color:"var(--text5)"}}>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3}><path d={path}/></svg>
              </button>
            ))}
          </div>
          {/* done toggle */}
          <button onClick={()=>onUpdate({status:isDone?"pending":"done"})}
            className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all"
            style={isDone?{background:"#10b981",borderColor:"#10b981"}:{borderColor:"var(--border2)"}}>
            {isDone&&<svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
          </button>
          {/* due date */}
          {st.dueDate&&<span className="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border"
            style={!st.assignee&&!isDone
              ?{color:"#fbbf24",borderColor:"rgba(251,191,36,0.4)",background:"rgba(251,191,36,0.1)"}
              :{color:"var(--text5)",borderColor:"var(--border)",background:"var(--hover)"}}>
            {fmtDate(st.dueDate)}
          </span>}
          {/* name — 클릭하면 편집 */}
          <div className="flex-1 min-w-0">
            {editName
              ? <InlineInput value={nameDraft} onChange={setNameDraft}
                  onBlur={saveName}
                  placeholder="세부 업무 이름"/>
              : <span
                  onClick={()=>{setNameDraft(st.name);setEditName(true);}}
                  className={`text-sm cursor-text block truncate ${isDone?"line-through":"font-medium"}`}
                  style={{color:isDone?"var(--text5)":"var(--text)"}}
                  title="클릭하여 수정">
                  {st.name}
                </span>}
          </div>
          {/* assignee */}
          <span className="hidden sm:block text-xs flex-shrink-0 px-1.5 py-0.5 rounded border"
            style={!st.assignee&&!isDone
              ?{color:"#f87171",borderColor:"rgba(248,113,113,0.4)",background:"rgba(248,113,113,0.1)"}
              :{color:"var(--text5)",borderColor:"var(--border)",background:"var(--hover)"}}>
            {st.assignee||"미지정"}
          </span>
          <SBtn current={st.status} onChange={v=>onUpdate({status:v})}/>
          <button onClick={()=>setOpen(p=>!p)}
            className="opacity-0 group-hover/sr:opacity-60 hover:!opacity-100 transition-opacity"
            style={{color:"var(--text4)"}}>
            <svg className={`w-3.5 h-3.5 transition-transform ${open?"rotate-180":""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        {/* expanded detail */}
        {open&&(
          <div className="ml-9 mr-2 mb-2 px-3 py-3 rounded-xl space-y-3"
            style={{background:"var(--input)",border:"1px solid var(--border)"}}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>담당자</label>
                <input value={st.assignee||""} onChange={e=>onUpdate({assignee:e.target.value||null})}
                  className="w-full bg-transparent text-xs outline-none py-0.5 border-b"
                  style={{borderColor:"var(--border2)",color:"var(--text2)"}} placeholder="이름 입력"/>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>마감일</label>
                <input type="date" value={st.dueDate||""} onChange={e=>onUpdate({dueDate:e.target.value||null})}
                  className="w-full bg-transparent text-xs outline-none py-0.5 border-b"
                  style={{borderColor:"var(--border2)",color:"var(--text2)",colorScheme:"dark"}}/>
              </div>
            </div>
            <NasMemo value={st.nasPath} onChange={v=>onUpdate({nasPath:v})}/>
            <div className="flex justify-end">
              <button onClick={()=>setConfirm(true)} className="text-xs transition-colors"
                style={{color:"#f87171"}}>삭제</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Task Card ── */
function TaskCard({ task, onUpdateTask, onUpdateSubtask, onAddSubtask, onDeleteSubtask, onDeleteTask }) {
  const [exp,   setExp]   = useState(true);
  const [edit,  setEdit]  = useState(false);
  const [add,   setAdd]   = useState(false);
  const [newN,  setNewN]  = useState("");
  const [conf,  setConf]  = useState(false);
  const [draft, setDraft] = useState({ name:task.name, assignee:task.assignee||"", dueDate:task.dueDate||"" });
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(task.name);

  const pct    = calcTaskPct(task.subtasks);
  const sorted = sortSubs(task.subtasks);

  const move = (idx, dir) => {
    const s=[...sorted]; const sw=dir==="up"?idx-1:idx+1;
    if(sw<0||sw>=s.length)return;
    [s[idx],s[sw]]=[s[sw],s[idx]];
    s.forEach((st,i)=>onUpdateSubtask(task.id,st.id,{order:i,orderOverridden:true}));
  };

  const saveHeader = () => { onUpdateTask(task.id,{name:draft.name.trim()||task.name,assignee:draft.assignee||null,dueDate:draft.dueDate||null}); setEdit(false); };
  const saveName   = () => { if(nameDraft.trim()) onUpdateTask(task.id,{name:nameDraft.trim()}); setEditName(false); };
  const addSub     = () => { if(!newN.trim())return; onAddSubtask(task.id,newN.trim()); setNewN(""); setAdd(false); };

  return (
    <>
      {conf&&<Modal title="Task 삭제" desc={`"${task.name}"과 모든 세부 업무를 삭제할까요?`}
        onConfirm={()=>{onDeleteTask(task.id);setConf(false);}} onCancel={()=>setConf(false)}/>}
      <div className="rounded-xl overflow-hidden transition-all"
        style={{border:`1px solid ${exp?"var(--border2)":"var(--border)"}`,background:"var(--bg3)"}}>

        {/* ── Task header ── */}
        {edit ? (
          <div className="px-4 py-3 space-y-2.5 border-b" style={{background:"var(--input)",borderColor:"var(--border)"}}>
            <input value={draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))} autoFocus
              onKeyDown={e=>{if(e.key==="Enter")saveHeader();if(e.key==="Escape")setEdit(false);}}
              className="w-full px-3 py-1.5 text-sm font-semibold outline-none rounded-lg"
              style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text)"}}/>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>담당자</label>
                <input value={draft.assignee} onChange={e=>setDraft(p=>({...p,assignee:e.target.value}))}
                  className="w-full bg-transparent border-b text-xs outline-none py-0.5"
                  style={{borderColor:"var(--border2)",color:"var(--text2)"}} placeholder="이름"/>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>마감일</label>
                <input type="date" value={draft.dueDate} onChange={e=>setDraft(p=>({...p,dueDate:e.target.value}))}
                  className="w-full bg-transparent border-b text-xs outline-none py-0.5"
                  style={{borderColor:"var(--border2)",color:"var(--text2)",colorScheme:"dark"}}/>
              </div>
            </div>
            <NasMemo value={task.nasPath} onChange={v=>onUpdateTask(task.id,{nasPath:v})}/>
            <div className="flex gap-2 justify-end pt-0.5">
              <button onClick={()=>setConf(true)} className="text-xs mr-auto transition-colors" style={{color:"#f87171"}}>Task 삭제</button>
              <button onClick={()=>setEdit(false)} className="px-3 py-1.5 rounded-lg text-xs"
                style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
              <button onClick={saveHeader} className="px-3 py-1.5 rounded-lg text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">저장</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 group/hd cursor-pointer"
            onClick={()=>setExp(p=>!p)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all`}
              style={{background:exp?"var(--border2)":"var(--hover)",borderColor:"var(--border2)"}}>
              <svg className={`w-3 h-3 transition-transform ${exp?"rotate-90":""}`}
                style={{color:"var(--text4)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* task name — 클릭하면 인라인 편집 */}
                {editName
                  ? <div className="flex-1" onClick={e=>e.stopPropagation()}>
                      <InlineInput value={nameDraft} onChange={setNameDraft} onBlur={saveName} placeholder="Task 이름"/>
                    </div>
                  : <span onClick={e=>{e.stopPropagation();setNameDraft(task.name);setEditName(true);}}
                      className="font-semibold text-sm cursor-text"
                      style={{color:"var(--text)"}} title="클릭하여 이름 수정">
                      {task.name}
                    </span>}
                {(!task.assignee||!task.dueDate)&&(
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{background:"rgba(244,63,94,0.15)",border:"1px solid rgba(244,63,94,0.3)",color:"#fb7185"}}>
                    미지정
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {task.dueDate&&<span className="text-xs font-mono" style={{color:"var(--text4)"}}>{fmtDate(task.dueDate)}</span>}
                {task.assignee&&<span className="text-xs" style={{color:"var(--text4)"}}>{task.assignee}</span>}
                {task.nasPath&&<span className="text-xs" style={{color:"var(--text5)"}}>📁 NAS</span>}
                <div className="w-20"><PBar pct={pct}/></div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xl font-mono font-bold tabular-nums`}
                style={{color:pct===100?"#34d399":pct>0?"#fbbf24":"var(--text5)"}}>
                {pct}<span className="text-xs" style={{color:"var(--text5)"}}>%</span>
              </span>
              {/* edit button */}
              <button onClick={e=>{e.stopPropagation();setDraft({name:task.name,assignee:task.assignee||"",dueDate:task.dueDate||""});setEdit(true);}}
                className="opacity-0 group-hover/hd:opacity-60 hover:!opacity-100 p-1.5 rounded-lg transition-all"
                style={{color:"var(--text4)"}}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Subtasks ── */}
        {exp&&!edit&&(
          <div style={{borderTop:"1px solid var(--border)"}}>
            {!sorted.length&&<p className="px-6 py-3 text-xs italic" style={{color:"var(--text5)"}}>세부 업무가 없습니다</p>}
            <div className="px-1 pt-1">
              {sorted.map((st,i)=>(
                <SubtaskRow key={st.id} st={st} idx={i} total={sorted.length}
                  onUpdate={upd=>onUpdateSubtask(task.id,st.id,upd)}
                  onDelete={()=>onDeleteSubtask(task.id,st.id)}
                  onMoveUp={idx=>move(idx,"up")}
                  onMoveDown={idx=>move(idx,"down")}/>
              ))}
            </div>
            <div className="px-3 py-2">
              {add
                ? <div className="flex gap-1.5">
                    <input value={newN} onChange={e=>setNewN(e.target.value)} autoFocus
                      onKeyDown={e=>{if(e.key==="Enter")addSub();if(e.key==="Escape"){setAdd(false);setNewN("");}}}
                      className="flex-1 px-2 py-1.5 text-xs outline-none rounded-lg"
                      style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text)"}}
                      placeholder="세부 업무 이름"/>
                    <button onClick={addSub} className="px-3 py-1.5 rounded-lg text-xs text-white bg-indigo-600 hover:bg-indigo-500">추가</button>
                    <button onClick={()=>{setAdd(false);setNewN("");}} className="px-2 py-1.5 rounded-lg text-xs"
                      style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
                  </div>
                : <button onClick={e=>{e.stopPropagation();setAdd(true);}}
                    className="flex items-center gap-1.5 text-xs transition-colors group/ab"
                    style={{color:"var(--text5)"}}>
                    <span className="w-4 h-4 rounded border flex items-center justify-center"
                      style={{borderColor:"var(--border2)"}}>+</span>
                    세부 업무 추가
                  </button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Add Project Modal ── */
function AddProjectModal({ clientId, onAdd, onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const submit = () => { if(!name.trim())return; onAdd(clientId,name.trim(),desc.trim()); onClose(); };
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
        <h3 className="font-bold mb-4" style={{color:"var(--text)"}}>새 프로젝트 추가</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>프로젝트명 *</label>
            <input value={name} onChange={e=>setName(e.target.value)} autoFocus
              onKeyDown={e=>e.key==="Enter"&&submit()}
              className="w-full px-3 py-2 text-sm outline-none rounded-xl"
              style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}
              placeholder="프로젝트 이름"/>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>설명 (선택)</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none rounded-xl"
              style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}
              placeholder="프로젝트 설명"/>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm"
            style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
          <button onClick={submit} className="px-4 py-2 rounded-xl text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">추가</button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Client Modal ── */
function AddClientModal({ onAdd, onClose }) {
  const [name,  setName]  = useState("");
  const [color, setColor] = useState(CLIENT_COLORS[0]);
  const submit = () => { if(!name.trim())return; onAdd(name.trim(),color); onClose(); };
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{background:"var(--bg2)",border:"1px solid var(--border2)",zIndex:10000}}>
        <h3 className="font-bold mb-4" style={{color:"var(--text)"}}>새 클라이언트 추가</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>클라이언트명 *</label>
            <input value={name} onChange={e=>setName(e.target.value)} autoFocus
              onKeyDown={e=>e.key==="Enter"&&submit()}
              className="w-full px-3 py-2 text-sm outline-none rounded-xl"
              style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}
              placeholder="클라이언트 이름"/>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>컬러</label>
            <div className="flex gap-2 flex-wrap">
              {CLIENT_COLORS.map(c=>(
                <button key={c} onClick={()=>setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{background:c,outline:color===c?`2px solid ${c}`:"2px solid transparent",outlineOffset:"2px"}}/>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm"
            style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
          <button onClick={submit} className="px-4 py-2 rounded-xl text-sm text-white transition-colors"
            style={{background:color}}>추가</button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Tab Root ── */
export default function TaskTab({
  clients,
  onUpdateSubtask, onUpdateTask,
  onAddTask, onAddSubtask,
  onDeleteSubtask, onDeleteTask,
  onAddClient, onAddProject,
}) {
  const [ac,  setAc]  = useState(clients[0]?.id);
  const [ap,  setAp]  = useState(clients[0]?.projects[0]?.id);
  const [view, setView] = useState("list");
  const [addM, setAddM] = useState(false);
  const [nt,   setNt]  = useState({ name:"", assignee:"", dueDate:"" });
  const [showAddClient,  setShowAddClient]  = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const client  = clients.find(c=>c.id===ac);
  const project = client?.projects.find(p=>p.id===ap);
  const pct     = project ? calcProjPct(project.tasks) : 0;
  const allSubs = project?.tasks.flatMap(t=>t.subtasks)||[];

  const handleAdd = () => {
    if(!nt.name.trim())return;
    onAddTask(ac,ap,nt.name.trim(),nt.assignee||null,nt.dueDate||null);
    setNt({name:"",assignee:"",dueDate:""}); setAddM(false);
  };
  const bucket = t => { const p=calcTaskPct(t.subtasks); return p===100?"done":p>0?"in_progress":"pending"; };

  return (
    <>
      {showAddClient&&<AddClientModal onAdd={onAddClient} onClose={()=>setShowAddClient(false)}/>}
      {showAddProject&&<AddProjectModal clientId={ac} onAdd={onAddProject} onClose={()=>setShowAddProject(false)}/>}

      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Top bar ── */}
        <div className="flex-shrink-0 px-5 py-4 space-y-3" style={{borderBottom:"1px solid var(--border)"}}>
          {/* clients */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {clients.map(c=>(
              <button key={c.id} onClick={()=>{setAc(c.id);setAp(c.projects[0]?.id);}}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={ac===c.id
                  ?{background:`${c.color}18`,border:`1px solid ${c.color}44`,color:"var(--text)"}
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

          {/* projects */}
          {client&&(
            <div className="flex gap-1 flex-wrap items-center">
              {client.projects.map(p=>(
                <button key={p.id} onClick={()=>setAp(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs transition-all`}
                  style={ap===p.id
                    ?{background:"var(--border2)",border:"1px solid var(--border2)",color:"var(--text)"}
                    :{border:"1px solid transparent",color:"var(--text4)"}}>
                  {p.name}
                  <span className="ml-1.5 font-mono" style={{color:"var(--text5)"}}>{calcProjPct(p.tasks)}%</span>
                </button>
              ))}
              <button onClick={()=>setShowAddProject(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-all"
                style={{border:"1px dashed var(--border2)",color:"var(--text5)"}}>
                + 프로젝트
              </button>
            </div>
          )}

          {/* project header */}
          {project&&(
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base" style={{color:"var(--text)"}}>{project.name}</h2>
                  <span className="text-xs hidden md:block" style={{color:"var(--text5)"}}>{project.description}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="w-32"><PBar pct={pct}/></div>
                  <span className="text-sm font-mono font-bold"
                    style={{color:pct===100?"#34d399":pct>0?"#fbbf24":"var(--text5)"}}>{pct}%</span>
                  <div className="flex gap-1.5">
                    {[["완료",allSubs.filter(s=>s.status==="done").length,"#34d399"],
                      ["진행",allSubs.filter(s=>s.status==="in_progress").length,"#fbbf24"],
                      ["대기",allSubs.filter(s=>s.status==="pending").length,"#94a3b8"]].map(([l,n,c])=>(
                      <span key={l} className="text-xs px-2 py-0.5 rounded-full"
                        style={{color:c,background:`${c}15`,border:`1px solid ${c}30`}}>{l} {n}</span>
                    ))}
                  </div>
                </div>
              </div>
              {/* view toggle */}
              <div className="flex gap-1 p-1 rounded-lg flex-shrink-0"
                style={{background:"var(--input)",border:"1px solid var(--border)"}}>
                {[["list","☰ 리스트"],["kanban","⊞ 칸반"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setView(v)}
                    className="px-3 py-1 rounded text-xs transition-all"
                    style={view===v?{background:"var(--border2)",color:"var(--text)"}:{color:"var(--text4)"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {project ? (
            view==="list" ? (
              <div className="space-y-3 max-w-3xl">
                {project.tasks.map(task=>(
                  <TaskCard key={task.id} task={task}
                    onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)}
                    onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)}
                    onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)}
                    onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)}
                    onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>
                ))}
                {/* add task */}
                <div className="pt-1">
                  {addM ? (
                    <div className="rounded-xl p-4 space-y-3"
                      style={{border:"1px solid rgba(99,102,241,0.3)",background:"var(--bg3)"}}>
                      <input value={nt.name} onChange={e=>setNt(p=>({...p,name:e.target.value}))} autoFocus
                        onKeyDown={e=>{if(e.key==="Enter")handleAdd();if(e.key==="Escape")setAddM(false);}}
                        className="w-full px-3 py-2 text-sm outline-none rounded-xl font-medium"
                        style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}
                        placeholder="Task 이름"/>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>담당자</label>
                          <input value={nt.assignee} onChange={e=>setNt(p=>({...p,assignee:e.target.value}))}
                            className="w-full bg-transparent border-b text-xs outline-none py-0.5"
                            style={{borderColor:"var(--border2)",color:"var(--text2)"}} placeholder="이름"/>
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>마감일</label>
                          <input type="date" value={nt.dueDate} onChange={e=>setNt(p=>({...p,dueDate:e.target.value}))}
                            className="w-full bg-transparent border-b text-xs outline-none py-0.5"
                            style={{borderColor:"var(--border2)",color:"var(--text2)",colorScheme:"dark"}}/>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>setAddM(false)} className="px-3 py-1.5 rounded-xl text-sm"
                          style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
                        <button onClick={handleAdd} className="px-4 py-1.5 rounded-xl text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">Task 추가</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={()=>setAddM(true)}
                      className="flex items-center gap-2 text-sm transition-colors group/ab px-1"
                      style={{color:"var(--text5)"}}>
                      <span className="w-5 h-5 rounded border flex items-center justify-center"
                        style={{borderColor:"var(--border2)"}}>+</span>
                      새 Task 추가
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* kanban */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["pending","in_progress","done"].map(status=>{
                  const cfg={pending:{label:"대기중",color:"#94a3b8"},in_progress:{label:"진행중",color:"#fbbf24"},done:{label:"완료",color:"#34d399"}}[status];
                  const ct = project.tasks.filter(t=>bucket(t)===status);
                  return (
                    <div key={status} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full" style={{background:cfg.color}}/>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text4)"}}>{cfg.label}</span>
                        <span className="text-xs px-1.5 rounded-full" style={{background:"var(--hover)",color:"var(--text5)"}}>{ct.length}</span>
                      </div>
                      <div className="space-y-3 min-h-16">
                        {ct.map(task=>(
                          <TaskCard key={task.id} task={task}
                            onUpdateTask={(tid,u)=>onUpdateTask(ac,ap,tid,u)}
                            onUpdateSubtask={(tid,sid,u)=>onUpdateSubtask(ac,ap,tid,sid,u)}
                            onAddSubtask={(tid,n)=>onAddSubtask(ac,ap,tid,n)}
                            onDeleteSubtask={(tid,sid)=>onDeleteSubtask(ac,ap,tid,sid)}
                            onDeleteTask={tid=>onDeleteTask(ac,ap,tid)}/>
                        ))}
                        {!ct.length&&<div className="h-16 rounded-xl flex items-center justify-center"
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
                <div className="text-sm" style={{color:"var(--text4)"}}>프로젝트를 선택하세요</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
