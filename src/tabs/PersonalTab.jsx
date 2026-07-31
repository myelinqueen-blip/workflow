/**
 * PersonalTab.jsx
 * 개인 습관 트래커 + TODO
 * 전체 구현: personal-tab.jsx (별도 파일)
 */
export default function PersonalTab() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="text-5xl text-slate-800">◉</div>
        <div className="text-lg font-semibold text-slate-500">Personal</div>
        <p className="text-sm text-slate-700 max-w-xs leading-relaxed">습관 트래커 · 개인 TO-DO · 링크 메모</p>
        <div className="inline-block px-3 py-1.5 rounded-full text-xs text-indigo-500 font-mono"
          style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)" }}>
          준비 중
        </div>
      </div>
    </div>
  );
}
