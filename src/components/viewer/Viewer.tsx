import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useViewerStore } from "@/store/useViewerStore";
import { SessionList } from "./SessionList";
import { DrillDown } from "./DrillDown";

export function Viewer() {
  const searchRef = useRef<HTMLInputElement>(null);
  const store = useViewerStore();
  const { sessions, searchQuery, drillIndex, selectedRow } = store;

  // Fix: close = hide the window properly
  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  useEffect(() => {
    store.load();
    setTimeout(() => searchRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (searchQuery) { store.setSearch(""); searchRef.current?.focus(); }
        else if (drillIndex !== null) { store.closeDrill(); searchRef.current?.focus(); }
        else handleClose();
      }
      if (e.key === "ArrowDown") { e.preventDefault(); store.navigateRows("down"); }
      if (e.key === "ArrowUp")   { e.preventDefault(); store.navigateRows("up"); }
      if (e.key === "Enter" && selectedRow >= 0 && drillIndex === null) {
        const filtered = [...sessions].reverse().filter(s =>
          !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.lines.some(l => l.content.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        if (filtered[selectedRow]) {
          const idx = sessions.indexOf(filtered[selectedRow]);
          store.openDrill(idx);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchQuery, drillIndex, selectedRow, sessions, store]);

  const drillSession = drillIndex !== null ? sessions[drillIndex] : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[rgba(11,12,17,0.97)] border border-white/[0.09] border-b-0 rounded-t-[14px] shadow-[0_-20px_80px_rgba(0,0,0,0.85)] animate-slideUp">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <span className="font-mono text-[11px] text-accent tracking-[0.13em] uppercase whitespace-nowrap">
          {drillSession ? "" : "all sessions"}
        </span>
        <div className="flex items-center gap-2 flex-1 flex-wrap font-mono text-[9px] text-white/40 tracking-wider">
          {drillSession ? (
            <>
              <button
                className="font-mono text-[8px] tracking-widest uppercase text-white/30 border border-white/10 rounded px-1.5 py-px hover:text-accent hover:border-accent/35 transition-all"
                onClick={() => store.closeDrill()}
              >
                ← all sessions
              </button>
              <button
                className="font-mono text-[8px] tracking-widest uppercase text-white/30 border border-white/10 rounded px-1.5 py-px hover:text-red-400 hover:border-red-400/38 transition-all ml-auto"
                onClick={() => { if (drillSession) store.removeSession(drillSession.id); }}
              >
                ✕ delete
              </button>
            </>
          ) : (
            `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`
          )}
        </div>

        {/* Fix: "esc" button text visible, and actually hides window */}
        <button
          className="font-mono text-[9px] text-white/40 tracking-widest uppercase px-1.5 py-px rounded border border-white/15 hover:text-white/75 hover:border-white/30 transition-all whitespace-nowrap"
          onClick={handleClose}
        >
          esc ×
        </button>
      </div>

      {/* Search — only in list mode */}
      {!drillSession && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] flex-shrink-0">
          <span className="text-[14px] text-white/20 leading-none">⌕</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="search…"
            value={searchQuery}
            onChange={(e) => store.setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[12px] text-slate-200 tracking-[0.02em] placeholder:text-white/30 caret-accent"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-1"
              onClick={() => { store.setSearch(""); searchRef.current?.focus(); }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-hidden flex flex-col ${!drillSession ? "overflow-y-auto px-4 pb-5 pt-2.5" : ""}`}>
        {drillSession ? (
          <DrillDown
            session={drillSession}
            onBack={() => store.closeDrill()}
            onDelete={(id) => store.removeSession(id)}
            onEditLines={(id, lines) => store.editLines(id, lines)}
          />
        ) : (
          <SessionList
            sessions={sessions}
            searchQuery={searchQuery}
            selectedRow={selectedRow}
            onOpen={(i) => store.openDrill(i)}
            onDelete={(id) => store.removeSession(id)}
          />
        )}
      </div>

      {/* Fix: "type to dismiss" footer with correct visible color */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.05] text-center">
        <span className="font-mono text-[8px] tracking-[0.18em] uppercase text-white/25">
          press esc to dismiss
        </span>
      </div>
    </div>
  );
}