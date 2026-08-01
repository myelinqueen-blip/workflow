export default function PersonalTab() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="text-4xl" style={{color:"var(--text5)"}}>◉</div>
        <p className="text-sm font-semibold" style={{color:"var(--text4)"}}>Personal</p>
        <p className="text-xs" style={{color:"var(--text5)"}}>습관 트래커 · 개인 TODO · 메모</p>
        <span className="inline-block px-3 py-1 rounded-full text-xs"
          style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)"}}>
          준비 중
        </span>
      </div>
    </div>
  );
}
