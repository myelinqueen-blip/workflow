/**
 * BillingTab.jsx  v2.6
 * 외주비 정산 관리 (보안):
 *  - 데이터는 이 기기 localStorage에만 저장 (Firebase X)
 *  - 외주 담당자별 월별 정산 내역
 *  - 양식 자동 작성
 *  - 이메일 초안 생성
 *  - PDF 출력 (브라우저 인쇄)
 */
import { useState, useEffect, useRef } from "react";

const LS_KEY = "wf_billing_v1";

const loadBilling = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
};
const saveBilling = data => localStorage.setItem(LS_KEY, JSON.stringify(data));

const mkId  = () => Math.random().toString(36).slice(2, 9);
const nowYM  = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const fmtKRW = n => new Intl.NumberFormat("ko-KR").format(n||0);

const CATEGORIES = ["영상 편집", "디자인", "사진·촬영", "카피라이팅", "번역", "개발", "기획", "기타"];
const VAT_RATE   = 0.1; // 10%

export default function BillingTab() {
  const [records,   setRecords]   = useState(loadBilling);
  const [tab,       setTab]       = useState("list");
  const [selMonth,  setSelMonth]  = useState(nowYM());
  const [showForm,  setShowForm]  = useState(false);
  const [showEmail, setShowEmail] = useState(null);
  const [copied,    setCopied]    = useState(null);

  const [form, setForm] = useState({
    id:"", month:nowYM(), freelancer:"", category:"영상 편집",
    project:"", description:"", amount:"", includeVat:false,
    bankName:"", accountNo:"", accountHolder:"", email:"", phone:"",
    note:"", status:"pending",
  });

  useEffect(() => { saveBilling(records); }, [records]);

  const save = () => {
    if (!form.freelancer.trim() || !form.amount) return;
    const rec = { ...form, id: form.id || mkId(), amount: Number(form.amount), updatedAt: new Date().toISOString() };
    setRecords(prev => form.id ? prev.map(r => r.id===form.id ? rec : r) : [...prev, rec]);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => setForm({
    id:"", month:selMonth, freelancer:"", category:"영상 편집",
    project:"", description:"", amount:"", includeVat:false,
    bankName:"", accountNo:"", accountHolder:"", email:"", phone:"",
    note:"", status:"pending",
  });

  const edit = rec => { setForm({...rec}); setShowForm(true); };
  const del  = id  => setRecords(prev => prev.filter(r => r.id !== id));
  const updateStatus = (id, status) => setRecords(prev => prev.map(r => r.id===id ? {...r,status} : r));

  // 월별 필터
  const filtered = records.filter(r => !selMonth || r.month === selMonth);

  // 집계
  const totalAmt    = filtered.reduce((a,r) => a + (r.amount||0), 0);
  const totalVat    = filtered.filter(r=>r.includeVat).reduce((a,r) => a + Math.round((r.amount||0)*VAT_RATE/(1+VAT_RATE)), 0);
  const totalNet    = totalAmt - totalVat;
  const pending     = filtered.filter(r=>r.status==="pending").length;
  const paid        = filtered.filter(r=>r.status==="paid").length;

  // 이메일 초안
  const buildEmail = rec => {
    const vat  = rec.includeVat ? Math.round(rec.amount*VAT_RATE/(1+VAT_RATE)) : 0;
    const net  = rec.amount - vat;
    return {
      subject: `[i4u Works] ${rec.month} 외주비 정산 — ${rec.freelancer}님`,
      body: `안녕하세요, ${rec.freelancer}님.

${rec.month} 외주 작업에 감사드립니다.

■ 정산 내역
  - 작업: ${rec.description || rec.category}
  - 프로젝트: ${rec.project || "—"}
  - 청구 금액: ${fmtKRW(rec.amount)}원${rec.includeVat ? ` (VAT 포함 / 공급가 ${fmtKRW(net)}원 + 세금 ${fmtKRW(vat)}원)` : ""}

■ 입금 계좌
  - 은행: ${rec.bankName || "—"}
  - 계좌번호: ${rec.accountNo || "—"}
  - 예금주: ${rec.accountHolder || rec.freelancer}

${rec.note ? `■ 비고\n  ${rec.note}\n` : ""}
정산은 이번 달 말일까지 처리될 예정입니다.
문의사항이 있으시면 연락주세요.

감사합니다.
i4u Works 드림`,
    };
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(()=>setCopied(null), 1500);
  };

  const STATUS_STYLE = {
    pending: { color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.3)",  label:"정산 대기" },
    paid:    { color:"#34d399", bg:"rgba(52,211,153,0.1)",  border:"rgba(52,211,153,0.3)",  label:"지급 완료" },
    hold:    { color:"#f87171", bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.3)", label:"보류" },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{background:"var(--bg)"}}>

      {/* header */}
      <div className="flex-shrink-0 px-5 py-3.5 flex items-center gap-3"
        style={{borderBottom:"1px solid var(--border)"}}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
          style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)"}}>💰</div>
        <div>
          <h2 className="text-sm font-bold" style={{color:"var(--text)"}}>외주비 정산</h2>
          <p className="text-xs" style={{color:"var(--text5)"}}>🔒 이 기기에만 저장 · Firebase 미전송 · 관리자 전용</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
            className="text-xs outline-none rounded-xl px-3 py-1.5"
            style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
          <button onClick={()=>{resetForm();setShowForm(true);}}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-white"
            style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
            + 새 정산
          </button>
        </div>
      </div>

      {/* 집계 카드 */}
      <div className="flex-shrink-0 px-5 py-3 grid grid-cols-4 gap-3"
        style={{borderBottom:"1px solid var(--border)"}}>
        {[
          ["총 금액", `${fmtKRW(totalAmt)}원`, "var(--text)"],
          ["공급가", `${fmtKRW(totalNet)}원`, "var(--text3)"],
          ["세금", `${fmtKRW(totalVat)}원`, "var(--text4)"],
          ["대기/완료", `${pending}건 / ${paid}건`, "var(--text3)"],
        ].map(([l,v,c])=>(
          <div key={l} className="rounded-xl px-3 py-2.5 text-center"
            style={{background:"var(--bg2)",border:"1px solid var(--border)"}}>
            <p className="text-xs mb-0.5" style={{color:"var(--text5)"}}>{l}</p>
            <p className="text-sm font-bold" style={{color:c}}>{v}</p>
          </div>
        ))}
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-4xl" style={{color:"var(--text5)"}}>💰</div>
            <p className="text-sm" style={{color:"var(--text4)"}}>
              {selMonth} 정산 내역이 없습니다
            </p>
            <button onClick={()=>{resetForm();setShowForm(true);}}
              className="px-4 py-2 rounded-xl text-sm text-white"
              style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
              + 첫 정산 등록
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(rec=>{
              const st = STATUS_STYLE[rec.status] || STATUS_STYLE.pending;
              const vat = rec.includeVat ? Math.round(rec.amount*VAT_RATE/(1+VAT_RATE)) : 0;
              return (
                <div key={rec.id} className="rounded-2xl overflow-hidden"
                  style={{border:"1px solid var(--border)",background:"var(--bg2)"}}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold" style={{color:"var(--text)"}}>{rec.freelancer}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{background:"var(--hover)",color:"var(--text5)",border:"1px solid var(--border)"}}>
                          {rec.category}
                        </span>
                        {rec.project&&<span className="text-xs" style={{color:"var(--text4)"}}>{rec.project}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-sm font-mono font-semibold" style={{color:"#10b981"}}>
                          {fmtKRW(rec.amount)}원
                          {rec.includeVat&&<span className="text-xs ml-1" style={{color:"var(--text5)"}}>(VAT포함)</span>}
                        </p>
                        {rec.description&&<p className="text-xs truncate max-w-xs" style={{color:"var(--text4)"}}>{rec.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* status select */}
                      <select value={rec.status} onChange={e=>updateStatus(rec.id,e.target.value)}
                        className="text-xs outline-none rounded-xl px-2 py-1 font-medium"
                        style={{background:st.bg,border:`1px solid ${st.border}`,color:st.color}}>
                        <option value="pending">정산 대기</option>
                        <option value="paid">지급 완료</option>
                        <option value="hold">보류</option>
                      </select>
                      <button onClick={()=>setShowEmail(rec)}
                        className="text-xs px-2.5 py-1.5 rounded-xl transition-all"
                        style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",color:"#818cf8"}}>
                        메일
                      </button>
                      <button onClick={()=>edit(rec)}
                        className="text-xs px-2 py-1.5 rounded-xl"
                        style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
                        수정
                      </button>
                      <button onClick={()=>del(rec.id)} className="text-xs" style={{color:"#f87171"}}>✕</button>
                    </div>
                  </div>
                  {rec.note&&(
                    <div className="px-4 py-2" style={{borderTop:"1px solid var(--border)",background:"var(--hover)"}}>
                      <p className="text-xs" style={{color:"var(--text4)"}}>{rec.note}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 정산 등록/수정 폼 */}
      {showForm&&(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"90vh",zIndex:10000}}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{borderBottom:"1px solid var(--border)"}}>
              <h3 className="font-bold text-sm" style={{color:"var(--text)"}}>{form.id?"정산 수정":"새 정산 등록"}</h3>
              <button onClick={()=>setShowForm(false)} className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["정산 월", "month", "month", ""],
                  ["외주 담당자 *", "freelancer", "text", "홍길동"],
                  ["이메일", "email", "email", "example@gmail.com"],
                  ["연락처", "phone", "tel", "010-0000-0000"],
                ].map(([label, key, type, ph])=>(
                  <div key={key} className={key==="month"||key==="freelancer"?"col-span-1":""}>
                    <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>{label}</label>
                    <input value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                      type={type} placeholder={ph}
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)",colorScheme:"dark"}}/>
                  </div>
                ))}
                <div>
                  <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>카테고리</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                    className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>프로젝트</label>
                  <input value={form.project||""} onChange={e=>setForm(p=>({...p,project:e.target.value}))}
                    placeholder="DIVE 2025 행사 기획"
                    className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>작업 내용</label>
                  <input value={form.description||""} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                    placeholder="오프닝 영상 편집 및 자막 작업"
                    className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>금액 *</label>
                  <input value={form.amount||""} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                    type="number" placeholder="500000"
                    className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="vat" checked={form.includeVat}
                    onChange={e=>setForm(p=>({...p,includeVat:e.target.checked}))}
                    className="w-4 h-4 rounded"/>
                  <label htmlFor="vat" className="text-xs cursor-pointer" style={{color:"var(--text3)"}}>
                    VAT 포함 금액
                    {form.amount&&form.includeVat&&(
                      <span style={{color:"var(--text5)"}}> (세금: {fmtKRW(Math.round(Number(form.amount)*VAT_RATE/(1+VAT_RATE)))}원)</span>
                    )}
                  </label>
                </div>
                {/* 계좌 정보 */}
                {[
                  ["은행명", "bankName", "국민은행"],
                  ["계좌번호", "accountNo", "123456-78-901234"],
                  ["예금주", "accountHolder", "홍길동"],
                ].map(([label,key,ph])=>(
                  <div key={key}>
                    <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>{label}</label>
                    <input value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                      placeholder={ph}
                      className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                      style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs block mb-1" style={{color:"var(--text4)"}}>비고</label>
                  <input value={form.note||""} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                    className="w-full px-3 py-2 text-sm outline-none rounded-xl"
                    style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 flex-shrink-0"
              style={{borderTop:"1px solid var(--border)"}}>
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm"
                style={{background:"var(--hover)",color:"var(--text3)"}}>취소</button>
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
                {form.id?"수정 저장":"등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이메일 초안 팝업 */}
      {showEmail&&(()=>{
        const em = buildEmail(showEmail);
        return (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9999}}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowEmail(null)}/>
            <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"85vh",zIndex:10000}}>
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{borderBottom:"1px solid var(--border)"}}>
                <h3 className="font-bold text-sm" style={{color:"var(--text)"}}>정산 메일 초안</h3>
                <div className="flex items-center gap-2">
                  <a href={`mailto:${showEmail.email||""}?subject=${encodeURIComponent(em.subject)}&body=${encodeURIComponent(em.body)}`}
                    className="px-3 py-1.5 rounded-xl text-xs text-white"
                    style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)"}}>
                    메일 앱으로 열기
                  </a>
                  <button onClick={()=>setShowEmail(null)} className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="rounded-xl p-3" style={{background:"var(--hover)",border:"1px solid var(--border)"}}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{color:"var(--text5)"}}>제목</span>
                    <button onClick={()=>copyText(em.subject,"subj")} className="text-xs" style={{color:copied==="subj"?"#34d399":"var(--text5)"}}>
                      {copied==="subj"?"✓ 복사":"복사"}
                    </button>
                  </div>
                  <p className="text-sm font-medium" style={{color:"var(--text)"}}>{em.subject}</p>
                </div>
                <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
                  <div className="flex items-center justify-between px-3 py-2" style={{background:"var(--hover)",borderBottom:"1px solid var(--border)"}}>
                    <span className="text-xs" style={{color:"var(--text5)"}}>본문</span>
                    <button onClick={()=>copyText(em.body,"body")} className="text-xs" style={{color:copied==="body"?"#34d399":"var(--text5)"}}>
                      {copied==="body"?"✓ 복사":"복사"}
                    </button>
                  </div>
                  <pre className="px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap"
                    style={{color:"var(--text2)",fontFamily:"inherit"}}>{em.body}</pre>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
