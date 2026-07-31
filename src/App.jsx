/**
 * App.jsx  v2.2.0
 * - 다크/라이트 모드 토글
 * - 탭 전환해도 Rest 탭 데이터 유지 (display:none)
 * - Task/Subtask/Project/Client 전체 인라인 수정
 * - Firebase ↔ 로컬 자동 분기
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  USE_FIREBASE, auth, db,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from "./firebase.js";
import { SEED_DATA, calcProjPct, mkId } from "./utils.js";
import { ThemeProvider, ThemeToggle, useTheme } from "./ThemeContext.jsx";

import TaskTab     from "./tabs/TaskTab.jsx";
import CalendarTab from "./tabs/CalendarTab.jsx";
import PersonalTab from "./tabs/PersonalTab.jsx";
import RestTab     from "./tabs/RestTab.jsx";

export const APP_VERSION = "v2.2.0";

const TABS = [
  { id:"task",     icon:"◈", label:"Task" },
  { id:"calendar", icon:"◷", label:"Month & Weekly" },
  { id:"personal", icon:"◉", label:"Personal" },
  { id:"rest",     icon:"◌", label:"Rest" },
];

/* ════════════════════════════
   AUTH CONTEXT
════════════════════════════ */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!USE_FIREBASE) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  const signIn  = () => signInWithPopup(auth, new GoogleAuthProvider());
  const doSignOut = () => signOut(auth);

  return <AuthCtx.Provider value={{ user, loading, signIn, signOut: doSignOut }}>{children}</AuthCtx.Provider>;
}

/* ════════════════════════════
   LOGIN SCREEN
════════════════════════════ */
function LoginScreen() {
  const { signIn } = useAuth();
  const { dark } = useTheme();
  const [busy, setBusy] = useState(false);
  const handle = async () => { setBusy(true); try{ await signIn(); }catch{} setBusy(false); };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-64 rounded-full blur-3xl"
          style={{background:"rgba(99,102,241,0.08)"}}/>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-56 rounded-full blur-3xl"
          style={{background:"rgba(124,58,237,0.06)"}}/>
      </div>
      {/* theme toggle */}
      <div className="absolute top-4 right-4"><ThemeToggle/></div>

      <div className="relative text-center space-y-8 px-8" style={{animation:"fadeUp .6s ease both"}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)",boxShadow:"0 0 40px rgba(99,102,241,.4)"}}>W</div>
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{color:"var(--text)"}}>WorkFlow</h1>
            <p className="text-sm mt-1" style={{color:"var(--text4)"}}>i4u Works 전용 프로젝트 관리</p>
          </div>
        </div>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {[["◈","Task · 칸반 · 4단계 계층"],["◷","Month & Weekly 캘린더"],["◉","Personal 습관 트래커"],["◌","Rest · 트렌드 · 칭찬판"]].map(([icon,label])=>(
            <div key={label} className="flex items-center gap-3">
              <span className="text-indigo-400 w-4 text-sm">{icon}</span>
              <span className="text-xs" style={{color:"var(--text3)"}}>{label}</span>
            </div>
          ))}
        </div>
        <button onClick={handle} disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:brightness-110"
          style={{background:"linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.05))",border:"1px solid rgba(255,255,255,.15)",boxShadow:"0 4px 24px rgba(0,0,0,.4)"}}>
          {busy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>}
          {busy?"연결 중...":"Google 계정으로 시작하기"}
        </button>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ════════════════════════════
   DATA HOOK
════════════════════════════ */
function useData() {
  const { user } = useAuth();
  const [data, setData] = useState(SEED_DATA);

  useEffect(() => {
    if (!USE_FIREBASE || !user) return;
    const qClients = query(collection(db,"clients"), where("ownerId","==",user.uid));
    const unsub = onSnapshot(qClients, async snap => {
      const clients = await Promise.all(snap.docs.map(async cDoc => {
        const client = { id:cDoc.id, ...cDoc.data(), projects:[] };
        const pSnap  = await new Promise(res=>{const u=onSnapshot(query(collection(db,`clients/${cDoc.id}/projects`),orderBy("createdAt","asc")),s=>{u();res(s);});});
        client.projects = await Promise.all(pSnap.docs.map(async pDoc => {
          const project = { id:pDoc.id, ...pDoc.data(), tasks:[] };
          const tSnap   = await new Promise(res=>{const u=onSnapshot(query(collection(db,`clients/${cDoc.id}/projects/${pDoc.id}/tasks`),orderBy("order","asc")),s=>{u();res(s);});});
          project.tasks = await Promise.all(tSnap.docs.map(async tDoc => {
            const task  = { id:tDoc.id, ...tDoc.data(), subtasks:[] };
            const sSnap = await new Promise(res=>{const u=onSnapshot(collection(db,`clients/${cDoc.id}/projects/${pDoc.id}/tasks/${tDoc.id}/subtasks`),s=>{u();res(s);});});
            task.subtasks = sSnap.docs.map(d=>({id:d.id,...d.data()}));
            return task;
          }));
          return project;
        }));
        return client;
      }));
      setData({ clients });
    });
    return unsub;
  }, [user]);

  const write = useCallback((localFn, fbFn) => {
    if (USE_FIREBASE && db) { fbFn().catch(e=>console.error("[FB]",e)); }
    else { setData(prev=>{ const d=JSON.parse(JSON.stringify(prev)); localFn(d); return d; }); }
  }, []);

  const updateSubtask = useCallback((cid,pid,tid,sid,upd)=>write(
    d=>{const s=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid)?.subtasks.find(s=>s.id===sid);if(s)Object.assign(s,upd);},
    ()=>updateDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${sid}`),{...upd,updatedAt:serverTimestamp()})
  ),[write]);

  const updateTask = useCallback((cid,pid,tid,upd)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)Object.assign(t,upd);},
    ()=>updateDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}`),{...upd,updatedAt:serverTimestamp()})
  ),[write]);

  const addTask = useCallback((cid,pid,name,assignee,dueDate)=>write(
    d=>{const p=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid);if(p)p.tasks.push({id:mkId(),name,order:p.tasks.length,assignee,dueDate,nasPath:null,fromGmail:false,subtasks:[]});},
    ()=>addDoc(collection(db,`clients/${cid}/projects/${pid}/tasks`),{name,order:99,assignee,dueDate,nasPath:null,fromGmail:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
  ),[write]);

  const addSubtask = useCallback((cid,pid,tid,name)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)t.subtasks.push({id:mkId(),name,status:"pending",order:t.subtasks.length,assignee:null,dueDate:null,nasPath:null,orderOverridden:false});},
    ()=>addDoc(collection(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks`),{name,status:"pending",order:99,assignee:null,dueDate:null,nasPath:null,orderOverridden:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
  ),[write]);

  const deleteSubtask = useCallback((cid,pid,tid,sid)=>write(
    d=>{const t=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid);if(t)t.subtasks=t.subtasks.filter(s=>s.id!==sid);},
    ()=>deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${sid}`))
  ),[write]);

  const deleteTask = useCallback((cid,pid,tid)=>write(
    d=>{const p=d.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid);if(p)p.tasks=p.tasks.filter(t=>t.id!==tid);},
    async()=>{const subs=data.clients.find(c=>c.id===cid)?.projects.find(p=>p.id===pid)?.tasks.find(t=>t.id===tid)?.subtasks||[];await Promise.all(subs.map(s=>deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}/subtasks/${s.id}`))));await deleteDoc(doc(db,`clients/${cid}/projects/${pid}/tasks/${tid}`));}
  ),[write,data]);

  const addClient = useCallback((name,color)=>write(
    d=>d.clients.push({id:mkId(),name,color,ownerId:"local",invitedEmails:[],projects:[]}),
    ()=>addDoc(collection(db,"clients"),{name,color,ownerId:user?.uid,invitedEmails:[],createdAt:serverTimestamp()})
  ),[write,user]);

  const addProject = useCallback((cid,name,description)=>write(
    d=>{const c=d.clients.find(c=>c.id===cid);if(c)c.projects.push({id:mkId(),name,description,status:"active",tasks:[]});},
    ()=>addDoc(collection(db,`clients/${cid}/projects`),{name,description,status:"active",createdAt:serverTimestamp()})
  ),[write]);

  return { data, updateSubtask, updateTask, addTask, addSubtask, deleteSubtask, deleteTask, addClient, addProject };
}

/* ════════════════════════════
   TOAST
════════════════════════════ */
function Toast({ msg, type, onDone }) {
  useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t);},[]);
  const s={done:{c:"#34d399",b:"rgba(6,78,59,.9)",bd:"rgba(52,211,153,.4)"},in_progress:{c:"#fbbf24",b:"rgba(78,49,6,.9)",bd:"rgba(251,191,36,.4)"},error:{c:"#f87171",b:"rgba(78,6,6,.9)",bd:"rgba(248,113,113,.4)"},info:{c:"#818cf8",b:"rgba(30,27,75,.9)",bd:"rgba(99,102,241,.4)"}}[type]||{c:"#818cf8",b:"rgba(30,27,75,.9)",bd:"rgba(99,102,241,.4)"};
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-xl"
      style={{zIndex:9999,background:s.b,border:`1px solid ${s.bd}`,color:s.c,backdropFilter:"blur(12px)"}}>
      <div className="w-1.5 h-1.5 rounded-full" style={{background:s.c}}/>{msg}
    </div>
  );
}

/* ════════════════════════════
   SIDEBAR
════════════════════════════ */
function Sidebar({ clients }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState({ cl1:true });

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col h-full"
      style={{borderRight:"1px solid var(--border)",background:"var(--sidebar)"}}>
      <div className="px-4 py-4" style={{borderBottom:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>W</div>
          <div>
            <div className="text-sm font-bold leading-none" style={{color:"var(--text)"}}>WorkFlow</div>
            <div className="text-xs" style={{color:"var(--text5)"}}>i4u Works · {APP_VERSION}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${USE_FIREBASE?"bg-emerald-400":"bg-amber-400"}`}/>
          <span className="text-xs" style={{color:"var(--text5)"}}>{USE_FIREBASE?"Firebase 실시간":"로컬 데이터"}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="text-xs uppercase tracking-widest px-2 mb-2 font-mono" style={{color:"var(--text5)"}}>Clients</div>
        {clients.map(c=>(
          <div key={c.id}>
            <button onClick={()=>setOpen(p=>({...p,[c.id]:!p[c.id]}))}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
              style={{color:"var(--text4)"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <svg className={`w-3 h-3 transition-transform ${open[c.id]?"rotate-90":""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7"/></svg>
              <div className="w-5 h-5 rounded text-xs font-bold text-white flex items-center justify-center"
                style={{background:`${c.color}25`,border:`1px solid ${c.color}40`}}>{c.name[0]}</div>
              <span className="text-xs font-medium truncate flex-1 text-left">{c.name}</span>
            </button>
            {open[c.id]&&c.projects.map(p=>{
              const pp=calcProjPct(p.tasks);
              return (
                <div key={p.id} className="ml-6 pl-2" style={{borderLeft:"1px solid var(--border)"}}>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors"
                    onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{background:pp===100?"#34d399":pp>0?"#fbbf24":"var(--border2)"}}/>
                    <span className="text-xs truncate flex-1" style={{color:"var(--text4)"}}>{p.name}</span>
                    <span className="text-xs font-mono" style={{color:"var(--text5)"}}>{pp}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-2 py-3" style={{borderTop:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-colors"
          onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0"/>
            : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{background:"linear-gradient(135deg,#f43f5e,#ec4899)"}}>선</div>}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{color:"var(--text2)"}}>{user?.displayName||"김선민"}</div>
            <div className="text-xs" style={{color:"var(--text5)"}}>팀장 · i4u Works</div>
          </div>
          {USE_FIREBASE&&<button onClick={signOut} title="로그아웃"
            className="text-xs transition-colors" style={{color:"var(--text5)"}}>↩</button>}
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════
   APP INNER
════════════════════════════ */
function AppInner() {
  const { data, updateSubtask, updateTask, addTask, addSubtask,
          deleteSubtask, deleteTask, addClient, addProject } = useData();
  const [activeTab,   setActiveTab]   = useState("task");
  const [toast,       setToast]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark } = useTheme();

  const show = (msg, type="info") => setToast({ msg, type });

  const wrapSub = useCallback((cid,pid,tid,sid,upd) => {
    updateSubtask(cid,pid,tid,sid,upd);
    if(upd.status) show(`상태: ${{pending:"대기",in_progress:"진행",done:"완료"}[upd.status]}`, upd.status);
  },[updateSubtask]);

  const flatProjects = useMemo(()=>
    data.clients.flatMap(c=>c.projects.map(p=>({...p,clientName:c.name,color:c.color})))
  ,[data]);

  /* Rest 탭은 unmount하지 않고 display:none으로 숨김 — 데이터 유지 */
  const tabVisible = id => activeTab===id ? {} : { display:"none" };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{background:"var(--bg)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{zIndex:0}}>
        {dark&&<>
          <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full blur-3xl"
            style={{background:"rgba(99,102,241,0.05)"}}/>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[280px] rounded-full blur-3xl"
            style={{background:"rgba(124,58,237,0.04)"}}/>
        </>}
      </div>

      {/* mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 relative flex-shrink-0"
        style={{borderBottom:"1px solid var(--border)",zIndex:10}}>
        <button onClick={()=>setSidebarOpen(p=>!p)} className="flex flex-col gap-1.5 w-8 h-8 items-center justify-center">
          {[0,1,2].map(i=><div key={i} className="w-5 h-px" style={{background:"var(--text3)"}}/>)}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-black"
            style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>W</div>
          <span className="font-bold text-sm" style={{color:"var(--text)"}}>WorkFlow</span>
        </div>
        <ThemeToggle/>
      </header>

      <div className="flex flex-1 overflow-hidden relative" style={{zIndex:1}}>
        {/* sidebar */}
        <div className={`md:relative md:translate-x-0 md:flex fixed inset-y-0 left-0 z-50 flex flex-col
          transition-transform duration-200 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
          <Sidebar clients={data.clients}/>
        </div>
        {sidebarOpen&&<div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={()=>setSidebarOpen(false)}/>}

        {/* main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* tab bar */}
          <div className="flex-shrink-0 px-2 flex items-center overflow-x-auto"
            style={{borderBottom:"1px solid var(--border)"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  activeTab===t.id?"border-indigo-500 text-indigo-400":"border-transparent"
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

          {/* content — Rest 탭은 display:none으로 숨겨서 데이터 유지 */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden" style={tabVisible("task")}>
              <TaskTab
                clients={data.clients}
                onUpdateSubtask={wrapSub}
                onUpdateTask={updateTask}
                onAddTask={(cid,pid,n,a,d)=>{addTask(cid,pid,n,a,d);show("Task 추가됨","info");}}
                onAddSubtask={addSubtask}
                onDeleteSubtask={(cid,pid,tid,sid)=>{deleteSubtask(cid,pid,tid,sid);show("세부 업무 삭제됨","error");}}
                onDeleteTask={(cid,pid,tid)=>{deleteTask(cid,pid,tid);show("Task 삭제됨","error");}}
                onAddClient={addClient}
                onAddProject={addProject}/>
            </div>
            <div className="absolute inset-0 overflow-hidden" style={tabVisible("calendar")}>
              <CalendarTab projects={flatProjects}/>
            </div>
            <div className="absolute inset-0 overflow-hidden" style={tabVisible("personal")}>
              <PersonalTab/>
            </div>
            {/* Rest 탭 — display:none으로 숨겨서 unmount 안 됨 */}
            <div className="absolute inset-0 overflow-hidden" style={tabVisible("rest")}>
              <RestTab clients={data.clients}/>
            </div>
          </div>
        </div>
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

/* ════════════════════════════
   ROOT
════════════════════════════ */
function AppWithAuth() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm" style={{color:"var(--text4)"}}>초기화 중...</p>
      </div>
    </div>
  );
  if (USE_FIREBASE && !user) return <LoginScreen/>;
  return <AppInner/>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithAuth/>
      </AuthProvider>
    </ThemeProvider>
  );
}
