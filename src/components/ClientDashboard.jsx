/**
 * ClientDashboard.jsx  v2.7
 * 클라이언트별 전체 현황 대시보드
 * - 프로젝트 진행률
 * - 마감 임박 Task
 * - 팀원 업무 분포
 * - PDF 출력
 */
import { useMemo } from "react";
import { calcTaskPct, calcProjPct, fmtDate } from "../utils.js";
import { MemberAvatar } from "./MemberSelect.jsx";

const TODAY = new Date().toISOString().slice(0,10);

const diffDays = iso => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date(TODAY)) / 86400000);
};

export default function ClientDashboard({ client, members, onClose }) {
  const stats = useMemo(() => {
    let totalTasks=0, doneTasks=0, inProgTasks=0, pendingTasks=0;
    let overdue=[], urgent=[], upcoming=[];

    client.projects.forEach(proj => {
      proj.tasks.forEach(task => {
        const pct  = calcTaskPct(task.subtasks);
        const diff = diffDays(task.dueDate);
        totalTasks++;
        if (pct===100) doneTasks++;
        else if (pct>0)  inProgTasks++;
        else             pendingTasks++;

        if (diff!==null && pct<100) {
          if (diff<0)       overdue.push({...task, projName:proj.name, diff});
          else if (diff<=3) urgent.push({...task, projName:proj.name, diff});
          else if (diff<=14)upcoming.push({...task, projName:proj.name, diff});
        }
      });
    });

    // 구성원별 Task 수
    const memberLoad = {};
    client.projects.forEach(proj => {
      proj.tasks.forEach(task => {
        task.subtasks.forEach(sub => {
          if (sub.assigneeId) {
            memberLoad[sub.assigneeId] = (memberLoad[sub.assigneeId]||0)+1;
          }
        });
      });
    });

    return { totalTasks, doneTasks, inProgTasks, pendingTasks, overdue, urgent, upcoming, memberLoad };
  }, [client]);

  const overallPct = client.projects.length
    ? Math.round(client.projects.reduce((a,p)=>a+calcProjPct(p.tasks),0)/client.projects.length)
    : 0;

  const print = () => window.print();

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"90vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)",background:client.color+"08"}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{background:client.color}}>
              {client.name[0]}
            </div>
            <div>
              <h2 className="font-black text-base" style={{color:"var(--text)"}}>{client.name}</h2>
              <p className="text-xs" style={{color:"var(--text5)"}}>
                프로젝트 {client.projects.length}개 · 전체 진행률 {overallPct}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={print}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
              🖨️ PDF 출력
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* 전체 KPI */}
          <div className="grid grid-cols-4 gap-3">
            {[
              ["전체 Task",  stats.totalTasks,   "var(--text)"],
              ["완료",       stats.doneTasks,    "#34d399"],
              ["진행중",     stats.inProgTasks,  "#fbbf24"],
              ["지연",       stats.overdue.length,"#f87171"],
            ].map(([l,v,c])=>(
              <div key={l} className="rounded-2xl p-4 text-center"
                style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
                <p className="text-2xl font-black" style={{color:c}}>{v}</p>
                <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>{l}</p>
              </div>
            ))}
          </div>

          {/* 프로젝트 진행률 */}
          <div className="rounded-2xl overflow-hidden"
            style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
            <div className="px-4 py-3" style={{borderBottom:"1px solid var(--border)"}}>
              <p className="text-sm font-bold" style={{color:"var(--text)"}}>프로젝트 진행현황</p>
            </div>
            <div className="divide-y" style={{divideColor:"var(--border)"}}>
              {client.projects.map(proj=>{
                const pct = calcProjPct(proj.tasks);
                const allSubs = proj.tasks.flatMap(t=>t.subtasks);
                return (
                  <div key={proj.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{proj.name}</p>
                        {proj.description&&<p className="text-xs" style={{color:"var(--text5)"}}>{proj.description}</p>}
                      </div>
                      <span className="text-lg font-black font-mono"
                        style={{color:pct===100?"#34d399":pct>=50?"#fbbf24":"#94a3b8"}}>
                        {pct}%
                      </span>
                    </div>
                    {/* progress bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden mb-2"
                      style={{background:"var(--border2)"}}>
                      <div className="h-full rounded-full transition-all"
                        style={{width:pct+"%",background:pct===100?"#34d399":pct>=50?"#fbbf24":"#94a3b8"}}/>
                    </div>
                    <div className="flex items-center gap-3">
                      {[
                        ["완료", allSubs.filter(s=>s.status==="done").length, "#34d399"],
                        ["진행", allSubs.filter(s=>s.status==="in_progress").length, "#fbbf24"],
                        ["대기", allSubs.filter(s=>s.status==="pending").length, "#94a3b8"],
                      ].map(([l,n,c])=>(
                        <span key={l} className="text-xs px-2 py-0.5 rounded-full"
                          style={{color:c,background:c+"12",border:"1px solid "+c+"25"}}>
                          {l} {n}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 마감 임박 */}
          {(stats.overdue.length>0||stats.urgent.length>0)&&(
            <div className="rounded-2xl overflow-hidden"
              style={{border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.04)"}}>
              <div className="px-4 py-3" style={{borderBottom:"1px solid rgba(248,113,113,0.2)"}}>
                <p className="text-sm font-bold" style={{color:"#f87171"}}>
                  ⚠️ 주의 필요 ({stats.overdue.length+stats.urgent.length}건)
                </p>
              </div>
              <div className="divide-y" style={{divideColor:"rgba(248,113,113,0.15)"}}>
                {[...stats.overdue, ...stats.urgent].map((t,i)=>(
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={t.diff<0
                        ?{background:"rgba(248,113,113,0.15)",color:"#f87171",border:"1px solid rgba(248,113,113,0.3)"}
                        :{background:"rgba(251,191,36,0.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.3)"}}>
                      {t.diff<0 ? "D+" + Math.abs(t.diff) : "D-" + t.diff}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{color:"var(--text)"}}>{t.name}</p>
                      <p className="text-xs" style={{color:"var(--text5)"}}>{t.projName}</p>
                    </div>
                    {t.dueDate&&<span className="text-xs font-mono flex-shrink-0" style={{color:"var(--text4)"}}>{fmtDate(t.dueDate)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 구성원 업무 분포 */}
          {Object.keys(stats.memberLoad).length>0&&(
            <div className="rounded-2xl overflow-hidden"
              style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
              <div className="px-4 py-3" style={{borderBottom:"1px solid var(--border)"}}>
                <p className="text-sm font-bold" style={{color:"var(--text)"}}>구성원 업무 분포</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {Object.entries(stats.memberLoad)
                  .sort((a,b)=>b[1]-a[1])
                  .map(([mid,cnt])=>{
                    const m    = members.find(x=>x.id===mid);
                    const max  = Math.max(...Object.values(stats.memberLoad));
                    if (!m) return null;
                    return (
                      <div key={mid} className="flex items-center gap-3">
                        <MemberAvatar member={m} size="sm"/>
                        <span className="text-xs w-16 flex-shrink-0" style={{color:"var(--text3)"}}>{m.name}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:"var(--border2)"}}>
                          <div className="h-full rounded-full" style={{width:((cnt/max)*100)+"%",background:m.color}}/>
                        </div>
                        <span className="text-xs font-mono w-8 text-right" style={{color:"var(--text4)"}}>{cnt}건</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2주 이내 일정 */}
          {stats.upcoming.length>0&&(
            <div className="rounded-2xl overflow-hidden"
              style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
              <div className="px-4 py-3" style={{borderBottom:"1px solid var(--border)"}}>
                <p className="text-sm font-bold" style={{color:"var(--text)"}}>2주 이내 마감</p>
              </div>
              <div className="divide-y" style={{divideColor:"var(--border)"}}>
                {stats.upcoming.map((t,i)=>(
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{background:"rgba(129,140,248,0.1)",color:"#818cf8",border:"1px solid rgba(129,140,248,0.25)"}}>
                      D-{t.diff}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{color:"var(--text)"}}>{t.name}</p>
                      <p className="text-xs" style={{color:"var(--text5)"}}>{t.projName}</p>
                    </div>
                    <span className="text-xs font-mono flex-shrink-0" style={{color:"var(--text4)"}}>{fmtDate(t.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
