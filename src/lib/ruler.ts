let rulerEl: HTMLSpanElement | null = null;

function getRuler(): HTMLSpanElement {
  if (!rulerEl) {
    rulerEl = document.createElement("span");
    rulerEl.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;visibility:hidden;" +
      "pointer-events:none;white-space:pre;" +
      'font-family:"JetBrains Mono","Fira Code","Cascadia Code","Courier New",monospace;' +
      "font-size:13.5px;letter-spacing:0.01em";
    document.body.appendChild(rulerEl);
  }
  return rulerEl;
}

export function measureText(text: string): number {
  const el = getRuler();
  el.textContent = text;
  return el.getBoundingClientRect().width;
}

export function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";

  for (const ch of text) {
    const test = current + ch;
    if (measureText(test) > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  lines.push(current);
  return lines;
}
