import { useEffect, useState } from "react";

const SHORTCUTS = [
  { key: "Ctrl + Alt + N", desc: "show / hide" },
  { key: "Ctrl + Alt + S", desc: "sound on / off" },
  { key: "Ctrl + Alt + V", desc: "view sessions" },
  { key: "Ctrl + Alt + C", desc: "click-through" },
  { key: "Enter",          desc: "next line" },
  { key: "Ctrl + Enter",   desc: "finish session" },
  { key: "Esc",            desc: "close / back" },
  { key: "Ctrl + Z",       desc: "undo" },
];

interface OnboardingProps {
  onDismiss: () => void;
}

export function Onboarding({ onDismiss }: OnboardingProps) {
  const [hiding, setHiding] = useState(false);

  const dismiss = () => {
    if (hiding) return;
    setHiding(true);
    setTimeout(onDismiss, 240);
  };

  useEffect(() => {
    const handler = () => dismiss();
    document.addEventListener("keydown", handler, { once: true });
    document.addEventListener("mousedown", handler, { once: true });
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return (
    <div
      className={`
        font-mono bg-[rgba(10,11,16,0.98)] border border-accent/20 rounded-xl
        px-5 py-4 min-w-[280px]
        transition-all duration-[240ms]
        ${hiding ? "opacity-0 -translate-y-2 scale-[0.97]" : "opacity-100 translate-y-0 scale-100 animate-cardIn"}
      `}
    >
      <div className="text-[8.5px] tracking-[0.22em] uppercase text-accent/85 mb-3">
        typeflow
      </div>

      {SHORTCUTS.map(({ key, desc }) => (
        <div key={key} className="flex items-center gap-2.5 py-1 border-b border-white/[0.04] last:border-b-0">
          <span className="font-mono text-[8px] text-white/50 bg-white/[0.06] border border-white/10 rounded px-1.5 py-[2px] whitespace-nowrap min-w-[112px] text-center">
            {key}
          </span>
          <span className="text-[9.5px] text-white/30">{desc}</span>
        </div>
      ))}

      <div className="text-[8px] text-accent/85 mb-3 tracking-widest text-center mt-3 animate-[pulse_2.2s_ease-in-out_infinite]">
        type anything to dismiss
      </div>
    </div>
  );
}
