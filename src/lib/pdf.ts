import type { Session, ExportTheme } from "@/types";
import { groupByTopic, stripTags } from "./utils";

const PRINT_BASE = `
@page {
  margin: 0;
  size: A4;
}
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { width: 210mm; height: 297mm; }
`;

const INK_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Source+Serif+4:wght@300;400&family=DM+Mono:wght@400&display=swap');
${PRINT_BASE}
body {
  background: #fff;
  color: #111;
  padding: 14mm 16mm;
  font-size: 13px;
}
.hdr {
  border-bottom: 2px solid #111;
  padding-bottom: 12px;
  margin-bottom: 20px;
}
.eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: #aaa;
  margin-bottom: 5px;
}
.title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 26px;
  color: #0d0d0d;
  line-height: 1.15;
  font-style: italic;
}
.meta {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: #bbb;
  margin-top: 6px;
}
table { width: 100%; border-collapse: collapse; }
.tc {
  width: 150px;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #efefef;
  padding: 14px 14px 14px 0;
  vertical-align: top;
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 13.5px;
  color: #0d0d0d;
}
.tt {
  border-bottom: 1px solid #efefef;
  padding: 14px 0 14px 20px;
  vertical-align: top;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 13px;
  color: #222;
  line-height: 1.85;
  font-weight: 300;
}
tr:last-child .tc, tr:last-child .tt { border-bottom: none; }
.li { display: flex; gap: 10px; padding: 1px 0; line-height: 1.85; }
.bu { color: #ccc; flex-shrink: 0; }
.ftr {
  display: flex;
  justify-content: space-between;
  border-top: 2px solid #111;
  padding-top: 10px;
  margin-top: 20px;
}
.fb {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 12px;
  color: #0d0d0d;
}
.fd {
  font-family: 'DM Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .15em;
  color: #bbb;
  text-transform: uppercase;
}
`;

const NIGHT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=Space+Grotesk:wght@300;400&family=DM+Mono:wght@400;500&display=swap');
${PRINT_BASE}
body {
  background: #0e0f14;
  color: #f0f2f7;
  padding: 14mm 16mm;
  font-size: 13px;
}
.hdr {
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;
  margin-bottom: 20px;
}
.eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: rgba(125,211,252,0.6);
  margin-bottom: 5px;
}
.title {
  font-family: 'Syne', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #f0f2f7;
}
.meta {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  margin-top: 6px;
}
table { width: 100%; border-collapse: collapse; }
.tc {
  width: 150px;
  border-right: 1px solid rgba(255,255,255,0.07);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding: 14px 14px 14px 0;
  vertical-align: top;
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #f472b6;
}
.tt {
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding: 14px 0 14px 20px;
  vertical-align: top;
  font-family: 'Space Grotesk', monospace;
  font-size: 13px;
  color: rgba(240,242,247,0.85);
  line-height: 1.8;
  font-weight: 300;
}
tr:last-child .tc, tr:last-child .tt { border-bottom: none; }
.li { display: flex; gap: 10px; padding: 1px 0; line-height: 1.8; }
.bu { color: rgba(255,255,255,0.2); flex-shrink: 0; }
.ftr {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 10px;
  margin-top: 20px;
}
.fb {
  font-family: 'DM Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .2em;
  color: rgba(125,211,252,0.4);
  text-transform: uppercase;
}
.fd {
  font-family: 'DM Mono', monospace;
  font-size: 7.5px;
  letter-spacing: .12em;
  color: rgba(255,255,255,0.2);
  text-transform: uppercase;
}
`;

export function buildPdfHtml(session: Session, theme: ExportTheme): string {
  const groups = groupByTopic(session.lines);
  const isInk = theme === "ink";
  const css = isInk ? INK_CSS : NIGHT_CSS;

  const rows = groups
    .map((seg) => {
      const label = seg.tag
        ? seg.tag.replace(/^#/, "").replace(/\b\w/g, (c) => c.toUpperCase())
        : "";
      const cells = seg.lines
        .map((n) => `<div class="li"><span class="bu">—</span><span>${seg.tag ? stripTags(n.content) : n.content}</span></div>`)
        .join("");
      return `<tr><td class="tc">${label}</td><td class="tt">${cells}</td></tr>`;
    })
    .join("");

  const header = `
    <div class="hdr">
      <div class="eyebrow">Study Notes</div>
      <div class="title">${session.title}</div>
      <div class="meta">${session.date}</div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${session.title}</title>
  <style>${css}</style>
</head>
<body>
  ${header}
  <table><tbody>${rows}</tbody></table>
  <div class="ftr">
    <span class="fb">typeflow</span>
    <span class="fd">${session.date}</span>
  </div>
  <script>
    // Remove browser URL/date headers from print
    window.onload = () => {
      setTimeout(() => window.print(), 300);
    };
  <\/script>
</body>
</html>`;
}