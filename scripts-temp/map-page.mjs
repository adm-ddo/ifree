import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";

const toMm = (pt) => pt / 2.834645669291339;

const file = process.argv[2] || "public/brand/moldura/moldura-tablet-A4.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const [, , , pageHeightPt] = page.view;
const content = await page.getTextContent();

const rows = content.items
  .filter((it) => it.str.trim())
  .map((it) => ({
    y: toMm(pageHeightPt - it.transform[5]).toFixed(2),
    str: it.str.slice(0, 45),
  }))
  .sort((a, b) => parseFloat(a.y) - parseFloat(b.y));

for (const r of rows) console.log(r.y.padStart(6), "mm |", r.str);
console.log("---");
console.log("altura da pagina:", toMm(pageHeightPt).toFixed(1), "mm");
