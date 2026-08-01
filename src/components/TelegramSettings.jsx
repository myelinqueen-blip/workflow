/**
 * TelegramSettings.jsx  v2.6
 * 텔레그램 Bot 연동:
 *  - Bot Token 설정
 *  - 알림 채팅방 ID 등록 (프로젝트방·부서방·개인)
 *  - 마감 알림 전송
 *  - 오늘의 Task 브리핑
 */
import { useState, useEffect } from "react";
import { fmtDate, calcTaskPct } from "../utils.js";

const LS_KEY = "wf_telegram";

const loadConfig = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const saveConfig = cfg => localStorage.setItem(LS_KEY, JSON.stringify(cfg));

/* ── Telegram API 호출 ── */
const sendTelegram = async (botToken, chatId, text) => {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "전송 실패");
  return data;
};

/* ── 오늘 마감 Task 집계 ── */
const getTodayTasks = (clients) => {
  const today = new Date().toISOString().slice(0, 10);
  const result = [];
  clients.forEach(c => {
    c.projects.forEach(p => {
      p.tasks.forEach(t => {
        if (t.dueDate === today && calcTaskPct(t.subtasks) < 100) {
          result.push({ client: c.name, project: p.name, task: t.name, dueDate: t.dueDate });
        }
        t.subtasks.forEach(s => {
          if (s.dueDate === today && s.status !== "done") {
            result.push({ client: c.name, project: p.name, task: `${t.name} > ${s.name}`, dueDate: s.dueDate });
          }
        });
      });
    });
  });
  return result;
};

/* ── D-3 이내 임박 Task ── */
const getUrgentTasks = (clients) => {
  const today = new Date();
  const result = [];
  clients.forEach(c => {
    c.projects.forEach(p => {
      p.tasks.forEach(t => {
        if (t.dueDate) {
          const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
          if (diff >= 0 && diff <= 3 && calcTaskPct(t.subtasks) < 100) {
            result.push({ client: c.name, project: p.name, task: t.name, dueDate: t.dueDate, diff });
          }
        }
      });
    });
  });
  return result.sort((a, b) => a.diff - b.diff);
};

export default function TelegramSettings({ clients, members, onClose }) {
  const [cfg, setCfg] = useState(loadConfig);
  const [tab, setTab]       = useState("setup");
  const [testing, setTesting]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [testResult, setTestResult] = useState("");
  const [sendResult, setSendResult] = useState("");

  // 저장
  const save = (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveConfig(next);
  };

  /* ── 테스트 메시지 ── */
  const testBot = async () => {
    if (!cfg.botToken || !cfg.defaultChatId) return;
    setTesting(true); setTestResult("");
    try {
      await sendTelegram(cfg.botToken, cfg.defaultChatId,
        `✅ <b>WorkFlow Bot 연결 성공!</b>\n\n안녕하세요 👋\nWorkFlow 알림 Bot이 정상 연결되었습니다.\n\n<i>${new Date().toLocaleString("ko-KR")}</i>`
      );
      setTestResult("success");
    } catch (e) {
      setTestResult("error: " + e.message);
    }
    setTesting(false);
  };

  /* ── 오늘 브리핑 발송 ── */
  const sendBriefing = async () => {
    if (!cfg.botToken || !cfg.defaultChatId) return;
    setSending(true); setSendResult("");
    try {
      const todayTasks   = getTodayTasks(clients);
      const urgentTasks  = getUrgentTasks(clients);
      const today        = new Date().toLocaleDateString("ko-KR", { month:"long", day:"numeric", weekday:"short" });

      let text = `📋 <b>WorkFlow 오늘의 브리핑</b> — ${today}\n\n`;

      if (todayTasks.length === 0 && urgentTasks.length === 0) {
        text += "✨ 오늘 마감 Task가 없습니다!";
      } else {
        if (todayTasks.length > 0) {
          text += `🔴 <b>오늘 마감 (${todayTasks.length}건)</b>\n`;
          todayTasks.forEach(t => {
            text += `  • [${t.client}] ${t.task}\n`;
          });
          text += "\n";
        }
        if (urgentTasks.length > 0) {
          text += `⚠️ <b>D-3 이내 임박</b>\n`;
          urgentTasks.forEach(t => {
            text += `  • D-${t.diff} [${t.client}] ${t.task} (${fmtDate(t.dueDate)})\n`;
          });
        }
      }

      text += `\n<a href="https://myelinqueen-blip.github.io/workflow/">→ WorkFlow 열기</a>`;

      await sendTelegram(cfg.botToken, cfg.defaultChatId, text);
      setSendResult("success");
    } catch (e) {
      setSendResult("error: " + e.message);
    }
    setSending(false);
  };

  /* ── 개별 Task 알림 ── */
  const sendTaskAlert = async (task, clientName, projectName) => {
    if (!cfg.botToken || !cfg.defaultChatId) return;
    try {
      await sendTelegram(cfg.botToken, cfg.defaultChatId,
        `📌 <b>Task 알림</b>\n\n[${clientName}] ${projectName}\n<b>${task.name}</b>\n마감: ${task.dueDate ? fmtDate(task.dueDate) : "미정"}`
      );
    } catch (e) {
      console.error("Telegram error:", e);
    }
  };

  const todayCount  = getTodayTasks(clients).length;
  const urgentCount = getUrgentTasks(clients).length;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:9998}}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{background:"var(--bg)",border:"1px solid var(--border2)",maxHeight:"85vh",zIndex:9999}}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{background:"rgba(37,99,235,0.12)",border:"1px solid rgba(37,99,235,0.25)"}}>✈️</div>
            <div>
              <h2 className="font-bold text-base" style={{color:"var(--text)"}}>텔레그램 연동</h2>
              <p className="text-xs" style={{color:"var(--text5)"}}>마감 알림 · 오늘의 브리핑 · Task 공유</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{background:"var(--hover)",color:"var(--text3)"}}>✕</button>
        </div>

        {/* sub-tab */}
        <div className="flex px-4 pt-3 gap-1 flex-shrink-0">
          {[["setup","⚙️ Bot 설정"],["notify","📣 알림 발송"],["guide","📖 설정 가이드"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={tab===k
                ?{background:"rgba(37,99,235,0.12)",border:"1px solid rgba(37,99,235,0.3)",color:"#60a5fa"}
                :{background:"var(--hover)",border:"1px solid var(--border)",color:"var(--text4)"}}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Bot 설정 ── */}
          {tab==="setup"&&(<>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color:"var(--text3)"}}>
                  Bot Token <span style={{color:"#f87171"}}>*</span>
                </label>
                <input value={cfg.botToken||""} onChange={e=>save({botToken:e.target.value})}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  type="password"
                  className="w-full px-4 py-2.5 text-sm outline-none rounded-xl font-mono"
                  style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
                <p className="text-xs mt-1" style={{color:"var(--text5)"}}>
                  ⚠️ Bot Token은 절대 타인에게 공유하지 마세요. 이 기기에만 저장됩니다.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color:"var(--text3)"}}>
                  기본 채팅방 ID <span style={{color:"#f87171"}}>*</span>
                </label>
                <input value={cfg.defaultChatId||""} onChange={e=>save({defaultChatId:e.target.value})}
                  placeholder="-1001234567890 (그룹방) 또는 123456789 (개인)"
                  className="w-full px-4 py-2.5 text-sm outline-none rounded-xl font-mono"
                  style={{background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text)"}}/>
              </div>

              {/* 프로젝트별 채팅방 */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color:"var(--text3)"}}>
                  프로젝트별 채팅방 ID (선택)
                </label>
                {clients.flatMap(c=>c.projects).map(p=>(
                  <div key={p.id} className="flex items-center gap-2 mb-2">
                    <span className="text-xs w-32 truncate flex-shrink-0" style={{color:"var(--text4)"}}>{p.name}</span>
                    <input value={(cfg.projectChats||{})[p.id]||""} onChange={e=>save({projectChats:{...(cfg.projectChats||{}),[p.id]:e.target.value}})}
                      placeholder="채팅방 ID"
                      className="flex-1 px-3 py-1.5 text-xs outline-none rounded-xl font-mono"
                      style={{background:"var(--input)",border:"1px solid var(--border)",color:"var(--text)"}}/>
                  </div>
                ))}
              </div>

              {/* 테스트 */}
              <button onClick={testBot} disabled={testing||!cfg.botToken||!cfg.defaultChatId}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{background:"rgba(37,99,235,0.12)",border:"1px solid rgba(37,99,235,0.3)",color:"#60a5fa"}}>
                {testing ? "전송 중..." : "🧪 테스트 메시지 발송"}
              </button>
              {testResult==="success"&&<p className="text-xs text-center" style={{color:"#34d399"}}>✓ 텔레그램 연결 성공!</p>}
              {testResult.startsWith("error")&&<p className="text-xs" style={{color:"#f87171"}}>{testResult}</p>}
            </div>
          </>)}

          {/* ── 알림 발송 ── */}
          {tab==="notify"&&(<>
            {/* 현황 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center"
                style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)"}}>
                <p className="text-2xl font-black" style={{color:"#f87171"}}>{todayCount}</p>
                <p className="text-xs mt-0.5" style={{color:"var(--text4)"}}>오늘 마감</p>
              </div>
              <div className="rounded-xl p-3 text-center"
                style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)"}}>
                <p className="text-2xl font-black" style={{color:"#fbbf24"}}>{urgentCount}</p>
                <p className="text-xs mt-0.5" style={{color:"var(--text4)"}}>D-3 이내 임박</p>
              </div>
            </div>

            {/* 브리핑 발송 */}
            <div className="rounded-2xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
              <div className="px-4 py-3" style={{borderBottom:"1px solid var(--border)",background:"var(--hover)"}}>
                <p className="text-sm font-semibold" style={{color:"var(--text)"}}>📋 오늘의 브리핑 발송</p>
                <p className="text-xs mt-0.5" style={{color:"var(--text5)"}}>오늘 마감 + D-3 임박 Task 요약을 텔레그램으로 전송</p>
              </div>
              <div className="p-4">
                <button onClick={sendBriefing} disabled={sending||!cfg.botToken||!cfg.defaultChatId}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{background:"linear-gradient(135deg,#1d4ed8,#4f46e5)"}}>
                  {sending?"발송 중...":"✈️ 지금 브리핑 발송"}
                </button>
                {sendResult==="success"&&<p className="text-xs text-center mt-2" style={{color:"#34d399"}}>✓ 텔레그램으로 발송 완료!</p>}
                {sendResult.startsWith("error")&&<p className="text-xs mt-2" style={{color:"#f87171"}}>{sendResult}</p>}
                {(!cfg.botToken||!cfg.defaultChatId)&&(
                  <p className="text-xs text-center mt-2" style={{color:"var(--text5)"}}>Bot 설정 탭에서 Token과 채팅방 ID를 먼저 입력하세요</p>
                )}
              </div>
            </div>

            {/* 오늘 마감 목록 */}
            {getTodayTasks(clients).length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
                <div className="px-4 py-2.5" style={{borderBottom:"1px solid var(--border)",background:"var(--hover)"}}>
                  <p className="text-xs font-semibold" style={{color:"var(--text3)"}}>오늘 마감 Task</p>
                </div>
                <div className="divide-y" style={{divideColor:"var(--border)"}}>
                  {getTodayTasks(clients).map((t,i)=>(
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{color:"var(--text)"}}>{t.task}</p>
                        <p className="text-xs" style={{color:"var(--text5)"}}>{t.client} · {t.project}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{background:"rgba(248,113,113,0.12)",color:"#f87171",border:"1px solid rgba(248,113,113,0.25)"}}>
                        오늘
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}

          {/* ── 가이드 ── */}
          {tab==="guide"&&(
            <div className="space-y-4">
              {[
                {
                  step:"1", title:"BotFather에서 Bot 생성",
                  desc:"텔레그램에서 @BotFather 검색 → /newbot 입력 → Bot 이름·username 설정 → Token 복사",
                  code:null,
                  link:"https://t.me/BotFather"
                },
                {
                  step:"2", title:"Bot을 채팅방에 초대",
                  desc:"알림 받을 텔레그램 그룹/채널에 Bot을 멤버로 추가하세요. 개인 알림은 Bot에게 먼저 메시지를 보내세요.",
                  code:null, link:null
                },
                {
                  step:"3", title:"채팅방 ID 확인",
                  desc:"Bot에게 메시지 후 아래 URL에서 chat.id 확인. 그룹방은 음수(-로 시작)입니다.",
                  code:"https://api.telegram.org/bot{TOKEN}/getUpdates",
                  link:null
                },
                {
                  step:"4", title:"Bot 설정 탭에 입력",
                  desc:"Token과 채팅방 ID를 입력하고 테스트 메시지로 확인하세요.",
                  code:null, link:null
                }
              ].map(s=>(
                <div key={s.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                    style={{background:"linear-gradient(135deg,#1d4ed8,#4f46e5)"}}>
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{s.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{color:"var(--text4)"}}>{s.desc}</p>
                    {s.code&&(
                      <code className="block mt-1.5 px-2 py-1 rounded-lg text-xs"
                        style={{background:"var(--input)",color:"#60a5fa"}}>{s.code}</code>
                    )}
                    {s.link&&(
                      <a href={s.link} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-xs" style={{color:"#60a5fa"}}>
                        → 열기
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
