/**
 * AITab.jsx  v2.5
 * AI 자동화 탭:
 *  1. 캡처 → Task 초안 (카톡·텔레그램 스크린샷)
 *  2. 회의록 → Task 목록
 *  3. 콘텐츠 타이틀 → 카피 추천 (클라이언트별 톤앤매너)
 *  4. 주간 보고 자동 생성
 */
import { useState, useRef, useCallback } from "react";
import { safeJSON, todayStr, mkId } from "../utils.js";

const APP_VERSION = "v2.5.0";

/* ── Claude API (proxy 경유) ── */
const callClaude = async (messages, system = "", useSearch = false) => {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system,
    messages,
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
};

/* ── 이미지 → base64 ── */
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

/* ── Section Wrapper ── */
function Section({ icon, title, desc, children, accent = "#6366f1" }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid var(--border)`, background: "var(--bg2)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <button className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(p => !p)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text5)" }}>{desc}</p>
        </div>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--text5)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Task Draft Card ── */
function TaskDraftCard({ draft, members, clients, onRegister, onEdit, onRemove }) {
  const [editMode, setEditMode] = useState(false);
  const [d, setD] = useState(draft);
  const [selClient, setSelClient] = useState(clients[0]?.id || "");
  const [selProject, setSelProject] = useState(clients[0]?.projects[0]?.id || "");
  const [registered, setRegistered] = useState(false);

  const client = clients.find(c => c.id === selClient);

  const handleRegister = () => {
    onRegister(selClient, selProject, d);
    setRegistered(true);
  };

  if (registered) return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
      <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#34d399" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium" style={{ color: "#34d399" }}>등록 완료: {d.name}</span>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      {/* task info */}
      <div className="px-4 py-3 space-y-2.5">
        {editMode ? (
          <input value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-1.5 text-sm font-semibold outline-none rounded-xl"
            style={{ background: "var(--input)", border: "1px solid rgba(99,102,241,0.4)", color: "var(--text)" }} />
        ) : (
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}
            onClick={() => setEditMode(true)} title="클릭하여 수정">{d.name}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {/* assignee */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--text5)" }}>담당자</span>
            <select value={d.assigneeId || ""} onChange={e => setD(p => ({ ...p, assigneeId: e.target.value || null }))}
              className="text-xs outline-none rounded-lg px-2 py-1"
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="">미지정</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {/* due date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--text5)" }}>마감일</span>
            <input type="date" value={d.dueDate || ""} onChange={e => setD(p => ({ ...p, dueDate: e.target.value || null }))}
              className="text-xs outline-none rounded-lg px-2 py-1"
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--text)", colorScheme: "dark" }} />
          </div>
        </div>

        {/* subtasks preview */}
        {d.subtasks?.length > 0 && (
          <div className="space-y-1 pl-2 border-l-2" style={{ borderColor: "var(--border2)" }}>
            {d.subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--text5)" }} />
                {editMode
                  ? <input value={s} onChange={e => { const ns = [...d.subtasks]; ns[i] = e.target.value; setD(p => ({ ...p, subtasks: ns })); }}
                      className="flex-1 text-xs outline-none px-1 py-0.5 rounded"
                      style={{ background: "var(--input)", color: "var(--text3)" }} />
                  : <span className="text-xs" style={{ color: "var(--text3)" }}>{s}</span>}
                {editMode && (
                  <button onClick={() => setD(p => ({ ...p, subtasks: p.subtasks.filter((_, j) => j !== i) }))}
                    className="text-xs" style={{ color: "#f87171" }}>✕</button>
                )}
              </div>
            ))}
            {editMode && (
              <button onClick={() => setD(p => ({ ...p, subtasks: [...p.subtasks, "새 세부 업무"] }))}
                className="text-xs ml-3" style={{ color: "var(--text5)" }}>+ 세부 업무 추가</button>
            )}
          </div>
        )}

        {d.note && <p className="text-xs px-2 py-1 rounded-lg italic"
          style={{ background: "var(--hover)", color: "var(--text4)" }}>📝 {d.note}</p>}
      </div>

      {/* register bar */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderTop: "1px solid var(--border)", background: "var(--hover)" }}>
        <select value={selClient} onChange={e => { setSelClient(e.target.value); setSelProject(clients.find(c => c.id === e.target.value)?.projects[0]?.id || ""); }}
          className="text-xs outline-none rounded-lg px-2 py-1.5 flex-1"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selProject} onChange={e => setSelProject(e.target.value)}
          className="text-xs outline-none rounded-lg px-2 py-1.5 flex-1"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {client?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setEditMode(p => !p)}
          className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: editMode ? "rgba(99,102,241,0.15)" : "var(--bg2)", border: "1px solid var(--border)", color: editMode ? "#818cf8" : "var(--text4)" }}>
          {editMode ? "완료" : "수정"}
        </button>
        <button onClick={handleRegister}
          className="px-3 py-1.5 rounded-lg text-xs text-white font-medium"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
          등록 →
        </button>
        <button onClick={onRemove} className="text-xs" style={{ color: "#f87171" }}>✕</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   1. 캡처 → Task 초안
══════════════════════════════════ */
function ScreenshotToTask({ clients, members, onAddTask, onAddSubtask }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState("카카오톡");
  const inputRef = useRef(null);

  const handleFiles = async e => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map(f => URL.createObjectURL(f)));
    setDrafts([]);
  };

  const handleDrop = e => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!dropped.length) return;
    setFiles(dropped);
    setPreviews(dropped.map(f => URL.createObjectURL(f)));
    setDrafts([]);
  };

  const analyze = async () => {
    if (!files.length) return;
    setLoading(true); setError("");
    try {
      const images = await Promise.all(files.map(async f => ({
        type: "image",
        source: { type: "base64", media_type: f.type, data: await toBase64(f) }
      })));

      const raw = await callClaude(
        [{
          role: "user",
          content: [
            ...images,
            {
              type: "text",
              text: `이 ${channel} 캡처에서 업무 Task를 추출해줘.
담당자 이름, 마감일, 세부 업무가 보이면 포함해.
구성원 목록: ${members.map(m => m.name).join(", ")}

JSON만 반환:
[{
  "name": "Task 이름",
  "assigneeId": "구성원 id (없으면 null)",
  "dueDate": "YYYY-MM-DD (없으면 null)",
  "subtasks": ["세부업무1", "세부업무2"],
  "note": "원문 맥락 한 줄 (없으면 null)"
}]

구성원 id 매핑: ${members.map(m => `${m.name}→${m.id}`).join(", ")}`
            }
          ]
        }],
        "IMC 에이전시 프로젝트 매니저. 대화에서 업무 Task만 정확히 추출. JSON만."
      );

      const parsed = safeJSON(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setDrafts(parsed.map(d => ({ ...d, id: mkId() })));
      } else {
        setError("Task를 찾지 못했어요. 다른 캡처를 시도해보세요.");
      }
    } catch (e) {
      setError("분석 실패: " + e.message);
    }
    setLoading(false);
  };

  const registerDraft = (cid, pid, d) => {
    onAddTask(cid, pid, d.name, d.assigneeId, d.dueDate);
    // subtask는 Task 등록 후 추가 (부모 id 필요 — 여기선 최신 task에 추가)
  };

  return (
    <div className="p-5 space-y-4">
      {/* channel select */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--text3)" }}>채널:</span>
        {["카카오톡", "텔레그램", "슬랙", "이메일", "기타"].map(c => (
          <button key={c} onClick={() => setChannel(c)}
            className="px-2.5 py-1 rounded-full text-xs transition-all"
            style={{
              background: channel === c ? "rgba(99,102,241,0.15)" : "var(--hover)",
              border: channel === c ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              color: channel === c ? "#818cf8" : "var(--text4)"
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* drop zone */}
      <div
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{ borderColor: "var(--border2)", background: "var(--hover)", minHeight: 140 }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        {previews.length > 0 ? (
          <div className="flex gap-2 flex-wrap p-3 justify-center">
            {previews.map((p, i) => (
              <img key={i} src={p} alt="" className="h-24 w-auto rounded-xl object-cover"
                style={{ border: "1px solid var(--border2)" }} />
            ))}
          </div>
        ) : (
          <div className="text-center p-6">
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm font-medium" style={{ color: "var(--text3)" }}>
              캡처 이미지 드래그 or 클릭
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text5)" }}>
              카카오톡·텔레그램·슬랙 스크린샷 지원
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <button onClick={analyze} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 분석 중...
            </span>
          ) : "🤖 Task 초안 추출"}
        </button>
      )}

      {error && <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>}

      {drafts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
            {drafts.length}개 Task 초안 — 수정 후 등록하세요
          </p>
          {drafts.map((d, i) => (
            <TaskDraftCard key={d.id} draft={d} members={members} clients={clients}
              onRegister={registerDraft}
              onEdit={updated => setDrafts(prev => prev.map((x, j) => j === i ? updated : x))}
              onRemove={() => setDrafts(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   2. 회의록 → Task
══════════════════════════════════ */
function MeetingToTask({ clients, members, onAddTask }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meetingMeta, setMeetingMeta] = useState({ date: "", title: "" });

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setError("");
    try {
      const raw = await callClaude(
        [{ role: "user", content: `다음 회의록에서 Action Item(업무 Task)을 추출해줘.
오늘: ${todayStr()}
구성원: ${members.map(m => `${m.name}(id:${m.id})`).join(", ")}

회의록:
${text}

JSON만:
{
  "meeting": {
    "title": "회의 제목 추측",
    "date": "YYYY-MM-DD"
  },
  "tasks": [{
    "name": "Task 이름 (동사로 시작)",
    "assigneeId": "담당자 id (null 가능)",
    "dueDate": "YYYY-MM-DD (null 가능)",
    "subtasks": ["세부업무1"],
    "note": "회의록 원문 근거 한 줄",
    "priority": "high|medium|low"
  }]
}` }],
        "IMC 에이전시 PM. 회의록에서 실행 가능한 Task만 추출. JSON만."
      );

      const parsed = safeJSON(raw);
      if (parsed?.tasks?.length) {
        setMeetingMeta(parsed.meeting || {});
        setDrafts(parsed.tasks.map(d => ({ ...d, id: mkId() })));
      } else {
        setError("Action Item을 찾지 못했어요.");
      }
    } catch (e) {
      setError("분석 실패: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: "var(--text3)" }}>
            회의록 / 녹음 텍스트 붙여넣기
          </label>
          <span className="text-xs" style={{ color: "var(--text5)" }}>{text.length}자</span>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={"회의록, 녹취록, 메모 내용을 붙여넣으세요.\n\n예시:\n- 김선민: 다음 주 금요일까지 심사위원 섭외 완료해주세요\n- 박팀원: 콘텐츠 시안은 제가 월요일까지 드릴게요\n- 외주 견적은 이번 주 수요일까지..."}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none leading-relaxed"
          style={{
            background: "var(--input)", border: "1px solid var(--border2)",
            color: "var(--text)", minHeight: 200
          }} />
      </div>

      <button onClick={analyze} disabled={loading || !text.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            회의록 분석 중...
          </span>
        ) : "📋 Action Item 추출"}
      </button>

      {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

      {drafts.length > 0 && (
        <div className="space-y-3">
          {meetingMeta.title && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span className="text-sm font-semibold" style={{ color: "#fbbf24" }}>📅 {meetingMeta.title}</span>
              {meetingMeta.date && <span className="text-xs" style={{ color: "var(--text5)" }}>{meetingMeta.date}</span>}
            </div>
          )}
          <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
            {drafts.length}개 Action Item 추출됨
          </p>
          {drafts.map((d, i) => (
            <div key={d.id} className="relative">
              {d.priority === "high" && (
                <div className="absolute -top-1 -right-1 z-10">
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                    긴급
                  </span>
                </div>
              )}
              <TaskDraftCard draft={d} members={members} clients={clients}
                onRegister={(cid, pid, dr) => onAddTask(cid, pid, dr.name, dr.assigneeId, dr.dueDate)}
                onEdit={updated => setDrafts(prev => prev.map((x, j) => j === i ? updated : x))}
                onRemove={() => setDrafts(prev => prev.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   3. 콘텐츠 타이틀 → 카피 추천
══════════════════════════════════ */

// 클라이언트별 톤앤매너 프리셋
const TONE_PRESETS = {
  default: { label: "기본", desc: "전문적이고 신뢰감 있는 어조" },
  hl:      { label: "HL Group", desc: "임직원 내부 소통, 따뜻하고 친근한 어조" },
  hyundai: { label: "현대카드", desc: "세련되고 트렌디, MZ 감성, 영문 혼용 가능" },
  kyobo:   { label: "교보생명", desc: "안정적이고 신뢰감, 가족·미래 키워드" },
  custom:  { label: "직접 입력", desc: "" },
};

function CopyRecommend({ clients }) {
  const [titles, setTitles] = useState("");
  const [channel, setChannel] = useState("인스타그램");
  const [toneKey, setToneKey] = useState("default");
  const [customTone, setCustomTone] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  const analyze = async () => {
    if (!titles.trim()) return;
    setLoading(true); setError("");
    try {
      const tone = toneKey === "custom" ? customTone : TONE_PRESETS[toneKey]?.desc;
      const raw = await callClaude(
        [{ role: "user", content: `다음 콘텐츠 타이틀들을 보고, ${channel}에 맞는 카피를 추천해줘.

타이틀 목록:
${titles}

채널: ${channel}
톤앤매너: ${tone}

각 타이틀당 3가지 카피 버전. JSON만:
[{
  "original": "원본 타이틀",
  "copies": [
    { "type": "감성형", "text": "카피 문구", "reason": "선택 이유 한 줄" },
    { "type": "정보형", "text": "카피 문구", "reason": "선택 이유 한 줄" },
    { "type": "참여형", "text": "카피 문구", "reason": "선택 이유 한 줄" }
  ],
  "hashtags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"]
}]` }],
        `10년 경력 IMC 카피라이터. ${channel} 알고리즘과 트렌드에 밝음. 클라이언트 톤앤매너 철저히 준수. JSON만.`
      );

      const parsed = safeJSON(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setResults(parsed);
      } else {
        setError("카피 생성에 실패했어요.");
      }
    } catch (e) {
      setError("실패: " + e.message);
    }
    setLoading(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  const TYPE_COLOR = {
    "감성형": "#f472b6",
    "정보형": "#60a5fa",
    "참여형": "#34d399",
  };

  return (
    <div className="p-5 space-y-4">
      {/* channel */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--text3)" }}>채널:</span>
        {["인스타그램", "유튜브", "블로그", "링크드인", "뉴스레터"].map(c => (
          <button key={c} onClick={() => setChannel(c)}
            className="px-2.5 py-1 rounded-full text-xs transition-all"
            style={{
              background: channel === c ? "rgba(236,72,153,0.12)" : "var(--hover)",
              border: channel === c ? "1px solid rgba(236,72,153,0.35)" : "1px solid var(--border)",
              color: channel === c ? "#ec4899" : "var(--text4)"
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* tone */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: "var(--text3)" }}>톤앤매너</label>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(TONE_PRESETS).map(([k, v]) => (
            <button key={k} onClick={() => setToneKey(k)}
              className="px-2.5 py-1 rounded-full text-xs transition-all"
              style={{
                background: toneKey === k ? "rgba(99,102,241,0.15)" : "var(--hover)",
                border: toneKey === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                color: toneKey === k ? "#818cf8" : "var(--text4)"
              }}>
              {v.label}
            </button>
          ))}
        </div>
        {toneKey !== "custom" && (
          <p className="text-xs px-2" style={{ color: "var(--text5)" }}>{TONE_PRESETS[toneKey].desc}</p>
        )}
        {toneKey === "custom" && (
          <input value={customTone} onChange={e => setCustomTone(e.target.value)}
            placeholder="톤앤매너 직접 입력 (예: MZ 감성, 짧고 임팩트 있게)"
            className="w-full px-3 py-2 text-sm outline-none rounded-xl"
            style={{ background: "var(--input)", border: "1px solid var(--border2)", color: "var(--text)" }} />
        )}
      </div>

      {/* titles input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text3)" }}>
          콘텐츠 타이틀 입력 (한 줄에 하나씩)
        </label>
        <textarea value={titles} onChange={e => setTitles(e.target.value)}
          placeholder={"익명가왕 시즌2 참가자 모집\n성수동 새 보금자리, 우리의 두 번째 챕터\nDIVE 2025 라인업 공개"}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
          style={{ background: "var(--input)", border: "1px solid var(--border2)", color: "var(--text)", minHeight: 120 }} />
      </div>

      <button onClick={analyze} disabled={loading || !titles.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)" }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            카피 생성 중...
          </span>
        ) : "✨ 카피 추천 생성"}
      </button>

      {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

      {/* results */}
      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((r, ri) => (
            <div key={ri} className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}>
              {/* original */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--hover)" }}>
                <p className="text-xs" style={{ color: "var(--text5)" }}>원본 타이틀</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{r.original}</p>
              </div>
              {/* copies */}
              <div className="divide-y" style={{ divideColor: "var(--border)" }}>
                {r.copies?.map((c, ci) => {
                  const key = `${ri}-${ci}`;
                  return (
                    <div key={ci} className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
                          style={{ background: `${TYPE_COLOR[c.type]}15`, color: TYPE_COLOR[c.type], border: `1px solid ${TYPE_COLOR[c.type]}30` }}>
                          {c.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>{c.text}</p>
                          <p className="text-xs mt-1" style={{ color: "var(--text5)" }}>{c.reason}</p>
                        </div>
                        <button onClick={() => copy(c.text, key)}
                          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: copied === key ? "rgba(52,211,153,0.15)" : "var(--hover)",
                            border: `1px solid ${copied === key ? "rgba(52,211,153,0.35)" : "var(--border)"}`,
                            color: copied === key ? "#34d399" : "var(--text4)"
                          }}>
                          {copied === key ? "✓" : "복사"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* hashtags */}
              {r.hashtags?.length > 0 && (
                <div className="px-4 py-3 flex items-center gap-2 flex-wrap"
                  style={{ borderTop: "1px solid var(--border)", background: "var(--hover)" }}>
                  <span className="text-xs" style={{ color: "var(--text5)" }}>해시태그:</span>
                  {r.hashtags.map((h, hi) => {
                    const hkey = `ht-${ri}-${hi}`;
                    return (
                      <button key={hi} onClick={() => copy(h, hkey)}
                        className="text-xs px-2 py-0.5 rounded-full transition-all"
                        style={{ background: copied === hkey ? "rgba(99,102,241,0.15)" : "transparent", color: "#818cf8" }}>
                        {h}
                      </button>
                    );
                  })}
                  <button onClick={() => copy(r.hashtags.join(" "), `all-${ri}`)}
                    className="ml-auto text-xs px-2 py-0.5 rounded-lg transition-all"
                    style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text4)" }}>
                    전체 복사
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   4. 주간 보고 자동 생성
══════════════════════════════════ */
function WeeklyReport({ clients, members }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [selMember, setSelMember] = useState("all");

  const generate = async () => {
    setLoading(true);
    try {
      // 이번 주 Task 집계
      const today = new Date();
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
      const wISO = weekAgo.toISOString().slice(0, 10);
      const tISO = today.toISOString().slice(0, 10);

      const taskSummary = clients.flatMap(c =>
        c.projects.flatMap(p =>
          p.tasks.map(t => ({
            client: c.name, project: p.name, task: t.name,
            assignee: members.find(m => m.id === t.assigneeId)?.name || "미지정",
            done: t.subtasks.filter(s => s.status === "done").length,
            total: t.subtasks.length,
            dueDate: t.dueDate,
          }))
        )
      ).filter(t => selMember === "all" || t.assignee === members.find(m => m.id === selMember)?.name);

      const raw = await callClaude(
        [{ role: "user", content: `다음 Task 현황을 바탕으로 ${tISO} 기준 주간 업무 보고서를 작성해줘.
${selMember !== "all" ? `담당자: ${members.find(m => m.id === selMember)?.name}` : "전체 팀"}

Task 현황:
${taskSummary.map(t => `- [${t.client}] ${t.project} > ${t.task} (담당: ${t.assignee}, 완료: ${t.done}/${t.total}, 마감: ${t.dueDate || "미정"})`).join("\n")}

보고서 형식:
1. 이번 주 완료/진행 사항 (클라이언트별)
2. 다음 주 주요 일정·마감
3. 이슈/리스크 (마감 임박 또는 지연)
4. 요청사항

실제 업무처럼 자연스럽게, 300자 이내로 간결하게.` }],
        "IMC 에이전시 팀장. 간결하고 전문적인 주간 보고서 작성."
      );
      setReport(raw);
    } catch (e) {
      setReport("생성 실패: " + e.message);
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--text3)" }}>기준 담당자:</span>
          <select value={selMember} onChange={e => setSelMember(e.target.value)}
            className="text-xs outline-none rounded-xl px-3 py-1.5"
            style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="all">전체 팀</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
          {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />생성 중...</span> : "📊 주간 보고 생성"}
        </button>
      </div>

      {report && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--hover)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>주간 보고서</span>
            <button onClick={copy}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{ background: copied ? "rgba(52,211,153,0.15)" : "var(--bg2)", border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "var(--border)"}`, color: copied ? "#34d399" : "var(--text4)" }}>
              {copied ? "✓ 복사됨" : "복사"}
            </button>
          </div>
          <div className="px-4 py-4">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text2)", fontFamily: "inherit" }}>
              {report}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   AI TAB ROOT
══════════════════════════════════ */
export default function AITab({ clients, members, onAddTask, onAddSubtask }) {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* header */}
      <div className="flex-shrink-0 px-5 py-3.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base font-black"
          style={{ background: "linear-gradient(135deg,#6366f1,#ec4899)" }}>✦</div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>AI 자동화</h2>
          <p className="text-xs" style={{ color: "var(--text5)" }}>캡처·회의록 → Task / 카피 추천 / 주간보고</p>
        </div>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
          style={{ background: "var(--hover)", border: "1px solid var(--border)", color: "var(--text5)" }}>
          {APP_VERSION}
        </span>
      </div>

      {/* sections */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Section icon="📸" title="캡처 → Task 초안"
          desc="카카오톡·텔레그램 스크린샷에서 업무 자동 추출"
          accent="#6366f1">
          <ScreenshotToTask clients={clients} members={members} onAddTask={onAddTask} onAddSubtask={onAddSubtask} />
        </Section>

        <Section icon="📋" title="회의록 → Action Item"
          desc="회의록·녹취록 텍스트 붙여넣으면 Task 자동 추출"
          accent="#f59e0b">
          <MeetingToTask clients={clients} members={members} onAddTask={onAddTask} />
        </Section>

        <Section icon="✍️" title="콘텐츠 카피 추천"
          desc="타이틀 입력 → 채널·클라이언트 톤앤매너 맞춘 카피 3가지"
          accent="#ec4899">
          <CopyRecommend clients={clients} />
        </Section>

        <Section icon="📊" title="주간 보고 자동 생성"
          desc="이번 주 Task 현황 → 보고서 초안 자동 작성"
          accent="#3b82f6">
          <WeeklyReport clients={clients} members={members} />
        </Section>

        <div className="py-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text5)" }}>
            Claude AI 기반 · 모든 데이터는 분석 후 즉시 삭제됨
          </p>
        </div>
      </div>
    </div>
  );
}
