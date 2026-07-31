/**
 * RestTab.jsx  v2.2
 * - 탭 이동해도 데이터 유지 (unmount 안 됨 — display:none 방식)
 * - 섹션 열릴 때 자동 서칭
 * - 새로고침 버튼
 * - 카피 아이디어 패널
 */
import { useState, useRef, useMemo, useEffect } from "react";
import { callClaude, safeJSON, todayStr } from "../utils.js";
import { useTheme } from "../ThemeContext.jsx";

const APP_VERSION = "v2.2.0";

const SOURCES = ["아이보스","매드타임스","브랜드브리프","오픈애즈","캠페인코리아","이노션 인사이트","디지털인사이트","마케팅트렌드","캐릿"];

const SECTIONS = [
  { id:"marketing", icon:"📣", label:"마케팅 트렌드",  color:"#818cf8",
    desc:"아이보스·매드타임스 등 자동 발굴",
    prompt:()=>`오늘은 ${todayStr()}.\n웹에서 최근 7일 이내 마케팅 인사이트 기사 검색.\n검색 대상: ${SOURCES.join(", ")} 및 기타 마케팅 미디어.\n4개, JSON만:\n[{"title":"제목","summary":"2-3문장 요약","url":"https://...","source":"출처","date":"YYYY-MM-DD"}]` },
  { id:"sns",       icon:"📱", label:"SNS 트렌드",     color:"#f472b6",
    desc:"X·유튜브·인스타 실시간",
    prompt:()=>`오늘은 ${todayStr()}.\nX 실시간, 유튜브 급상승, 인스타 해시태그 검색. 마케터·MZ 관련 4개, JSON만:\n[{"title":"키워드","summary":"2-3문장","platform":"X|유튜브|인스타","url":"https://...","source":"출처"}]` },
  { id:"brand",     icon:"🔥", label:"화제의 브랜드",  color:"#fb923c",
    desc:"브랜드b·캐릿 공개 페이지",
    prompt:()=>`오늘은 ${todayStr()}.\n최근 7일 이내 한국 화제 브랜드·캠페인. brandbrief.co.kr, carit.co.kr 포함. 4개, JSON만:\n[{"title":"브랜드명 + 이슈","summary":"2-3문장","url":"https://...","source":"출처","date":"YYYY-MM-DD"}]` },
  { id:"ai",        icon:"🤖", label:"AI·디지털",      color:"#34d399",
    desc:"마케터 실무 AI 소식",
    prompt:()=>`오늘은 ${todayStr()}.\n최근 7일 이내 마케터에게 실용적인 AI·디지털 트렌드. 4개, JSON만:\n[{"title":"제목","summary":"2-3문장","url":"https://...","source":"출처","date":"YYYY-MM-DD"}]` },
  { id:"meme",      icon:"😂", label:"밈",             color:"#c084fc",
    desc:"트위터·캐릿·커뮤니티 최신 밈",
    prompt:()=>`오늘은 ${todayStr()}.\n한국 최신 밈·유행어. 트위터, carit.co.kr, 에펨코리아. 최근 2주 이내. 5개, JSON만:\n[{"title":"밈/유행어","emoji":"이모지","summary":"뜻+예문","platform":"트위터|인스타|커뮤니티","url":"https://..."}]` },
];

/* ── Copy Panel ── */
function CopyPanel({ item, projects, onClose }) {
  const { dark } = useTheme();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let alive = true;
    const pl = projects.map(p=>`[${p.id}] ${p.clientName||""}/${p.name}: ${p.description||""}`).join("\n");
    callClaude(
      `트렌드: "${item.title}"\n내용: ${item.summary}\n\n프로젝트:\n${pl}\n\n각 프로젝트 카피 1-2개. JSON만:\n[{"projectId":"","projectName":"","copies":[{"type":"타이틀|서브카피|해시태그|CTA","text":"카피","note":"맥락"}]}]`,
      "10년 경력 IMC 카피라이터. JSON만."
    ).then(raw => { if(alive){ setIdeas(safeJSON(raw)||[]); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1500); };
  const bg = dark ? "#111120" : "#ffffff";
  const borderColor = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4" style={{zIndex:9999}}>
      <div className="absolute inset-0 bg-black/80" onClick={onClose} style={{backdropFilter:"blur(8px)"}}/>
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:bg, border:`1px solid ${borderColor}`, maxHeight:"80vh", zIndex:10000}}>
        <div className="flex items-start gap-3 px-5 py-4 flex-shrink-0"
          style={{borderBottom:`1px solid ${borderColor}`, background:dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"}}>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{color:"var(--text4)"}}>✍️ 프로젝트 카피 아이디어</p>
            <p className="text-sm font-bold" style={{color:"var(--text)"}}>"{item.title}"</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)", color:"var(--text3)"}}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading
            ? <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>
                <p className="text-sm" style={{color:"var(--text4)"}}>카피 아이디어 생성 중...</p>
              </div>
            : ideas.map((proj,pi) => {
                const meta = projects.find(p=>p.id===proj.projectId);
                return (
                  <div key={pi} className="rounded-2xl overflow-hidden" style={{border:`1px solid ${borderColor}`}}>
                    <div className="flex items-center gap-2 px-4 py-3"
                      style={{background:meta?`${meta.color}15`:"rgba(99,102,241,0.08)", borderBottom:`1px solid ${borderColor}`}}>
                      <div className="w-2 h-2 rounded-full" style={{background:meta?.color||"#6366f1"}}/>
                      <span className="text-sm font-bold truncate" style={{color:"var(--text)"}}>{proj.projectName}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {(proj.copies||[]).map((c,ci) => {
                        const key=`${pi}-${ci}`;
                        const tc={타이틀:"#a5b4fc",서브카피:"#c084fc",해시태그:"#f59e0b",CTA:"#34d399"}[c.type]||"#94a3b8";
                        return (
                          <div key={ci} className="rounded-xl p-3.5" style={{background:dark?"rgba(0,0,0,0.25)":"rgba(0,0,0,0.03)", border:`1px solid ${borderColor}`}}>
                            <div className="flex items-start gap-2.5 mb-2">
                              <span className="text-xs px-2 py-0.5 rounded-full border font-mono flex-shrink-0 mt-0.5"
                                style={{color:tc,background:`${tc}15`,borderColor:`${tc}40`}}>{c.type}</span>
                              <p className="text-sm font-semibold flex-1 leading-snug" style={{color:"var(--text)"}}>{c.text}</p>
                              <button onClick={()=>copy(c.text,key)}
                                className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg transition-all"
                                style={{background:copied===key?"rgba(52,211,153,0.2)":"rgba(99,102,241,0.12)",border:`1px solid ${copied===key?"rgba(52,211,153,0.4)":"rgba(99,102,241,0.3)"}`,color:copied===key?"#34d399":"#818cf8"}}>
                                {copied===key?"✓ 복사":"복사"}
                              </button>
                            </div>
                            {c.note&&<p className="text-xs leading-relaxed" style={{color:"var(--text4)"}}>{c.note}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
        </div>
        <div className="flex-shrink-0 px-5 py-3 text-center" style={{borderTop:`1px solid ${borderColor}`}}>
          <p className="text-xs" style={{color:"var(--text5)"}}>복사 후 Task 탭에 붙여넣기</p>
        </div>
      </div>
    </div>
  );
}

/* ── Item Row ── */
function ItemRow({ item, cfg, showCopy, onCopy }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0 group/ri" style={{borderColor:"var(--border)"}}>
      <div className="flex items-start gap-3 py-3.5 px-1 cursor-pointer rounded-xl transition-all"
        style={{":hover":{background:"var(--hover)"}}}
        onClick={()=>setOpen(p=>!p)}
        onMouseEnter={e=>e.currentTarget.style.background="var(--hover)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        {cfg.id==="meme"&&item.emoji
          ? <span className="text-xl flex-shrink-0 mt-0.5 w-7 text-center leading-none">{item.emoji}</span>
          : <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{background:cfg.color, boxShadow:`0 0 6px ${cfg.color}80`}}/>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug" style={{color:"var(--text)"}}>
            {item.title}
            {item.platform&&<span className="ml-2 text-xs font-normal" style={{color:cfg.color}}>{item.platform}</span>}
          </p>
          <p className={`text-xs mt-1 leading-relaxed ${open?"":"line-clamp-2"}`} style={{color:"var(--text3)"}}>{item.summary}</p>
          {open&&item.url&&(
            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs mt-2 transition-colors hover:underline"
              style={{color:"var(--text4)"}}>
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {item.source||"원문 보기"}{item.date&&<span style={{color:"var(--text5)"}}>· {item.date}</span>}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showCopy&&(
            <button onClick={e=>{e.stopPropagation();onCopy();}}
              className="opacity-0 group-hover/ri:opacity-100 transition-opacity text-xs px-2.5 py-1.5 rounded-xl"
              style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.35)",color:"#a5b4fc"}}>
              ✍️
            </button>
          )}
          <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${open?"rotate-180":""}`}
            style={{color:"var(--text5)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Section Block ── */
function SectionBlock({ cfg, projects, isOpen, onToggle }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [lastFetched, setLastFetched] = useState(null);
  const [copyTarget,  setCopyTarget]  = useState(null);
  const didFetch = useRef(false);

  /* 섹션 열릴 때 최초 1회 자동 서칭 */
  useEffect(() => {
    if (isOpen && !didFetch.current) load();
  }, [isOpen]);

  const load = async () => {
    didFetch.current = true;
    setLoading(true); setError("");
    try {
      const raw = await callClaude(
        cfg.prompt(),
        "반드시 web_search 툴로 실제 웹 검색 후 오늘 기준 최신 정보만 JSON 배열로 반환. 다른 텍스트 없이.",
        true
      );
      const parsed = safeJSON(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setItems(parsed);
        setLastFetched(new Date());
      } else throw new Error("empty");
    } catch { setError("검색 결과를 불러오지 못했어요."); }
    setLoading(false);
  };

  const refresh = () => { didFetch.current = false; load(); };
  const showCopy = ["marketing","sns","meme"].includes(cfg.id);

  return (
    <>
      {copyTarget && <CopyPanel item={copyTarget} projects={projects} onClose={()=>setCopyTarget(null)}/>}
      <div className="rounded-2xl overflow-hidden transition-all"
        style={{border:`1px solid ${isOpen?`${cfg.color}40`:"var(--border)"}`, background:isOpen?`${cfg.color}08`:"var(--card)"}}>
        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={onToggle}>
          <span className="text-xl">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{color:"var(--text)"}}>{cfg.label}</span>
              {items.length>0&&<span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                style={{color:cfg.color,background:`${cfg.color}18`,border:`1px solid ${cfg.color}30`}}>{items.length}</span>}
              {lastFetched&&<span className="text-xs" style={{color:"var(--text5)"}}>
                {lastFetched.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 업데이트
              </span>}
            </div>
            <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>{cfg.desc}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOpen&&(
              <button onClick={e=>{e.stopPropagation();refresh();}} disabled={loading}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{border:"1px solid var(--border)",color:"var(--text4)"}}>
                {loading
                  ? <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"/>
                  : "↺"}
              </button>
            )}
            <svg className={`w-4 h-4 transition-transform ${isOpen?"rotate-180":""}`}
              style={{color:"var(--text5)"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </button>
        {isOpen&&(
          <div style={{borderTop:"1px solid var(--border)"}}>
            {loading
              ? <div className="flex items-center justify-center gap-3 py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{borderColor:`${cfg.color}60`,borderTopColor:"transparent"}}/>
                  <p className="text-sm" style={{color:"var(--text4)"}}>최신 정보 검색 중...</p>
                </div>
              : error
                ? <div className="flex items-center justify-between px-5 py-6">
                    <p className="text-sm" style={{color:"var(--text4)"}}>{error}</p>
                    <button onClick={refresh}
                      className="text-xs px-3 py-1.5 rounded-xl transition-all"
                      style={{border:"1px solid var(--border2)",background:"var(--hover)",color:"var(--text3)"}}>
                      재시도
                    </button>
                  </div>
                : items.length===0
                  ? <p className="text-sm text-center py-8" style={{color:"var(--text5)"}}>결과 없음</p>
                  : <div className="px-4 py-1">
                      {items.map((item,i)=>(
                        <ItemRow key={i} item={item} cfg={cfg} showCopy={showCopy} onCopy={()=>setCopyTarget(item)}/>
                      ))}
                    </div>}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Cheer Board ── */
const CHEER_KWS = ["기획력이 뛰어나다","꼼꼼하다","리더십이 있다","창의적이다","소통을 잘 한다","추진력이 있다"];

function CheerBoard() {
  const [name,setName]=useState("선민");const [kw,setKw]=useState("");const [sk,setSk]=useState("");
  const [msgs,setMsgs]=useState(["선민님은 오늘도 최고예요! ✨","세상에서 가장 멋진 선민님 💜","선민님의 노력은 빛을 발해요 🌟"]);
  const [playing,setPlaying]=useState(true);const [loading,setLoading]=useState(false);
  const t = msgs.map(m=>`✦ ${m}`).join("   ");
  const gen = async()=>{
    const fk=(kw||sk).trim(); if(!fk)return; setLoading(true);
    try{const raw=await callClaude(`"${name}"님을 "${fk}"로 칭찬 3개. JSON만: ["문구1","문구2","문구3"]`,"따뜻한 칭찬 전문가. JSON만.");const p=safeJSON(raw);if(Array.isArray(p)&&p.length){setMsgs(p);setPlaying(true);}}catch{}setLoading(false);
  };
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="relative overflow-hidden rounded-2xl py-5 px-4"
        style={{background:"linear-gradient(135deg,rgba(109,40,217,0.4),rgba(67,56,202,0.4))",border:"1px solid rgba(139,92,246,0.35)",boxShadow:"0 0 30px rgba(139,92,246,0.15)"}}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.3) 0px,rgba(0,0,0,0.3) 1px,transparent 1px,transparent 4px)"}}/>
        <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none"
          style={{background:"linear-gradient(to right,rgba(14,8,30,0.9),transparent)",zIndex:1}}/>
        <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none"
          style={{background:"linear-gradient(to left,rgba(14,8,30,0.9),transparent)",zIndex:1}}/>
        <div className="overflow-hidden">
          <div className="whitespace-nowrap inline-block"
            style={{animation:playing?"marquee 20s linear infinite":"none",fontFamily:"'Courier New',monospace"}}>
            {[t,t].map((tx,i)=><span key={i} className="text-sm font-bold tracking-widest"
              style={{color:"#ddd6fe",textShadow:"0 0 14px rgba(167,139,250,0.7)"}}>{tx}{"   "}</span>)}
          </div>
        </div>
        <button onClick={()=>setPlaying(p=>!p)}
          className="absolute top-2 right-3 text-xs transition-colors"
          style={{color:"rgba(196,181,253,0.6)",zIndex:2}}>{playing?"⏸":"▶"}</button>
      </div>
      <div className="rounded-2xl p-4 space-y-3" style={{background:"var(--card)",border:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2">
          <span className="text-xs flex-shrink-0" style={{color:"var(--text4)"}}>이름</span>
          <input value={name} onChange={e=>setName(e.target.value)}
            className="flex-1 text-sm outline-none px-2.5 py-1.5 rounded-xl"
            style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CHEER_KWS.map(k=><button key={k} onClick={()=>setSk(k===sk?"":k)}
            className="px-2.5 py-1 rounded-full text-xs transition-all"
            style={{background:sk===k?"rgba(139,92,246,0.25)":"var(--hover)",border:sk===k?"1px solid rgba(139,92,246,0.5)":"1px solid var(--border)",color:sk===k?"#c4b5fd":"var(--text4)"}}>
            {k}
          </button>)}
        </div>
        <div className="flex gap-2">
          <input value={kw} onChange={e=>setKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&gen()}
            placeholder="직접 입력..." className="flex-1 text-sm outline-none px-3 py-2.5 rounded-xl"
            style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
          <button onClick={gen} disabled={loading||(!kw.trim()&&!sk)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-30 flex items-center gap-2"
            style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>
            {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:"✨"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Rest Tab Root ── */
export default function RestTab({ clients }) {
  const [open,      setOpen]      = useState({ marketing:true });
  const [showCheer, setShowCheer] = useState(false);

  const flatProjects = useMemo(()=>
    clients.flatMap(c=>c.projects.map(p=>({...p,clientName:c.name,color:c.color})))
  ,[clients]);

  return (
    <>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div className="flex flex-col h-full overflow-hidden" style={{background:"var(--bg)"}}>
        {/* header */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3.5"
          style={{borderBottom:"1px solid var(--border)"}}>
          <span className="text-sm font-bold" style={{color:"var(--text)"}}>Rest</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text5)"}}>{APP_VERSION}</span>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ml-1"
            style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)"}}>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
            <span className="text-xs text-indigo-400">프로젝트 {flatProjects.length}개 연결</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={()=>setOpen(Object.fromEntries(SECTIONS.map(s=>[s.id,true])))}
              className="text-xs px-2.5 py-1.5 rounded-xl transition-colors"
              style={{color:"var(--text4)"}}>전체 펼치기</button>
            <button onClick={()=>setOpen({})}
              className="text-xs px-2.5 py-1.5 rounded-xl transition-colors"
              style={{color:"var(--text4)"}}>전체 접기</button>
            <button onClick={()=>setShowCheer(p=>!p)}
              className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{background:showCheer?"rgba(109,40,217,0.25)":"var(--hover)",border:showCheer?"1px solid rgba(139,92,246,0.45)":"1px solid var(--border)",color:showCheer?"#c4b5fd":"var(--text4)"}}>
              ✨ 칭찬판
            </button>
          </div>
        </div>
        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {showCheer&&(
            <div className="rounded-2xl p-4"
              style={{background:"rgba(109,40,217,0.08)",border:"1px solid rgba(139,92,246,0.2)"}}>
              <CheerBoard/>
            </div>
          )}
          {SECTIONS.map(cfg=>(
            <SectionBlock key={cfg.id} cfg={cfg} projects={flatProjects}
              isOpen={!!open[cfg.id]}
              onToggle={()=>setOpen(p=>({...p,[cfg.id]:!p[cfg.id]}))}/>
          ))}
          <div className="py-4 text-center" style={{borderTop:"1px solid var(--border)"}}>
            <p className="text-xs" style={{color:"var(--text5)"}}>
              소스: 아이보스·매드타임스·브랜드b·캐릿(공개)·X·유튜브 — web_search 실시간
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
