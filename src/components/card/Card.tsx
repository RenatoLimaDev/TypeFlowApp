import { useRef, useEffect, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useCardStore } from "@/store/useCardStore";
import { useGhostInput } from "@/hooks/useGhostInput";
import { wrapText } from "@/lib/ruler";
import { isSoundEnabled, setSoundEnabled, sounds } from "@/lib/sound";
import { invoke } from "@tauri-apps/api/core";
import { CircleCheck, CircleHelp, EyeClosed } from "lucide-react";
import { getSessions } from "@/lib/storage";

const PILL_W = 560;
const PILL_H = 52;
const CARD_W_STORE = PILL_W - 48; // 24px margin each side

const ONBOARD_STEPS = [
  "welcome to typeflow",
  "enter  —  new line",
  "ctrl + enter  —  save session",
  "ctrl + z  —  undo",
  "ctrl + alt + v  —  sessions",
  "ctrl + alt + s  —  sound on/off",
  "ctrl + alt + c  —  click-through",
  "esc  —  close / back",
];

function isFirstRun() {
  return !localStorage.getItem("tf-seen");
}

interface CardProps {
  onFinish: (title: string, lines: { content: string }[]) => void;
}

export function Card({ onFinish }: CardProps) {
  const [passthrough, setPassthrough] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  // Inline onboarding: step index, -1 = done
  const [onboard, setOnboard] = useState<number>(() => isFirstRun() ? 0 : -1);

  // Roll animation state
  const [rollPhase, setRollPhase] = useState<"idle" | "out" | "in">("idle");
  const [outText, setOutText] = useState("");
  const [phaseKey, setPhaseKey] = useState(0);

  const passthroughRef = useRef(false);
  const viewerOpenRef = useRef(false);
  const rollTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const store = useCardStore();
  const { mode, titleText, noteText, sessionDone } = store;

  const wrappedNote = wrapText(noteText, PILL_W - 40);
  const activeNote = wrappedNote[wrappedNote.length - 1] ?? "";
  const storeText = mode === "title" ? titleText : activeNote;

  // ── Helpers ─────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    const result = store.finishSession();
    if (!result) return;
    setTimeout(() => { store.reset(); onFinish(result.title, result.lines); }, 1400);
  }, [store, onFinish]);

  const triggerRoll = useCallback((action: () => void, text: string) => {
    rollTimers.current.forEach(clearTimeout);
    setOutText(text);
    setRollPhase("out");
    setPhaseKey((k) => k + 1);
    const t1 = setTimeout(() => {
      action();
      setRollPhase("in");
      setPhaseKey((k) => k + 1);
    }, 260);
    const t2 = setTimeout(() => setRollPhase("idle"), 600);
    rollTimers.current = [t1, t2];
  }, []);

  const skipOnboard = useCallback(() => {
    localStorage.setItem("tf-seen", "1");
    setOnboard(-1);
    setRollPhase("idle");
    rollTimers.current.forEach(clearTimeout);
  }, []);

  const togglePassthrough = useCallback(async () => {
    const next = !passthroughRef.current;
    passthroughRef.current = next;
    setPassthrough(next);
    await getCurrentWindow().setIgnoreCursorEvents(next).catch(() => {});
    const { emit } = await import("@tauri-apps/api/event");
    if (next) await emit("keyboard-capture-stop");
    else await emit("keyboard-capture-start");
    if (viewerOpenRef.current) invoke("set_viewer_passthrough", { on: next }).catch(() => {});
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    sounds.toggle(next);
  }, [soundOn]);

  const handleOpenViewer = useCallback(async () => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const { PhysicalPosition, LogicalSize } = await import("@tauri-apps/api/dpi");
    const viewer = await WebviewWindow.getByLabel("viewer");
    if (!viewer) return;

    const visible = await viewer.isVisible();
    if (visible) {
      await viewer.hide();
      viewerOpenRef.current = false;
      setViewerOpen(false);
      // Retoma captura ao fechar via toggle (Ctrl+Alt+V)
      if (!passthroughRef.current) {
        const { emit } = await import("@tauri-apps/api/event");
        await emit("keyboard-capture-start");
      }
    } else {
      const cardWin = await WebviewWindow.getByLabel("card");
      if (cardWin) {
        const pos = await cardWin.outerPosition();
        const scale = await cardWin.scaleFactor();
        const count = getSessions().length;
        const HEADER = 44, SEARCH = 36, ITEM = 48, MAX = 640;
        const dynamicH = Math.min(HEADER + SEARCH + (count + 1) * ITEM, MAX);
        await viewer.setSize(new LogicalSize(PILL_W, dynamicH));
        await viewer.setPosition(new PhysicalPosition(
          pos.x + Math.round(30 * scale),
          pos.y + Math.round(22 * scale) - Math.round(dynamicH * scale),
        ));
      }
      await invoke("show_viewer_noactivate");
      viewerOpenRef.current = true;
      setViewerOpen(true);
      // Para captura para o viewer receber eventos nativos de teclado
      if (!passthroughRef.current) {
        const { emit } = await import("@tauri-apps/api/event");
        await emit("keyboard-capture-stop");
      }
    }
  }, []);

  // ── Ghost input ──────────────────────────────────────────────────────

  const { ghostRef, focus, handleKeyDown, handleInput, handlePaste } = useGhostInput({
    disabled: sessionDone,
    paused: passthrough,
    onChar: (c) => {
      if (onboard >= 0) { skipOnboard(); return; }
      const before = useCardStore.getState();
      store.appendChar(c, CARD_W_STORE);
      if (useCardStore.getState().allLines.length > before.allLines.length) {
        triggerRoll(() => {}, before.noteText.trim());
      }
    },
    onPaste: (text) => {
      if (onboard >= 0) { skipOnboard(); return; }
      const before = useCardStore.getState();
      store.pasteText(text, CARD_W_STORE);
      if (useCardStore.getState().allLines.length > before.allLines.length) {
        triggerRoll(() => {}, "");
      }
    },
    onBackspace: () => {
      if (onboard >= 0) { skipOnboard(); return; }
      store.backspace(CARD_W_STORE);
    },
    onEnter: () => {
      if (onboard >= 0) { skipOnboard(); return; }
      const text = mode === "title" ? titleText : activeNote;
      if (mode === "title") triggerRoll(() => store.commitTitle(), text);
      else triggerRoll(() => store.advanceNote(CARD_W_STORE), text);
    },
    onCtrlEnter: () => {
      if (onboard >= 0) { skipOnboard(); return; }
      if (mode === "note") handleFinish();
    },
    onCtrlZ: () => { if (onboard < 0) store.undo(CARD_W_STORE); },
  });

  // ── Onboarding auto-advance ──────────────────────────────────────────

  useEffect(() => {
    if (onboard < 0) return;
    const timer = setTimeout(() => {
      const step = onboard;
      const next = step + 1;
      if (next >= ONBOARD_STEPS.length) {
        triggerRoll(() => {}, ONBOARD_STEPS[step]);
        setTimeout(() => setOnboard(-1), 260);
        localStorage.setItem("tf-seen", "1");
      } else {
        triggerRoll(() => {}, ONBOARD_STEPS[step]);
        setTimeout(() => setOnboard(next), 260);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [onboard, triggerRoll]);

  // ── Effects ──────────────────────────────────────────────────────────

  // Inicia captura de teclado ao montar — CAPTURE_ACTIVE começa como false no Rust
  useEffect(() => {
    import("@tauri-apps/api/event").then(({ emit }) => emit("keyboard-capture-start"));
  }, []);

  useEffect(() => {
    const fns: (() => void)[] = [];
    listen("toggle-click-through", () => togglePassthrough()).then((fn) => fns.push(fn));
    listen("toggle-sound", () => toggleSound()).then((fn) => fns.push(fn));
    listen("toggle-viewer", () => handleOpenViewer()).then((fn) => fns.push(fn));
    listen("viewer-closed", async () => {
      viewerOpenRef.current = false;
      setViewerOpen(false);
      // Retoma captura quando viewer fecha
      const { emit } = await import("@tauri-apps/api/event");
      if (!passthroughRef.current) await emit("keyboard-capture-start");
    }).then((fn) => fns.push(fn));
    return () => fns.forEach((fn) => fn());
  }, [togglePassthrough, toggleSound, handleOpenViewer]);

  useEffect(() => {
    const handler = () => invoke("reassert_noactivate").catch(() => {});
    window.addEventListener("mousedown", handler, true);
    return () => window.removeEventListener("mousedown", handler, true);
  }, []);

  useEffect(() => {
    if (!viewerOpen) return;
    let unlisten: (() => void) | null = null;
    getCurrentWindow().onMoved(() => invoke("sync_viewer_to_card").catch(() => {}))
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [viewerOpen]);

  // ── Render ───────────────────────────────────────────────────────────

  const isOnboarding = onboard >= 0;
  const displayText = isOnboarding ? ONBOARD_STEPS[onboard] : storeText;
  const textToShow = rollPhase === "out" ? outText : displayText;
  const showCursor = rollPhase === "idle" && !passthrough && !sessionDone;

  const animClass =
    rollPhase === "out" ? "animate-rollBack" :
    rollPhase === "in"  ? "animate-rollIn"   : undefined;

  const pillBorder = passthrough
    ? "rgba(250,204,21,0.1)"
    : viewerOpen
    ? "rgba(125,211,252,0.10)"
    : "rgba(255,255,255,0.07)";
  const pillShadow = passthrough || viewerOpen
    ? "none"
    : "0 4px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)";

  return (
    <div className="flex items-center justify-center w-full h-full group/pill" style={{ position: "relative" }}>
      <textarea
        ref={ghostRef}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        aria-hidden="true"
        style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1, top: 0, left: 0, zIndex: -1 }}
      />

      {/* ── Pill ────────────────────────────────────────────────────── */}
      <div
        data-tauri-drag-region
        onMouseDown={(e) => {
          e.preventDefault();
          if (viewerOpen) handleOpenViewer();
          else focus();
        }}
        style={{
          width: PILL_W,
          height: PILL_H,
          borderRadius: 9999,
          background: passthrough
            ? "rgba(13,13,19,0)"
            : viewerOpen
            ? "rgba(13,13,19,0.60)"
            : "rgba(13,13,19,0.96)",
          border: `1px solid ${pillBorder}`,
          boxShadow: pillShadow,
          overflow: "hidden",
          position: "relative",
          opacity: passthrough ? 0 : 1,
          transition: "opacity 0.25s ease, border-color 0.3s ease, background 0.3s ease",
          cursor: viewerOpen ? "pointer" : "default",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: viewerOpen ? "center" : undefined,
            paddingLeft: viewerOpen ? 0 : 20,
            paddingRight: viewerOpen ? 0 : 20,
            overflow: "hidden",
          }}
        >
          {viewerOpen ? (
            <span
              className="animate-fadeIn"
              style={{ color: "rgba(125,211,252,0.8)", display: "flex" }}
            >
              <EyeClosed size={20} strokeWidth={2} />
            </span>
          ) : sessionDone ? (
            <span className="animate-fadeIn w-full flex justify-center" style={{ color: "#7dd3fc", opacity: 0.8 }}>
              <CircleCheck size={16} strokeWidth={1.5} />
            </span>
          ) : (
            <div
              key={phaseKey}
              className={animClass}
              style={{ width: "100%", position: "relative" }}
            >
              <span
                className="font-mono text-[15px] tracking-[0.01em] whitespace-nowrap"
                style={{ color: isOnboarding ? "#7dd3fc" : "rgba(255,255,255,0.82)" }}
              >
                {textToShow}
                {showCursor && (
                  <span
                    className="inline-block w-[2px] h-[0.88em] align-text-bottom ml-[1px] rounded-[1px] animate-blink"
                    style={{ background: "#7dd3fc", marginBottom: "1px" }}
                  />
                )}
              </span>

              {/* Placeholder — only in normal mode when empty */}
              {!textToShow && !isOnboarding && rollPhase === "idle" && (
                <span
                  className="font-mono text-[15px] pointer-events-none absolute inset-0 flex items-center"
                  style={{ color: "rgba(255,255,255,0.16)" }}
                >
                  {mode === "title" ? "title session…" : "keep going…"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ? help button — visible on hover, hidden during onboarding/passthrough/viewer */}
      {!isOnboarding && !sessionDone && !passthrough && !viewerOpen && (
        <button
          className="absolute opacity-0 group-hover/pill:opacity-100 transition-opacity"
          style={{
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.18)",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}
          onClick={() => setOnboard(0)}
        >
          <CircleHelp size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
