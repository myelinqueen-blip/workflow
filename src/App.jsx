import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  USE_FIREBASE, auth, db,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from "./firebase.js";
import { SEED_DATA, calcProjPct, mkId, DEFAULT_MEMBERS } from "./utils.js";
import { ThemeProvider, ThemeToggle, useTheme } from "./ThemeContext.jsx";
import SheetsSync from './components/SheetsSync.jsx';
import ClientDashboard from './components/ClientDashboard.jsx';
import TimeTracker from './components/TimeTracker.jsx';
import TeamSettings from './components/TeamSettings.jsx';
import TelegramSettings from './components/TelegramSettings.jsx';
import BillingTab from './tabs/BillingTab.jsx';
import MemberView from "./components/MemberView.jsx";
import { MemberAvatar } from "./components/MemberSelect.jsx";

import TaskTab     from "./tabs/TaskTab.jsx";
import CalendarTab from "./tabs/CalendarTab.jsx";
import PersonalTab from "./tabs/PersonalTab.jsx";
import TrendTab    from "./tabs/TrendTab.jsx";

const APP_VERSION = "v2.7.0";

const TABS = [
  { id:"task",     icon:"◈", label:"Task" },
  { id:"calendar", icon:"◷", label:"Month & Weekly" },
  { id:"personal", icon:"◉", label:"Personal" },
  { id:"trend",    icon:"◌", label:"Trend" },
  { id:"ai",       icon:"✦", label:"AI 자동화" },
  { id:"billing",  icon:"💰", label:"외주비 정산" },
];

/* ═══ AUTH ═══ */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

function AuthProvider({children}) {
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!USE_FIREBASE){setLoading(false);return;}
    return onAuthStateChanged(auth,u=>{setUser(u);setLoading(false);});
  },[]);
  return <AuthCtx.Provider value={{user,loading,signIn:()=>signInWithPopup(auth,new GoogleAuthProvider()),signOut:()=>signOut(auth)}}>{children}</AuthCtx.Provider>;
}

/* ═══ LOGIN ═══ */
function LoginScreen() {
  const {signIn}=useAuth();
  const [busy,setBusy]=useState(false);
  const handle=async()=>{setBusy(true);try{await signIn();}catch{}setBusy(false);};
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
      <div className="absolute top-4 right-4"><ThemeToggle/></div>
      <div className="text-center space-y-6 px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)",boxShadow:"0 0 28px rgba(99,102,241,.3)"}}>W</div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{color:"var(--text)"}}>WorkFlow</h1>
            <p className="text-sm" style={{color:"var(--text4)"}}>i4u Works 전용 프로젝트 관리 {APP_VERSION}</p>
          </div>
        </div>
        <button onClick={handle} disabled={busy}
          className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mx-auto"
          style={{background:"linear-gradient(135deg,rgba(99,102,241,0.85),rgba(124,58,237,0.85))",border:"1px solid rgba(99,102,241,0.4)",minWidth:220}}>
          {busy?<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          :<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>}
          {busy?"연결 중...":"Google 계정으로 시작하기"}
        </button>
      </div>
    </div>
  );
}

/* ═══ DATA HOOK ═══ */
function useData() {
  const {user}=useAuth();
  const [data,setData]=useState(()=>JSON.parse(JSON.stringify(SEED_DATA)));

  const update=useCallback(fn=>{
    setData(prev=>{const next=JSON.parse(JSON.stringify(prev));fn(next);return next;});
  },[]);

  const write=useCallback((localFn,fbFn)=>{
    update(localFn);
    if(USE_FIREBASE&&db&&user) fbFn().catch(e=>console.error("[FB]",e));
  },[update,user]);

  /* ── task/subtask CRUD ── */
  const updateSubtask=useCallback((cid,pid,tid,sid,upd)=>write(
    d=>{const s=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid)?.subtasks.find(s=>s.id===sid);if(s)Object.assign(s,upd);},
    ()=>updateDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${sid}`),{...upd,updatedAt:serverTimestamp()})
  ),[write]);

  const updateTask=useCallback((cid,pid,tid,upd)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)Object.assign(t,upd);},
    ()=>updateDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}`),{...upd,updatedAt:serverTimestamp()})
  ),[write]);

  const addTask=useCallback((cid,pid,name,assigneeId,dueDate)=>write(
    d=>{const p=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid);if(p)p.tasks.push({id:mkId(),name,order:p.tasks.length,assigneeId:assigneeId||null,dueDate:dueDate||null,nasPath:null,links:[],subtasks:[]});},
    ()=>addDoc(collection(db,`clients/${cid}/projects/${pid}/tasks`),{name,order:99,assigneeId:assigneeId||null,dueDate:dueDate||null,nasPath:null,links:[],createdAt:serverTimestamp()})
  ),[write]);

  const addSubtask=useCallback((cid,pid,tid,name)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)t.subtasks.push({id:mkId(),name,status:"pending",order:t.subtasks.length,assigneeId:null,dueDate:null,nasPath:null,links:[],orderOverridden:false});},
    ()=>addDoc(collection(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks`),{name,status:"pending",order:99,assigneeId:null,dueDate:null,nasPath:null,links:[],orderOverridden:false,createdAt:serverTimestamp()})
  ),[write]);

  const deleteSubtask=useCallback((cid,pid,tid,sid)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)t.subtasks=t.subtasks.filter(s=>s.id!==sid);},
    ()=>deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${sid}`))
  ),[write]);

  const deleteTask=useCallback((cid,pid,tid)=>write(
    d=>{const p=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid);if(p)p.tasks=p.tasks.filter(t=>t.id!==tid);},
    async()=>{
      const subs=data.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid)?.subtasks||[];
      await Promise.all(subs.map(s=>deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${s.id}`))));
      await deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}`));
    }
  ),[write,data]);

  const addClient=useCallback((name,color)=>write(
    d=>d.clients.push({id:mkId(),name,color,invitedEmails:[],memberIds:[],projects:[]}),
    ()=>addDoc(collection(db,"clients"),{name,color,ownerId:user?.uid,invitedEmails:[],memberIds:[],createdAt:serverTimestamp()})
  ),[write,user]);

  const addProject=useCallback((cid,name,description)=>write(
    d=>{const c=d.clients.find(c=>c.id===cid);if(c)c.projects.push({id:mkId(),name,description,status:"active",order:c.projects.length,memberIds:[],sheetsUrl:"",tasks:[]});},
    ()=>addDoc(collection(db,`clients/${cid}/projects`),{name,description,status:"active",order:99,memberIds:[],sheetsUrl:"",createdAt:serverTimestamp()})
  ),[write]);

  // 프로젝트 순서 드래그 변경
  const reorderProjects=useCallback((cid,fromIdx,toIdx)=>write(
    d=>{
      const c=d.clients.find(c=>c.id===cid);
      if(!c)return;
      const projs=[...c.projects];
      const [moved]=projs.splice(fromIdx,1);
      projs.splice(toIdx,0,moved);
      projs.forEach((p,i)=>p.order=i);
      c.projects=projs;
    },
    async()=>{}  // Firebase 순서 업데이트는 추후
  ),[write]);

  // 구성원 관리
  const addMember=useCallback((name,role,color)=>write(
    d=>d.members.push({id:mkId(),name,role,email:"",color,avatar:name[0]}),
    ()=>{}
  ),[write]);

  return {data,updateSubtask,updateTask,addTask,addSubtask,deleteSubtask,deleteTask,addClient,addProject,reorderProjects,addMember};
}

/* ═══ TOAST ═══ */
function Toast({msg,type,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t);},[]);
  const s={done:{c:"#34d399",b:"rgba(6,78,59,.9)",bd:"rgba(52,211,153,.4)"},in_progress:{c:"#fbbf24",b:"rgba(78,49,6,.9)",bd:"rgba(251,191,36,.4)"},error:{c:"#f87171",b:"rgba(78,6,6,.9)",bd:"rgba(248,113,113,.4)"},info:{c:"#818cf8",b:"rgba(30,27,75,.9)",bd:"rgba(99,102,241,.4)"}}[type]||{c:"#818cf8",b:"rgba(30,27,75,.9)",bd:"rgba(99,102,241,.4)"};
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-xl"
      style={{zIndex:9999,background:s.b,border:`1px solid ${s.bd}`,color:s.c,backdropFilter:"blur(12px)"}}>
      <div className="w-1.5 h-1.5 rounded-full" style={{background:s.c}}/>{msg}
    </div>
  );
}

/* ═══ SIDEBAR ═══ */
function Sidebar({clients, members, onSelectProject, onShowMembers, onShowTeam, onShowTelegram, onShowSheets, onShowTimer, onShowDashboard}) {
  const {user,signOut}=useAuth();
  const [open,setOpen]=useState(Object.fromEntries(clients.map(c=>[c.id,true])));

  useEffect(()=>{
    clients.forEach(c=>{if(!(c.id in open))setOpen(p=>({...p,[c.id]:true}));});
  },[clients]);

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full"
      style={{borderRight:"1px solid var(--border)",background:"var(--sidebar)"}}>
      {/* logo */}
      <div className="px-4 py-4 flex-shrink-0" style={{borderBottom:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>W</div>
          <div>
            <div className="text-sm font-bold leading-none" style={{color:"var(--text)"}}>WorkFlow</div>
            <div className="text-xs" style={{color:"var(--text5)"}}>i4u Works · {APP_VERSION}</div>
          </div>
        </div>
        {/* 구성원 보기 버튼 */}
        <button onClick={onShowMembers}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors"
          style={{background:"var(--hover)",color:"var(--text4)",border:"1px solid var(--border)"}}
          onMouseEnter={e=>e.currentTarget.style.background="var(--border)"}
          onMouseLeave={e=>e.currentTarget.style.background="var(--hover)"}>
          <div className="flex -space-x-1">
            {members.slice(0,3).map(m=>(
              <div key={m.id} className="w-4 h-4 rounded-full border text-white flex items-center justify-center"
                style={{background:m.color,borderColor:"var(--sidebar)",fontSize:"8px",fontWeight:"700"}}>
                {m.avatar||m.name[0]}
              </div>
            ))}
          </div>
          구성원 업무 현황
          <svg viewBox="0 0 24 24" className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={()=>onShowTeam()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors mt-1"
            style={{background:"var(--hover)",color:"var(--text4)",border:"1px solid var(--border)"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--border)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--hover)"}>
            👥 팀 구성원 관리
          </button>
          <button onClick={()=>onShowTelegram()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors mt-1"
            style={{background:"var(--hover)",color:"#60a5fa",border:"1px solid rgba(37,99,235,0.2)"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(37,99,235,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--hover)"}>
            ✈️ 텔레그램 연동
          </button>
          <button onClick={()=>onShowSheets()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors mt-1"
            style={{background:"var(--hover)",color:"#34d399",border:"1px solid rgba(16,185,129,0.2)"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(16,185,129,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--hover)"}>
            📊 Sheets 캘린더 연동
          </button>
          <button onClick={()=>onShowTimer()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors mt-1"
            style={{background:"var(--hover)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--hover)"}>
            ⏱ 타임트래킹
          <svg viewBox="0 0 24 24" className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="text-xs uppercase tracking-widest px-2 mb-2 font-mono" style={{color:"var(--text5)"}}>Clients</div>
        {clients.map(c=>(
          <div key={c.id}>
            <button onClick={()=>setOpen(p=>({...p,[c.id]:!p[c.id]}))}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors group/cl"
              onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${open[c.id]?"rotate-90":""}`}
                style={{color:"var(--text5)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 5l7 7-7 7"/>
              </svg>
              <div className="w-5 h-5 rounded-lg text-xs font-bold text-white flex items-center justify-center flex-shrink-0"
                style={{background:c.color}}>{c.name[0]}</div>
              <span className="text-xs font-semibold truncate flex-1 text-left" style={{color:"var(--text3)"}}>{c.name}</span>
              <button onClick={e=>{e.stopPropagation();onShowDashboard(c);}} title="대시보드"
                className="opacity-0 group-hover/cl:opacity-60 hover:!opacity-100 text-xs w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
                style={{color:"var(--text5)"}}>↗</button>
            </button>

            {open[c.id]&&c.projects.map(p=>{
              const pp=calcProjPct(p.tasks);
              return (
                <div key={p.id}
                  className="ml-6 pl-2 group/proj cursor-pointer"
                  style={{borderLeft:`1px solid ${c.color}30`}}
                  onClick={()=>onSelectProject(c.id,p.id)}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors"
                    onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{background:pp===100?"#34d399":pp>0?"#fbbf24":"var(--border2)"}}/>
                    <span className="text-xs truncate flex-1" style={{color:"var(--text4)"}}>{p.name}</span>
                    <span className="text-xs font-mono opacity-0 group-hover/proj:opacity-100 transition-opacity"
                      style={{color:"var(--text5)"}}>{pp}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* user */}
      <div className="px-2 py-3 flex-shrink-0" style={{borderTop:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          {user?.photoURL
            ?<img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0"/>
            :<div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{background:"linear-gradient(135deg,#f43f5e,#ec4899)"}}>선</div>}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{color:"var(--text2)"}}>{user?.displayName||"김선민"}</div>
            <div className="text-xs" style={{color:"var(--text5)"}}>팀장 · i4u Works</div>
          </div>
          {USE_FIREBASE&&<button onClick={signOut} style={{color:"var(--text5)",fontSize:"11px"}} title="로그아웃">↩</button>}
        </div>
      </div>
    </aside>
  );
}

/* ═══ APP INNER ═══ */
function AppInner() {
  const {data,updateSubtask,updateTask,addTask,addSubtask,deleteSubtask,deleteTask,addClient,addProject,reorderProjects}=useData();
  const [activeTab,setActiveTab]=useState("task");
  const [toast,setToast]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [showMembers,setShowMembers]=useState(false);
  const [showTeam,setShowTeam]=useState(false);
  const [showTelegram,setShowTelegram]=useState(false);
  const [showSheets,setShowSheets]=useState(false);
  const [showDashboard,setShowDashboard]=useState(null);
  const [showTimer,setShowTimer]=useState(false);
  // 사이드바에서 프로젝트 선택
  const [selClient,setSelClient]=useState(null);
  const [selProject,setSelProject]=useState(null);

  const show=(msg,type="info")=>setToast({msg,type});

  const handleSelectProject=(cid,pid)=>{
    setSelClient(cid); setSelProject(pid);
    setActiveTab("task"); setSidebarOpen(false);
  };

  const handleAddMember=m=>update(d=>d.members.push(m));
  const handleUpdateMember=(id,upd)=>update(d=>{const m=d.members.find(x=>x.id===id);if(m)Object.assign(m,upd);});
  const handleDeleteMember=id=>update(d=>{d.members=d.members.filter(x=>x.id!==id);});
  const wrapSub=useCallback((cid,pid,tid,sid,upd)=>{
    updateSubtask(cid,pid,tid,sid,upd);
    if(upd.status)show(`상태: ${{pending:"대기",in_progress:"진행",done:"완료"}[upd.status]}`,upd.status);
  },[updateSubtask]);

  const flatProjects=useMemo(()=>
    data.clients.flatMap(c=>c.projects.map(p=>({...p,clientName:c.name,color:c.color})))
  ,[data]);

  const hide=id=>activeTab===id?{}:{display:"none"};

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{background:"var(--bg)"}}>
      {showTeam&&<TeamSettings members={data.members} onAddMember={handleAddMember} onUpdateMember={handleUpdateMember} onDeleteMember={handleDeleteMember} onClose={()=>setShowTeam(false)}/>
      }
      {showSheets&&<SheetsSync projects={flatProjects} onAddTask={(title,date)=>console.log('add',title,date)} onClose={()=>setShowSheets(false)}/>
      }
      {showDashboard&&<ClientDashboard client={showDashboard} members={data.members} onClose={()=>setShowDashboard(null)}/>
      }
      {showTimer&&<TimeTracker clients={data.clients} members={data.members} onClose={()=>setShowTimer(false)}/>
      }
      {showTelegram&&<TelegramSettings clients={data.clients} members={data.members} onClose={()=>setShowTelegram(false)}/>
      }
      {showMembers&&<MemberView members={data.members} clients={data.clients} onClose={()=>setShowMembers(false)}/>}

      {/* mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{borderBottom:"1px solid var(--border)"}}>
        <button onClick={()=>setSidebarOpen(p=>!p)} className="flex flex-col gap-1.5 w-8 h-8 items-center justify-center">
          {[0,1,2].map(i=><div key={i} className="w-5 h-px" style={{background:"var(--text3)"}}/>)}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>W</div>
          <span className="font-bold text-sm" style={{color:"var(--text)"}}>WorkFlow</span>
        </div>
        <ThemeToggle/>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <div className={`md:flex md:relative md:translate-x-0 fixed inset-y-0 left-0 z-50 flex-col
          transition-transform duration-200 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
          <Sidebar clients={data.clients} members={data.members}
            onSelectProject={handleSelectProject}
            onShowTeam={()=>setShowTeam(true)}
            onShowTelegram={()=>setShowTelegram(true)}
            onShowSheets={()=>setShowSheets(true)}
            onShowTimer={()=>setShowTimer(true)}
            onShowDashboard={c=>setShowDashboard(c)}
            onShowMembers={()=>setShowMembers(true)}/>
        </div>
        {sidebarOpen&&<div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={()=>setSidebarOpen(false)}/>}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* tab bar */}
          <div className="flex-shrink-0 flex items-center overflow-x-auto px-2"
            style={{borderBottom:"1px solid var(--border)"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab===t.id?"border-indigo-500 text-indigo-500":"border-transparent"
                }`}
                style={activeTab!==t.id?{color:"var(--text4)"}:{}}>
                <span className="text-sm">{t.icon}</span>{t.label}
              </button>
            ))}
            <div className="ml-auto mr-3 flex items-center gap-2">
              <span className="hidden md:block text-xs font-mono" style={{color:"var(--text5)"}}>{APP_VERSION}</span>
              <ThemeToggle/>
            </div>
          </div>

          {/* content */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-auto" style={hide("task")}>
              <TaskTab
                clients={data.clients}
                members={data.members}
                selectedClientId={selClient}
                selectedProjectId={selProject}
                onUpdateSubtask={wrapSub}
                onUpdateTask={updateTask}
                onAddTask={(cid,pid,n,a,d)=>{addTask(cid,pid,n,a,d);show("Task 추가","info");}}
                onAddSubtask={addSubtask}
                onDeleteSubtask={(cid,pid,tid,sid)=>{deleteSubtask(cid,pid,tid,sid);show("삭제","error");}}
                onDeleteTask={(cid,pid,tid)=>{deleteTask(cid,pid,tid);show("Task 삭제","error");}}
                onAddClient={addClient}
                onAddProject={addProject}
                onReorderProjects={reorderProjects}/>
            </div>
            <div className="absolute inset-0 overflow-auto" style={hide("calendar")}>
              <CalendarTab projects={flatProjects}/>
            </div>
            <div className="absolute inset-0 overflow-auto" style={hide("personal")}>
              <PersonalTab/>
            </div>
            <div className="absolute inset-0 overflow-auto" style={hide("billing")}>
              <BillingTab/>
            </div>
            <div className="absolute inset-0 overflow-auto" style={hide("trend")}>
            </div>
            <div className="absolute inset-0 overflow-auto" style={hide("ai")}>
              <AITab clients={data.clients} members={data.members} onAddTask={addTask} onAddSubtask={addSubtask}/>
              <TrendTab clients={data.clients}/>
            </div>
          </div>
        </div>
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

/* ═══ ROOT ═══ */
function AppWithAuth() {
  const {user,loading}=useAuth();
  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
      <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if(USE_FIREBASE&&!user) return <LoginScreen/>;
  return <AppInner/>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><AppWithAuth/></AuthProvider></ThemeProvider>;
}
