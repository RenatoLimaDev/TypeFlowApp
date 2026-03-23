import { Cursor } from "./Cursor";

interface CardLineProps {
  tag: string;
  text: string;
  placeholder?: string;
  showCursor?: boolean;
  dimmed?: boolean;
  hidden?: boolean;
  tagColor?: string;
  textColor?: string;
}

function renderWithTags(text: string) {
  const parts = text.split(/(#[a-záàâãéèêíïóôõöúçñ\w]+)/gi);
  return parts.map((part, i) =>
    /^#[^\s]+$/i.test(part) ? (
      <span key={i} className="text-pink-400 opacity-90">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CardLine({
  tag, text, placeholder, showCursor = false,
  hidden = false, dimmed = false,
}: CardLineProps) {
  if (hidden) return null;

  return (
    <div className={`flex items-baseline gap-2 min-h-[22px] relative transition-opacity duration-150 ${dimmed ? "opacity-30 pointer-events-none" : ""}`}>
      <span className="font-mono text-[8px] tracking-widest uppercase w-6 text-right flex-shrink-0 leading-[1.6] select-none">
        {tag}
      </span>
      <span className="font-mono text-[13px] leading-[1.6] tracking-[0.01em] whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">
        {renderWithTags(text)}
        {showCursor && <Cursor />}
      </span>
      {placeholder && !text && (
        <span className="font-sans text-[13px] leading-[1.6] absolute left-10 pointer-events-none whitespace-nowrap overflow-hidden text-white/20">
          {placeholder}
        </span>
      )}
    </div>
  );
}
