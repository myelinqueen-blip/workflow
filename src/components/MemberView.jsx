/**
 * MemberView.jsx
 * 구성원별 프로젝트·Task 모아보기
 */
import { useMemo } from "react";
import { calcTaskPct, fmtDate } from "../utils.js";
import { MemberAvatar } from "./MemberSelect.jsx";

const ST_COLOR = {
  pending:     "#94a3b8",
  in_progress: "#fbbf24",
  done:        "#34d399",
};

export default function MemberView({ members, clients, onClose }) {
  // 구성원별 Task 집계
  const byMember = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = { member:m, tasks:[] }; });

    clients.forEach(client => {
      client.projects.forEach(proj => {
        proj.tasks.forEach(task => {
          // task 레벨
          if(task.assigneeId && map[task.assigneeId]) {
            map[task.assigneeId].tasks.push({
              type:"task",
              clientName: client.name,
              clientColor: client.color,
              projName: proj.name,
              projId: proj.id,
              id: task.id,
              name: task.name,
              dueDate: task.dueDate,
              pct: calcTaskPct(task.subtasks),
              status: calcTaskPct(task.subtasks)===100?"done":task.subtasks.some(s=>s.status==="in_progress")?"in_progress":"pending",
            });
          }
          // subtask 레벨
          task.subtasks.forEach(sub => {
            if(sub.assigneeId && map[sub.assigneeId] && sub.assigneeId !== task.assigneeId) {
              map[sub.assigneeId].tasks.push({
                type:"subtask",
                clientName: client.name,
                clientColor: client.color,
                projName: proj.name,
                taskName: task.name,
                id: sub.id,
                name: sub.name,
                dueDate: sub.dueDate,
                pct: sub.status==="done"?100:sub.status==="in_progress"?50:0,
                status: sub.status,
              });
            }
          });
        });
      });
    });
    return Object.values(map);
  }, [members, clients]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"85vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)"}}>
          <h2 className="font-bold text-base" style={{color:"var(--text)"}}>구성원별 업무 현황</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byMember.map(({member, tasks})=>{
              const done      = tasks.filter(t=>t.status==="done").length;
              const inProg    = tasks.filter(t=>t.status==="in_progress").length;
              const pending   = tasks.filter(t=>t.status==="pending").length;
              const overdue   = tasks.filter(t=>t.dueDate&&t.dueDate<new Date().toISOString().slice(0,10)&&t.status!=="done").length;
              return (
                <div key={member.id} className="rounded-2xl overflow-hidden"
                  style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
                  {/* member header */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{borderBottom:"1px solid var(--border)",background:`${member.color}0a`}}>
                    <MemberAvatar member={member} size="lg"/>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{color:"var(--text)"}}>{member.name}</p>
                      <p className="text-xs" style={{color:"var(--text4)"}}>{member.role||"팀원"}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[["완료",done,"#34d399"],["진행",inProg,"#fbbf24"],["대기",pending,"#94a3b8"]].map(([l,n,c])=>(
                        <span key={l} className="text-xs px-2 py-0.5 rounded-full"
                          style={{color:c,background:`${c}15`,border:`1px solid ${c}30`}}>
                          {l} {n}
                        </span>
                      ))}
                      {overdue>0&&(
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{color:"#f87171",background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.3)"}}>
                          지연 {overdue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* task list */}
                  <div className="divide-y" style={{divideColor:"var(--border)"}}>
                    {tasks.length===0 ? (
                      <p className="px-4 py-3 text-xs text-center" style={{color:"var(--text5)"}}>배정된 업무 없음</p>
                    ) : tasks.slice(0,8).map((t,i)=>(
                      <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{background:t.clientColor||"#6366f1"}}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {t.type==="subtask"&&(
                              <span className="text-xs px-1 rounded" style={{background:"var(--hover)",color:"var(--text5)"}}>↳</span>
                            )}
                            <p className={`text-xs truncate ${t.status==="done"?"line-through":""}`}
                              style={{color:t.status==="done"?"var(--text5)":"var(--text2)"}}>
                              {t.name}
                            </p>
                          </div>
                          <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>
                            {t.clientName} · {t.projName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {t.dueDate&&(
                            <span className="text-xs font-mono"
                              style={{color:t.dueDate<new Date().toISOString().slice(0,10)&&t.status!=="done"?"#f87171":"var(--text5)"}}>
                              {fmtDate(t.dueDate)}
                            </span>
                          )}
                          <div className="w-1.5 h-1.5 rounded-full"
                            style={{background:ST_COLOR[t.status]||"#94a3b8"}}/>
                        </div>
                      </div>
                    ))}
                    {tasks.length>8&&(
                      <p className="px-4 py-2 text-xs text-center" style={{color:"var(--text5)"}}>
                        외 {tasks.length-8}개 업무
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
