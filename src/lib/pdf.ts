import type { Session, ExportTheme } from "@/types";
import { groupByTopic, stripTags } from "./utils";
import jsPDF from "jspdf";

export function buildPdfDocument(session: Session, theme: ExportTheme): jsPDF {
  const isInk = theme === "ink";

  const bg   = isInk ? [255, 255, 255] : [14, 15, 20];
  const fg   = isInk ? [17, 17, 17]    : [240, 242, 247];
  const muted = isInk ? [180, 180, 180] : [100, 100, 100];
  const accent = isInk ? [100, 100, 100] : [125, 211, 252];
  const tag  = isInk ? [80, 80, 80]    : [244, 114, 182];
  const divider = isInk ? [220, 220, 220] : [40, 42, 55];

  const doc = new jsPDF({ format: "a4", unit: "mm" });

  // Background
  doc.setFillColor(bg[0], bg[1], bg[2]);
  doc.rect(0, 0, 210, 297, "F");

  const LEFT = 16;
  const TAG_W = 46;
  const CONTENT_X = LEFT + TAG_W + 6;
  const CONTENT_W = 210 - CONTENT_X - 16;
  let y = 18;

  // Eyebrow
  doc.setFontSize(7);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text("STUDY NOTES", LEFT, y);
  y += 7;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(fg[0], fg[1], fg[2]);
  const titleLines = doc.splitTextToSize(session.title, 178);
  doc.text(titleLines, LEFT, y);
  y += titleLines.length * 8 + 2;

  // Date
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(session.date, LEFT, y);
  y += 5;

  // Header divider
  doc.setDrawColor(isInk ? 17 : 255, isInk ? 17 : 255, isInk ? 17 : 255);
  doc.setLineWidth(isInk ? 0.5 : 0.2);
  doc.line(LEFT, y, 194, y);
  y += 7;

  const groups = groupByTopic(session.lines);

  for (const group of groups) {
    const tagLabel = group.tag ? group.tag.replace(/^#/, "").toUpperCase() : "";
    const rowStartY = y;

    // Content lines
    doc.setFontSize(11);
    doc.setTextColor(fg[0], fg[1], fg[2]);
    let contentY = y;
    for (const line of group.lines) {
      const content = group.tag ? stripTags(line.content) : line.content;
      const wrapped = doc.splitTextToSize(`\u2014 ${content}`, CONTENT_W);
      doc.text(wrapped, CONTENT_X, contentY);
      contentY += wrapped.length * 5.5;
    }

    // Tag (left column, vertically centered)
    if (tagLabel) {
      const colH = contentY - rowStartY;
      doc.setFontSize(8);
      doc.setTextColor(tag[0], tag[1], tag[2]);
      const tagLines = doc.splitTextToSize(tagLabel, TAG_W);
      const tagY = rowStartY + (colH - tagLines.length * 4) / 2;
      doc.text(tagLines, LEFT, tagY);
    }

    y = contentY + 3;

    // Row divider
    doc.setDrawColor(divider[0], divider[1], divider[2]);
    doc.setLineWidth(0.15);
    doc.line(LEFT, y, 194, y);
    y += 5;

    // Page break
    if (y > 272) {
      doc.addPage();
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, 210, 297, "F");
      y = 20;
    }
  }

  // Footer divider
  if (y < 275) {
    doc.setDrawColor(isInk ? 17 : 255, isInk ? 17 : 255, isInk ? 17 : 255);
    doc.setLineWidth(isInk ? 0.5 : 0.2);
    doc.line(LEFT, 282, 194, 282);

    doc.setFontSize(7);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text("typeflow", LEFT, 287);

    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(session.date, 194, 287, { align: "right" });
  }

  return doc;
}
