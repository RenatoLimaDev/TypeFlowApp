import { useRef, useEffect, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useCardStore } from "@/store/useCardStore";
import { useGhostInput } from "@/hooks/useGhostInput";
import { wrapText } from "@/lib/ruler";
import { isSoundEnabled, setSoundEnabled, sounds } from "@/lib/sound";
import { CardLine } from "./CardLine";
import { invoke } from "@tauri-apps/api/core";

const PLACEHOLDERS = [
  "what are you thinking?", "type here…", "keep going…",
  "something clicked?", "write it down…", "don't lose this…", "quick thought?",
];

interface CardProps {
  onFinish: (title: string, lines: { content: string }[]) => void;
  onOpenViewer: () => void;
}

export function Card({ onFinish, onOpenViewer }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [phIdx, setPhIdx] = useState(0);
  const [flashVisible, setFlashVisible] = useState(false);
  const [passthrough, setPassthrough] = useState(false);
  const passthroughRef = useRef(false);
  const onboardingHidden = useRef(false);

  const store = useCardStore();
  const { mode, titleText, noteText, prevGhost, prevGhostTag, sessionDone } = store;

  const cardWidth = cardRef.current?.getBoundingClientRect().width ?? 900;
  const maxW = cardWidth - 80;
  const wrappedNote = wrapText(noteText, maxW);
  const activeNote = wrappedNote[wrappedNote.length - 1] ?? "";
  const ghostLine = wrappedNote.length >= 2 ? wrappedNote[wrappedNote.length - 2] : prevGhost;
  const ghostTag = prevGhostTag || (wrappedNote.length >= 2 ? `~${store.lineCounter}` : "");

  const hideOnboarding = useCallback(() => {
    if (onboardingHidden.current) return;
    onboardingHidden.current = true;
    import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
      WebviewWindow.getByLabel("onboarding").then((w) => w?.hide());
    });
  }, []);

  const showFlash = useCallback(() => {
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 1200);
  }, []);

  const handleFinish = useCallback(() => {
    const result = store.finishSession();
    if (!result) return;
    setTimeout(() => {
      store.reset();
      onFinish(result.title, result.lines);
    }, 1600);
  }, [store, onFinish]);

  const { ghostRef, focus, handleKeyDown, handleInput, handlePaste } = useGhostInput({
    disabled: sessionDone,
    paused: passthrough,
    onChar: (c) => {
      hideOnboarding();
      store.appendChar(c, cardWidth);
    },
    onBackspace: () => {
      hideOnboarding();
      store.backspace(cardWidth);
    },
    onEnter: () => {
      hideOnboarding();
      if (mode === "title") store.commitTitle();
      else {
        store.advanceNote(cardWidth);
        showFlash();
        setPhIdx((i) => (i + 1) % PLACEHOLDERS.length);
      }
    },
    onCtrlEnter: () => { if (mode === "note") handleFinish(); },
    onCtrlZ: () => store.undo(cardWidth),
  });

  const togglePassthrough = useCallback(async () => {
    const next = !passthroughRef.current;
    passthroughRef.current = next;
    setPassthrough(next);
    await getCurrentWindow().setIgnoreCursorEvents(next).catch(() => {});

    const { emit } = await import("@tauri-apps/api/event");
  if (next) {
    await emit("keyboard-capture-stop");
  } else {
    await emit("keyboard-capture-start");
  }

  }, []);

    const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    sounds.toggle(next);
  }, [soundOn]);

  useEffect(() => {
  let unlistenClick: (() => void) | null = null;
  let unlistenSound: (() => void) | null = null;

  listen("toggle-click-through", () => togglePassthrough())
    .then((fn) => { unlistenClick = fn; });

  listen("toggle-sound", () => toggleSound())
    .then((fn) => { unlistenSound = fn; });

  return () => {
    unlistenClick?.();
    unlistenSound?.();
  };
}, [togglePassthrough, toggleSound]);

  // Reasserta WS_EX_NOACTIVATE a cada clique — impede barra de tarefas
  useEffect(() => {
    const handler = () => {
      invoke("reassert_noactivate").catch(() => {});
    };
    window.addEventListener("mousedown", handler, true);
    return () => window.removeEventListener("mousedown", handler, true);
  }, []);


  const handleOpenViewer = useCallback(async () => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const viewer = await WebviewWindow.getByLabel("viewer");
    if (!viewer) return;
    const visible = await viewer.isVisible();
    if (visible) await viewer.hide();
    else { await viewer.show(); await viewer.setFocus(); }
  }, []);

  return (
    <div
      className="flex flex-col w-[900px]"
      style={{
        opacity: passthrough ? 0.18 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Ghost textarea invisível */}
      <textarea
        ref={ghostRef}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        aria-hidden="true"
        style={{
          position: "fixed",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      />

      {/* Top bar */}
      <div
        className="h-5 flex-shrink-0 flex items-center justify-end px-2.5"
        data-tauri-drag-region
      >
        <div
          className="flex gap-1.5 items-center"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ pointerEvents: passthrough ? "none" : "auto" }}
        >
          <button
            onClick={handleOpenViewer}
            className="font-mono text-[7.5px] tracking-wider uppercase px-1.5 py-px rounded border border-white/10 text-white/20 hover:text-accent hover:border-accent/40 transition-all"
          >
            sessions
          </button>
          <button
            onClick={toggleSound}
            className={`font-mono text-[7.5px] tracking-wider uppercase px-1.5 py-px rounded border transition-all ${
              soundOn
                ? "text-violet-400 border-violet-400/45 bg-violet-400/10"
                : "text-white/20 border-white/10 hover:text-violet-400 hover:border-violet-400/35"
            }`}
          >
            {soundOn ? "sound on" : "sound off"}
          </button>
          <button
            onClick={togglePassthrough}
            className={`font-mono text-[7.5px] tracking-wider uppercase px-1.5 py-px rounded border transition-all ${
              passthrough
                ? "text-yellow-400 border-yellow-400/45 bg-yellow-400/10"
                : "text-white/20 border-white/10 hover:text-yellow-400 hover:border-yellow-400/35"
            }`}
          >
            {passthrough ? "passthrough on" : "passthrough off"}
          </button>
          <button
            onClick={() => getCurrentWindow().hide()}
            className="font-mono text-sm leading-none text-white/20 hover:text-red-400 transition-colors px-1"
          >
            ×
          </button>
        </div>
      </div>

      {/* Card body */}
      <div
        ref={cardRef}
        className="relative bg-[rgba(10,10,14,0.92)] rounded-xl backdrop-blur-lg px-4 py-2.5 flex flex-col gap-1 overflow-visible"
        style={{
          border: passthrough
            ? "1px solid rgba(250,204,21,0.5)"
            : "1px solid rgba(255,255,255,0.07)",
          transition: "border-color 0.2s ease",
          pointerEvents: passthrough ? "none" : "auto",
        }}
        data-tauri-drag-region
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          // Previne ativação da janela — ghost input já recebe via hook Rust
          e.preventDefault();
          focus();
        }}
      >
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 grid grid-cols-1 gap-[3px] pointer-events-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="w-[3px] h-[3px] rounded-full bg-white/25" />
          ))}
        </div>

        <div className={mode === "note" ? "text-white/50" : "text-accent"} data-tauri-drag-region>
          <CardLine
            tag={mode === "note" ? ghostTag : "title"}
            text={mode === "note" ? ghostLine : titleText}
            placeholder={mode === "title" ? "Session title…" : undefined}
            showCursor={mode === "title" && !passthrough}
          />
        </div>

        {mode === "note" && (
          <div className="text-slate-200" data-tauri-drag-region>
            <CardLine
              tag={`~${store.lineCounter + 1}`}
              text={activeNote}
              placeholder={PLACEHOLDERS[phIdx]}
              showCursor={!passthrough}
            />
          </div>
        )}

        {flashVisible && (
          <span className="absolute bottom-1.5 right-3 font-mono text-[8px] text-accent/55 tracking-widest uppercase pointer-events-none">
            saved
          </span>
        )}

        {sessionDone && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-[rgba(10,10,14,0.93)] z-10">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-accent/80">
              session saved ›
            </span>
          </div>
        )}
      </div>
    </div>
  );
}