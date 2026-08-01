export const calcTaskPct = (subs=[]) =>
  !subs.length ? 0 : Math.round(subs.filter(s=>s.status==="done").length/subs.length*100);
export const calcProjPct = (tasks=[]) =>
  !tasks.length ? 0 : Math.round(tasks.reduce((a,t)=>a+calcTaskPct(t.subtasks),0)/tasks.length);
export const fmtDate = iso => {
  if(!iso) return null;
  const d=new Date(iso+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
};
export const todayISO = () => new Date().toISOString().slice(0,10);
export const todayStr = () => { const d=new Date(); return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`; };
export const sortSubs = list => {
  const auto=list.filter(s=>!s.orderOverridden).sort((a,b)=>{
    if(!a.dueDate&&!b.dueDate) return a.order-b.order;
    if(!a.dueDate) return 1; if(!b.dueDate) return -1;
    return new Date(a.dueDate)-new Date(b.dueDate);
  });
  return [...auto,...list.filter(s=>s.orderOverridden).sort((a,b)=>a.order-b.order)];
};
export const safeJSON = raw => {
  for(const re of [/```(?:json)?\s*([\s\S]*?)```/,/(\[[\s\S]*?\])/s,/(\{[\s\S]*?\})/s]){
    const m=raw.match(re); if(m){try{return JSON.parse(m[1]??m[0]);}catch{}}
  } return null;
};
export const callClaude = async (prompt, system="", useSearch=false) => {
  const body={model:"claude-sonnet-4-20250514",max_tokens:2000,system,messages:[{role:"user",content:prompt}]};
  if(useSearch) body.tools=[{type:"web_search_20250305",name:"web_search"}];
  const res=await fetch("/api/claude",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
  });
  if(!res.ok) throw new Error(`API error: ${res.status}`);
  const data=await res.json();
  return (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
};
export const mkId = () => Math.random().toString(36).slice(2,9);

/* ── 기본 구성원 ── */
export const DEFAULT_MEMBERS = [
  { id:"m1", name:"김선민", role:"팀장", email:"", color:"#6366f1", avatar:"선" },
  { id:"m2", name:"이팀원", role:"팀원", email:"", color:"#f43f5e", avatar:"이" },
  { id:"m3", name:"박팀원", role:"팀원", email:"", color:"#f59e0b", avatar:"박" },
  { id:"m4", name:"최팀원", role:"팀원", email:"", color:"#10b981", avatar:"최" },
];

export const SEED_DATA = {
  members: DEFAULT_MEMBERS,
  clients:[
    { id:"cl1", name:"HL Group", color:"#6366f1", invitedEmails:[], memberIds:["m1","m2","m3"],
      projects:[
        { id:"pr1", name:"익명가왕 캠페인", description:"사내 익명 노래 경연대회 기획", status:"active", order:0,
          memberIds:["m1","m2"], sheetsUrl:"",
          tasks:[
            { id:"tk1", name:"심사위원 섭외", order:0, dueDate:"2025-05-10", assigneeId:"m1", nasPath:"\\\\NAS01\\HL\\익명가왕", links:[],
              subtasks:[
                {id:"st1",name:"후보 리스트업",   status:"done",       order:0,assigneeId:"m1",dueDate:"2025-04-20",orderOverridden:false,nasPath:null,links:[]},
                {id:"st2",name:"내부 섭외 컨택",  status:"done",       order:1,assigneeId:"m1",dueDate:"2025-04-25",orderOverridden:false,nasPath:null,links:[]},
                {id:"st3",name:"외부 섭외 컨택",  status:"pending",    order:2,assigneeId:"m3",dueDate:"2025-05-05",orderOverridden:false,nasPath:null,links:[]},
                {id:"st4",name:"계약서 전달",      status:"in_progress",order:3,assigneeId:"m1",dueDate:"2025-05-10",orderOverridden:false,nasPath:null,links:[]},
              ]},
            { id:"tk2", name:"홍보 콘텐츠 제작", order:1, dueDate:"2025-05-20", assigneeId:"m2", nasPath:null, links:[],
              subtasks:[
                {id:"st5",name:"티저 스크립트",  status:"done",       order:0,assigneeId:"m2",dueDate:"2025-04-28",orderOverridden:false,nasPath:null,links:[]},
                {id:"st6",name:"디자인 시안",     status:"in_progress",order:1,assigneeId:"m4",dueDate:"2025-05-08",orderOverridden:false,nasPath:null,links:[]},
                {id:"st7",name:"게시 일정 확정",  status:"pending",    order:2,assigneeId:null, dueDate:null,        orderOverridden:false,nasPath:null,links:[]},
              ]},
          ]},
        { id:"pr2", name:"성수 이전 커뮤니케이션", description:"본사 이전 내부 소통 전략", status:"active", order:1,
          memberIds:["m1","m3"], sheetsUrl:"",
          tasks:[
            { id:"tk3", name:"슬로건 개발", order:0, dueDate:"2025-05-15", assigneeId:null, nasPath:null, links:[],
              subtasks:[
                {id:"st8", name:"키워드 브레인스토밍", status:"done",       order:0,assigneeId:"m2",dueDate:"2025-04-20",orderOverridden:false,nasPath:null,links:[]},
                {id:"st9", name:"후보 3개 선정",        status:"in_progress",order:1,assigneeId:"m1",dueDate:"2025-05-10",orderOverridden:false,nasPath:null,links:[]},
                {id:"st10",name:"임원 보고",             status:"pending",    order:2,assigneeId:"m1",dueDate:"2025-05-15",orderOverridden:false,nasPath:null,links:[]},
              ]},
          ]},
      ]},
    { id:"cl2", name:"현대카드", color:"#f43f5e", invitedEmails:[], memberIds:["m1","m3"],
      projects:[
        { id:"pr3", name:"DIVE 2025 행사 기획", description:"브랜드 뮤직 페스티벌", status:"active", order:0,
          memberIds:["m1","m3"], sheetsUrl:"",
          tasks:[
            { id:"tk4", name:"아티스트 라인업", order:0, dueDate:"2025-05-01", assigneeId:"m3", nasPath:null, links:[],
              subtasks:[
                {id:"st11",name:"후보 리스트업", status:"done",       order:0,assigneeId:"m3",dueDate:"2025-04-10",orderOverridden:false,nasPath:null,links:[]},
                {id:"st12",name:"에이전시 컨택", status:"in_progress",order:1,assigneeId:"m3",dueDate:"2025-04-25",orderOverridden:false,nasPath:null,links:[]},
                {id:"st13",name:"계약 협상",     status:"pending",    order:2,assigneeId:null, dueDate:null,        orderOverridden:false,nasPath:null,links:[]},
              ]},
          ]},
      ]},
    { id:"cl3", name:"교보생명", color:"#10b981", invitedEmails:[], memberIds:["m1","m2"],
      projects:[
        { id:"pr4", name:"청소년 스포츠 대회", description:"청소년 스포츠 이벤트 기획", status:"active", order:0,
          memberIds:["m1","m2"], sheetsUrl:"",
          tasks:[]},
      ]},
  ],
};
