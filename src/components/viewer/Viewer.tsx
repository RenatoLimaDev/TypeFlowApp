import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { useViewerStore } from "@/store/useViewerStore";
import { SessionList } from "./SessionList";
import { DrillDown } from "./DrillDown";
import { CircleChevronLeft } from "lucide-react";

const PILL_W = 560;
const HEADER = 44;
const FOOTER = 41; // footer border + padding + content
const LINE_H = 22; // approx height per line in drilldown
const LIST_HEADER = 44;
const LIST_SEARCH = 36;
const LIST_ITEM = 48;
const MAX_H = 640;

export function Viewer() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [passthrough, setPassthrough] = useState(false);
  const store = useViewerStore();
  const { sessions, searchQuery, drillIndex, selectedRow } = store;

  const handleClose = async () => {
    const { emit } = await import("@tauri-apps/api/event");
    await emit("viewer-closed");
    await getCurrentWindow().hide();
  };

  // Resize viewer to fit content, keeping bottom edge fixed
  const resizeTo = async (logH: number) => {
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    const scale = await win.scaleFactor();
    const newPhysH = Math.round(logH * scale);
    const newPhysY = pos.y + size.height - newPhysH;
    await win.setSize(new LogicalSize(PILL_W, logH));
    await win.setPosition(new PhysicalPosition(pos.x, newPhysY));
  };

  useEffect(() => {
    store.load();
    setTimeout(() => searchRef.current?.focus(), 120);
  }, []);

  // Resize when entering/leaving drilldown
  useEffect(() => {
    if (drillIndex !== null) {
      const session = sessions[drillIndex];
      const lineCount = session?.lines.length ?? 0;
      const contentH = (lineCount + 2) * LINE_H + 24;
      const newH = Math.min(HEADER + FOOTER + contentH, MAX_H);
      resizeTo(newH);
    } else {
      const count = sessions.length;
      const newH = Math.min(LIST_HEADER + LIST_SEARCH + (count + 1) * LIST_ITEM, MAX_H);
      resizeTo(newH);
    }
  }, [drillIndex]);

  useEffect(() => {
    const unlisten = listen("toggle-click-through", async () => {
      setPassthrough(p => {
        const next = !p;
        getCurrentWindow().setIgnoreCursorEvents(next).catch(() => {});
        return next;
      });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (searchQuery) { store.setSearch(""); searchRef.current?.focus(); }
        else if (drillIndex !== null) { store.closeDrill(); searchRef.current?.focus(); }
        else handleClose();
      }
      if (drillIndex === null) {
        if (e.key === "ArrowDown") { e.preventDefault(); store.navigateRows("down"); }
        if (e.key === "ArrowUp")   { e.preventDefault(); store.navigateRows("up"); }
        if (e.key === "Enter" && selectedRow >= 0) {
          const q = searchQuery.trim().toLowerCase();
          const filtered = [...sessions].reverse().filter(s =>
            !q || s.title.toLowerCase().includes(q) ||
            s.lines.some(l => l.content.toLowerCase().includes(q))
          );
          const hit = filtered[selectedRow];
          if (hit) store.openDrill(sessions.indexOf(hit));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchQuery, drillIndex, selectedRow, sessions, store]);

  const drillSession = drillIndex !== null ? sessions[drillIndex] : null;

  return (
    <div
      className="flex flex-col overflow-hidden animate-slideUp"
      style={{
        height: "100%",
        background: "rgba(13,13,19,0.98)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        opacity: passthrough ? 0 : 1,
        transition: "opacity 0.2s ease",
        pointerEvents: passthrough ? "none" : "auto",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        data-tauri-drag-region
        className="flex items-center px-4 flex-shrink-0"
        style={{ height: 44, borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "grab" }}
      >
        {drillSession ? (
          <>
            <button
              className="text-white/28 hover:text-white/60 transition-colors mr-3 flex-shrink-0"
              onClick={() => store.closeDrill()}
            >
              <CircleChevronLeft size={14} />
            </button>
            <span className="font-mono text-[11px] text-white/55 truncate flex-1 min-w-0">
              {drillSession.title}
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/25 flex-1">
              sessions
            </span>
            {sessions.length > 0 && (
              <span className="font-mono text-[9px] text-white/18 mr-3 tabular-nums">
                {sessions.length}
              </span>
            )}
          </>
        )}
        <button
          onClick={handleClose}
          className="font-mono text-[14px] leading-none text-white/18 hover:text-white/55 transition-colors w-5 text-center flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      {!drillSession && (
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{ height: 36, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <span className="font-mono text-[9px] text-white/18 mr-3 select-none">/</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="search…"
            value={searchQuery}
            onChange={(e) => store.setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[11px] text-white/65 placeholder:text-white/18 caret-accent"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              onClick={() => { store.setSearch(""); searchRef.current?.focus(); }}
              className="font-mono text-[11px] text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {drillSession ? (
          <DrillDown session={drillSession} onDelete={() => { store.removeSession(drillSession.id); store.closeDrill(); }} />
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
    </div>
  );
}
