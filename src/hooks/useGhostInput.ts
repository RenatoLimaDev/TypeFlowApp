import { useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { initAudio } from "@/lib/sound";

interface KeyEvent {
  kind: "char" | "backspace" | "enter" | "ctrl_enter" | "ctrl_z" | "escape";
  char?: string;
}

interface UseGhostInputOptions {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onCtrlEnter: () => void;
  onCtrlZ: () => void;
  onArrow?: (dir: "up" | "down" | "left" | "right") => void;
  disabled?: boolean;
  paused?: boolean;
}

export function useGhostInput(opts: UseGhostInputOptions) {
  const ghostRef = useRef<HTMLTextAreaElement>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const focus = useCallback(() => {
    if (!optsRef.current.paused) {
      ghostRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => { focus(); }, [focus]);
  useEffect(() => {
    const onFocus = () => focus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [focus]);

  useEffect(() => {
    if (opts.paused) {
      ghostRef.current?.blur();
    } else {
      ghostRef.current?.focus({ preventScroll: true });
    }
  }, [opts.paused]);

  // Listener do hook global do Rust — funciona SEM foco DOM
  // É o que permite digitar logo após Ctrl+Alt+N sem precisar clicar
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<KeyEvent>("global-key", ({ payload }) => {
      const o = optsRef.current;
      if (o.disabled || o.paused) return;
      initAudio();

      switch (payload.kind) {
        case "char":
          if (payload.char) o.onChar(payload.char);
          break;
        case "backspace":
          o.onBackspace();
          break;
        case "enter":
          o.onEnter();
          break;
        case "ctrl_enter":
          o.onCtrlEnter();
          break;
        case "ctrl_z":
          o.onCtrlZ();
          break;
        case "escape":
          getCurrentWindow().hide();
          break;
      }
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []); // sem dependências — usa optsRef para valores atuais

  // handleKeyDown — fallback quando a janela tem foco normal (não fullscreen)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (optsRef.current.paused || optsRef.current.disabled) return;
      initAudio();

      if (e.ctrlKey && e.altKey) return;

      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        optsRef.current.onCtrlZ();
        return;
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        optsRef.current.onCtrlEnter();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        optsRef.current.onEnter();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        optsRef.current.onBackspace();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        getCurrentWindow().hide();
        return;
      }
      if (e.key.startsWith("Arrow") && optsRef.current.onArrow) {
        e.preventDefault();
        const dir = e.key.replace("Arrow", "").toLowerCase() as "up" | "down" | "left" | "right";
        optsRef.current.onArrow(dir);
        return;
      }
    }, []
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (optsRef.current.paused || optsRef.current.disabled) return;
      const target = e.target as HTMLTextAreaElement;
      const val = target.value;
      target.value = "";
      const printable = [...val].filter((c) => c >= " ").join("");
      if (printable) {
        initAudio();
        optsRef.current.onChar(printable);
      }
    }, []
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      if (optsRef.current.disabled || optsRef.current.paused) return;
      const raw = e.clipboardData.getData("text");
      if (!raw) return;
      const printable = [...raw].filter((c) => c >= " ").join("");
      if (printable) optsRef.current.onChar(printable);
    }, []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      focus();
    }, [focus]
  );

  return { ghostRef, focus, handleKeyDown, handleInput, handlePaste, handleMouseDown };
}