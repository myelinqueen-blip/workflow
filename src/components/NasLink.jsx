/**
 * NasLink.jsx
 * NAS 경로 수기입력 + URL 링크 첨부
 */
import { useState } from "react";

export default function NasLink({ nasPath, links=[], onUpdateNas, onUpdateLinks }) {
  const [nasEdit, setNasEdit] = useState(false);
  const [nasDraft, setNasDraft] = useState(nasPath||"");
  const [addLink, setAddLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState({label:"",url:""});
  const [copied, setCopied] = useState(null);

  const saveNas = () => { onUpdateNas(nasDraft.trim()||null); setNasEdit(false); };
  const copyNas = () => {
    navigator.clipboard.writeText(nasPath||"");
    setCopied("nas"); setTimeout(()=>setCopied(null),1500);
  };

  const addLinkItem = () => {
    if(!linkDraft.url.trim()) return;
    const url = linkDraft.url.startsWith("http") ? linkDraft.url : `https://${linkDraft.url}`;
    onUpdateLinks([...links,{id:Date.now().toString(),label:linkDraft.label||url,url}]);
    setLinkDraft({label:"",url:""}); setAddLink(false);
  };

  const removeLink = id => onUpdateLinks(links.filter(l=>l.id!==id));

  return (
    <div className="space-y-2 mt-2">
      {/* NAS */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <svg viewBox="0 0 24 24" className="w-3 h-3" style={{color:"var(--text5)"}} fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span className="text-xs font-mono font-medium" style={{color:"var(--text5)"}}>NAS</span>
          <div className="flex-1 h-px" style={{background:"var(--border)"}}/>
        </div>
        {nasEdit ? (
          <div className="flex gap-1.5">
            <input value={nasDraft} onChange={e=>setNasDraft(e.target.value)} autoFocus
              onKeyDown={e=>{if(e.key==="Enter")saveNas();if(e.key==="Escape")setNasEdit(false);}}
              placeholder="\\\\NAS01\\프로젝트\\폴더"
              className="flex-1 px-2 py-1 text-xs font-mono outline-none rounded-lg"
              style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text3)"}}/>
            <button onClick={saveNas} className="px-2 py-1 rounded-lg text-xs text-white bg-indigo-600">저장</button>
            <button onClick={()=>setNasEdit(false)} className="px-2 py-1 rounded-lg text-xs"
              style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
          </div>
        ) : nasPath ? (
          <div className="flex items-center gap-1.5">
            <span className="flex-1 text-xs font-mono truncate px-2 py-1 rounded-lg"
              style={{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
              {nasPath}
            </span>
            <button onClick={copyNas} className="text-xs px-1.5 py-1 rounded-lg transition-colors"
              style={{color:copied==="nas"?"#34d399":"var(--text5)"}}>
              {copied==="nas"?"✓":"복사"}
            </button>
            <button onClick={()=>{setNasDraft(nasPath);setNasEdit(true);}} className="text-xs px-1.5 py-1"
              style={{color:"var(--text5)"}}>수정</button>
            <button onClick={()=>onUpdateNas(null)} className="text-xs px-1.5 py-1"
              style={{color:"#f87171"}}>삭제</button>
          </div>
        ) : (
          <button onClick={()=>setNasEdit(true)} className="text-xs" style={{color:"var(--text5)"}}>
            + NAS 경로 추가
          </button>
        )}
      </div>

      {/* Links */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <svg viewBox="0 0 24 24" className="w-3 h-3" style={{color:"var(--text5)"}} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-xs font-medium" style={{color:"var(--text5)"}}>링크</span>
          <div className="flex-1 h-px" style={{background:"var(--border)"}}/>
        </div>

        {/* existing links */}
        {links.map(l=>(
          <div key={l.id} className="flex items-center gap-1.5 mb-1">
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors group"
              style={{background:"var(--hover)",color:"#6366f1",border:"1px solid var(--border)"}}
              onClick={e=>e.stopPropagation()}>
              <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span className="truncate">{l.label||l.url}</span>
            </a>
            <button onClick={()=>removeLink(l.id)} className="text-xs px-1.5 py-1"
              style={{color:"#f87171"}}>삭제</button>
          </div>
        ))}

        {/* add link form */}
        {addLink ? (
          <div className="space-y-1.5">
            <input value={linkDraft.label} onChange={e=>setLinkDraft(p=>({...p,label:e.target.value}))}
              placeholder="라벨 (선택)" className="w-full px-2 py-1 text-xs outline-none rounded-lg"
              style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text3)"}}/>
            <div className="flex gap-1.5">
              <input value={linkDraft.url} onChange={e=>setLinkDraft(p=>({...p,url:e.target.value}))} autoFocus
                onKeyDown={e=>{if(e.key==="Enter")addLinkItem();if(e.key==="Escape")setAddLink(false);}}
                placeholder="https://..." className="flex-1 px-2 py-1 text-xs outline-none rounded-lg"
                style={{background:"var(--input)",border:"1px solid rgba(99,102,241,0.4)",color:"var(--text3)"}}/>
              <button onClick={addLinkItem} className="px-2 py-1 rounded-lg text-xs text-white bg-indigo-600">추가</button>
              <button onClick={()=>setAddLink(false)} className="px-2 py-1 rounded-lg text-xs"
                style={{background:"var(--hover)",color:"var(--text4)"}}>취소</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAddLink(true)} className="text-xs" style={{color:"var(--text5)"}}>
            + 링크 추가 (Google Sheets, Drive, Notion 등)
          </button>
        )}
      </div>
    </div>
  );
}
