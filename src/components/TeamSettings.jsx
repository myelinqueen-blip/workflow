/**
 * TeamSettings.jsx  v2.6
 * 팀 구성원 관리:
 *  - Google 로그인 구성원 초대 (이메일)
 *  - 로그인 없이 수동 등록
 *  - 역할(팀장/팀원/외부) 설정
 *  - 이메일 발송 (mailto)
 */
import { useState } from "react";
import { mkId } from "../utils.js";
import { MemberAvatar } from "./MemberSelect.jsx";

const ROLES = ["팀장", "팀원", "디자이너", "카피라이터", "외부협력사", "인턴"];
const COLORS = ["#6366f1","#f43f5e","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#ef4444","#84cc16"];

export default function TeamSettings({ members, onAddMember, onUpdateMember, onDeleteMember, onClose }) {
  const [tab, setTab] = useState("list"); // list | invite | add
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [newMember, setNewMember] = useState({ name:"", role:"팀원", email:"", color:COLORS[Math.floor(Math.random()*COLORS.length)] });
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [confirm, setConfirm] = useState(null);

  /* ── 이메일 초대 ── */
  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    const subject = encodeURIComponent("WorkFlow 초대 — i4u Works 프로젝트 관리 앱");
    const body    = encodeURIComponent(
      `안녕하세요!\n\nWorkFlow 앱에 초대합니다.\n\n접속 URL: https://myelinqueen-blip.github.io/workflow/\n\nGoogle 계정으로 로그인하시면 됩니다.\n\n${inviteMsg ? `\n메시지: ${inviteMsg}` : ""}`
    );
    window.open(`mailto:${inviteEmail}?subject=${subject}&body=${body}`);
    setInviteEmail(""); setInviteMsg(""); setTab("list");
  };

  /* ── 수동 추가 ── */
  const addManual = () => {
    if (!newMember.name.trim()) return;
    onAddMember({ ...newMember, id: mkId(), avatar: newMember.name[0] });
    setNewMember({ name:"", role:"팀원", email:"", color:COLORS[Math.floor(Math.random()*COLORS.length)] });
    setTab("list");
  };

  /* ── 편집 저장 ── */
  const saveEdit = (id) => {
    onUpdateMember(id, editDraft);
    setEditId(null);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"85vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)"}}>
          <div>
            <h2 className="font-bold text-base" style={{color:"var(--text)"}}>팀 구성원 관리</h2>
            <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>구성원 추가·수정·초대 · {members.length}명</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
        </div>

        {/* sub-tab */}
        <div className="flex px-4 pt-3 gap-1 flex-shrink-0">
          {[["list","👥 구성원 목록"],["invite","📧 이메일 초대"],["add","➕ 수동 추가"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={tab===k
                ?{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.35)",color:"#818cf8"}
                :{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* ── 목록 ── */}
          {tab==="list"&&(
            <div className="space-y-2">
              {members.map(m=>(
                <div key={m.id} className="rounded-xl overflow-hidden"
                  style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
                  {editId===m.id ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>이름</label>
                          <input value={editDraft.name||""} onChange={e=>setEditDraft(p=>({...p,name:e.target.value}))}
                            className="w-full px-3 py-1.5 text-sm outline-none rounded-xl"
                            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>역할</label>
                          <select value={editDraft.role||""} onChange={e=>setEditDraft(p=>({...p,role:e.target.value}))}
                            className="w-full px-3 py-1.5 text-sm outline-none rounded-xl"
                            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}>
                            {ROLES.map(r=><option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>이메일</label>
                          <input value={editDraft.email||""} onChange={e=>setEditDraft(p=>({...p,email:e.target.value}))}
                            type="email" placeholder="example@i4u.co.kr"
                            className="w-full px-3 py-1.5 text-sm outline-none rounded-xl"
                            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>텔레그램 ID</label>
                          <input value={editDraft.telegramId||""} onChange={e=>setEditDraft(p=>({...p,telegramId:e.target.value}))}
                            placeholder="@username"
                            className="w-full px-3 py-1.5 text-sm outline-none rounded-xl"
                            style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs block mb-1.5" style={{color:"var(--text4)"}}>컬러</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {COLORS.map(c=>(
                            <button key={c} onClick={()=>setEditDraft(p=>({...p,color:c}))}
                              className="w-6 h-6 rounded-full transition-all"
                              style={{background:c,outline:editDraft.color===c?`2px solid ${c}`:"2px solid transparent",outlineOffset:"2px"}}/>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>setConfirm(m.id)}
                          className="text-xs mr-auto" style={{color:"#f87171"}}>삭제</button>
                        <button onClick={()=>setEditId(null)}
                          className="px-3 py-1.5 rounded-xl text-xs"
                          style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
                        <button onClick={()=>saveEdit(m.id)}
                          className="px-4 py-1.5 rounded-xl text-xs text-white bg-indigo-600">저장</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 group/mc"
                      onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <MemberAvatar member={m} size="lg"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{m.name}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text5)"}}>{m.role||"팀원"}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {m.email&&<span className="text-xs" style={{color:"var(--text4)"}}>{m.email}</span>}
                          {m.telegramId&&<span className="text-xs" style={{color:"#60a5fa"}}>{m.telegramId}</span>}
                          {!m.email&&!m.telegramId&&<span className="text-xs" style={{color:"var(--text5)"}}>연락처 미등록</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover/mc:opacity-100 transition-opacity">
                        {m.email&&(
                          <a href={`mailto:${m.email}`}
                            className="text-xs px-2 py-1 rounded-lg transition-colors"
                            style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)"}}
                            onClick={e=>e.stopPropagation()}>
                            메일
                          </a>
                        )}
                        <button onClick={()=>{setEditId(m.id);setEditDraft({...m});}}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{background:"var(--hover)",color:"var(--text4)",border:"1px solid var(--border)"}}>
                          수정
                        </button>
                      </div>
                    </div>
                  )}
                  {/* delete confirm */}
                  {confirm===m.id&&(
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{borderTop:"1px solid var(--border)",background:"rgba(248,113,113,0.06)"}}>
                      <p className="text-xs" style={{color:"#f87171"}}>"{m.name}" 삭제할까요?</p>
                      <div className="flex gap-2">
                        <button onClick={()=>setConfirm(null)} className="text-xs px-2.5 py-1 rounded-lg"
                          style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
                        <button onClick={()=>{onDeleteMember(m.id);setConfirm(null);setEditId(null);}}
                          className="text-xs px-2.5 py-1 rounded-lg text-white bg-rose-600">삭제</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── 이메일 초대 ── */}
          {tab==="invite"&&(
            <div className="space-y-4">
              <div className="rounded-2xl p-4 space-y-1"
                style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"}}>
                <p className="text-xs font-semibold" style={{color:"#818cf8"}}>🔒 초대 방식 안내</p>
                <p className="text-xs leading-relaxed" style={{color:"var(--text3)"}}>
                  초대받은 구성원이 <strong>Google 계정으로 로그인</strong>하면 동일한 데이터를 실시간으로 공유할 수 있습니다.<br/>
                  Firebase에 이메일이 등록되면 해당 계정에 접근 권한이 부여됩니다.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>초대할 이메일 *</label>
                  <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
                    type="email" placeholder="colleague@i4u.co.kr"
                    className="w-full px-4 py-2.5 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                </div>
                <div>
                  <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>추가 메시지 (선택)</label>
                  <textarea value={inviteMsg} onChange={e=>setInviteMsg(e.target.value)}
                    placeholder="안녕하세요! WorkFlow 앱 함께 사용해요 :)"
                    className="w-full px-4 py-2.5 text-sm outline-none rounded-xl resize-none"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)",minHeight:80}}/>
                </div>
                <button onClick={sendInvite} disabled={!inviteEmail.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>
                  📧 이메일 초대 발송
                </button>
                <p className="text-xs text-center" style={{color:"var(--text5)"}}>
                  기본 메일 앱이 열립니다
                </p>
              </div>
            </div>
          )}

          {/* ── 수동 추가 ── */}
          {tab==="add"&&(
            <div className="space-y-4">
              <div className="rounded-2xl p-4 space-y-1"
                style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)"}}>
                <p className="text-xs font-semibold" style={{color:"#fbbf24"}}>💡 수동 등록 안내</p>
                <p className="text-xs leading-relaxed" style={{color:"var(--text3)"}}>
                  구글 로그인 없이도 이름만으로 등록해서 담당자 지정에 활용할 수 있습니다.<br/>
                  나중에 이메일을 등록하면 Firebase 공유 계정과 연결됩니다.
                </p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>이름 *</label>
                    <input value={newMember.name} onChange={e=>setNewMember(p=>({...p,name:e.target.value,avatar:e.target.value[0]||""}))}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>역할</label>
                    <select value={newMember.role} onChange={e=>setNewMember(p=>({...p,role:e.target.value}))}
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}>
                      {ROLES.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>이메일 (선택)</label>
                    <input value={newMember.email} onChange={e=>setNewMember(p=>({...p,email:e.target.value}))}
                      type="email" placeholder="example@i4u.co.kr"
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>텔레그램 ID (선택)</label>
                    <input value={newMember.telegramId||""} onChange={e=>setNewMember(p=>({...p,telegramId:e.target.value}))}
                      placeholder="@username"
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1.5" style={{color:"var(--text3)"}}>컬러</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c=>(
                      <button key={c} onClick={()=>setNewMember(p=>({...p,color:c}))}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{background:c,outline:newMember.color===c?`2px solid ${c}`:"2px solid transparent",outlineOffset:"2px"}}/>
                    ))}
                  </div>
                </div>
                {/* 미리보기 */}
                {newMember.name&&(
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{background:"var(--hover)",border:"1px solid var(--border)"}}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{background:newMember.color}}>{newMember.name[0]}</div>
                    <div>
                      <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{newMember.name}</p>
                      <p className="text-xs" style={{color:"var(--text4)"}}>{newMember.role}</p>
                    </div>
                  </div>
                )}
                <button onClick={addManual} disabled={!newMember.name.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
                  ➕ 구성원 추가
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
