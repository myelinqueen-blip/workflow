/* ─── Progress calculators ─── */
export const calcTaskPct = (subs = []) =>
  !subs.length ? 0 : Math.round(subs.filter(s => s.status === "done").length / subs.length * 100);

export const calcProjPct = (tasks = []) =>
  !tasks.length ? 0 : Math.round(tasks.reduce((a, t) => a + calcTaskPct(t.subtasks), 0) / tasks.length);

/* ─── Date helpers ─── */
export const fmtDate = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
};

/* ─── Subtask sort ─── */
export const sortSubs = list => {
  const auto = list.filter(s => !s.orderOverridden).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return a.order - b.order;
    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  const manual = list.filter(s => s.orderOverridden).sort((a, b) => a.order - b.order);
  return [...auto, ...manual];
};

/* ─── JSON safe parse ─── */
export const safeJSON = raw => {
  for (const re of [/```(?:json)?\s*([\s\S]*?)```/, /(\[[\s\S]*?\])/s, /(\{[\s\S]*?\})/s]) {
    const m = raw.match(re);
    if (m) { try { return JSON.parse(m[1] ?? m[0]); } catch {} }
  }
  return null;
};

/* ─── Claude API ─── */
export const callClaude = async (prompt, system = "", useSearch = false) => {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system,
    messages: [{ role:"user", content:prompt }],
  };
  if (useSearch) body.tools = [{ type:"web_search_20250305", name:"web_search" }];
  const res  = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
};

/* ─── Seed data ─── */
export const SEED_DATA = {
  clients: [
    {
      id:"cl1", name:"HL Group", color:"#6366f1", ownerId:"local", invitedEmails:[],
      projects:[
        { id:"pr1", name:"익명가왕 캠페인", description:"사내 익명 노래 경연대회 전체 기획 및 운영", status:"active",
          tasks:[
            { id:"tk1", name:"심사위원 섭외", order:0, dueDate:"2025-05-10", assignee:"김선민", nasPath:"\\\\NAS01\\HL\\익명가왕\\심사위원",
              subtasks:[
                {id:"st1",name:"심사위원 후보 리스트업",   status:"done",       order:0,assignee:"김선민",dueDate:"2025-04-20",orderOverridden:false},
                {id:"st2",name:"내부 섭외 컨택",           status:"done",       order:1,assignee:"김선민",dueDate:"2025-04-25",orderOverridden:false},
                {id:"st3",name:"외부 섭외 컨택 대기",      status:"pending",    order:2,assignee:"박팀원",dueDate:"2025-05-05",orderOverridden:false},
                {id:"st4",name:"최종 확정 및 계약서 전달", status:"in_progress",order:3,assignee:"김선민",dueDate:"2025-05-10",orderOverridden:false},
              ]},
            { id:"tk2", name:"홍보 콘텐츠 제작", order:1, dueDate:"2025-05-20", assignee:"이팀원", nasPath:"\\\\NAS01\\HL\\익명가왕\\콘텐츠",
              subtasks:[
                {id:"st5",name:"티저 영상 스크립트",  status:"done",       order:0,assignee:"이팀원",dueDate:"2025-04-28",orderOverridden:false},
                {id:"st6",name:"디자인 시안 제작",    status:"in_progress",order:1,assignee:"최팀원",dueDate:"2025-05-08",orderOverridden:false},
                {id:"st7",name:"사내 채널 게시 일정", status:"pending",    order:2,assignee:null,    dueDate:null,        orderOverridden:false},
              ]},
            { id:"tk3", name:"현장 운영 준비", order:2, dueDate:null, assignee:null, nasPath:null,
              subtasks:[
                {id:"st8", name:"장소 예약 및 셋업",status:"pending",order:0,assignee:"김선민",dueDate:"2025-05-15",orderOverridden:false},
                {id:"st9", name:"음향 장비 렌탈",   status:"pending",order:1,assignee:null,    dueDate:null,        orderOverridden:false},
                {id:"st10",name:"당일 큐시트 작성", status:"pending",order:2,assignee:null,    dueDate:null,        orderOverridden:false},
              ]},
          ]},
        { id:"pr2", name:"성수 이전 커뮤니케이션", description:"본사 이전 임직원 내부 소통 전략", status:"active",
          tasks:[
            { id:"tk4", name:"직원 저항 분석", order:0, dueDate:"2025-04-30", assignee:"김선민", nasPath:null,
              subtasks:[
                {id:"st11",name:"페르소나 도출 인터뷰",  status:"done",order:0,assignee:"김선민",dueDate:"2025-04-15",orderOverridden:false},
                {id:"st12",name:"설문 분석 리포트 작성", status:"done",order:1,assignee:"김선민",dueDate:"2025-04-25",orderOverridden:false},
              ]},
            { id:"tk5", name:"슬로건 개발", order:1, dueDate:"2025-05-15", assignee:null, nasPath:"\\\\NAS01\\HL\\이전\\슬로건",
              subtasks:[
                {id:"st13",name:"키워드 브레인스토밍", status:"done",       order:0,assignee:"이팀원",dueDate:"2025-04-20",orderOverridden:false},
                {id:"st14",name:"최종 후보 3개 선정",  status:"in_progress",order:1,assignee:"김선민",dueDate:"2025-05-10",orderOverridden:false},
                {id:"st15",name:"임원 보고 및 확정",   status:"pending",    order:2,assignee:"김선민",dueDate:"2025-05-15",orderOverridden:false},
              ]},
          ]},
      ]},
    {
      id:"cl2", name:"현대카드", color:"#f43f5e", ownerId:"local", invitedEmails:[],
      projects:[
        { id:"pr3", name:"DIVE 2025 행사 기획", description:"브랜드 뮤직 페스티벌 종합 기획", status:"active",
          tasks:[
            { id:"tk6", name:"아티스트 라인업", order:0, dueDate:"2025-05-01", assignee:"박팀원", nasPath:null,
              subtasks:[
                {id:"st16",name:"후보 리스트업", status:"done",       order:0,assignee:"박팀원",dueDate:"2025-04-10",orderOverridden:false},
                {id:"st17",name:"에이전시 컨택", status:"in_progress",order:1,assignee:"박팀원",dueDate:"2025-04-25",orderOverridden:false},
                {id:"st18",name:"계약 협상",     status:"pending",    order:2,assignee:null,    dueDate:null,        orderOverridden:false},
              ]},
          ]},
      ]},
  ],
};
