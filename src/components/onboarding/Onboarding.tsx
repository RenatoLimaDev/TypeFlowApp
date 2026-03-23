import { useEffect, useState } from "react";

const HINTS = [
  { key: "enter",      desc: "next line"    },
  { key: "ctrl+enter", desc: "save session" },
  { key: "ctrl+alt+v", desc: "sessions"     },
];

interface OnboardingProps {
  onDismiss: () => void;
}

export function Onboarding({ onDismiss }: OnboardingProps) {
  const [hiding, setHiding] = useState(false);

  const dismiss = () => {
    if (hiding) return;
    setHiding(true);
    setTimeout(onDismiss, 180);
  };

  useEffect(() => {
    document.addEventListener("keydown", dismiss, { once: true });
    document.addEventListener("mousedown", dismiss, { once: true });
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("mousedown", dismiss);
    };
  }, []);

  return (
    <div
      className={`transition-all duration-180 ${hiding ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0 animate-fadeIn"}`}
      style={{
        background: "rgba(13,13,19,0.96)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "10px 16px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
      }}
    >
      {HINTS.map(({ key, desc }) => (
        <div key={key} className="flex items-center gap-3 py-[4px]">
          <span
            className="font-mono text-[9px] text-right flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.30)", width: 76 }}
          >
            {key}
          </span>
          <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.14)" }}>
            {desc}
          </span>
        </div>
      ))}
    </div>
  );
}
