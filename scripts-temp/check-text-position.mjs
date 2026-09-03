import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";

const mm = (v) => v * 2.834645669291339;

async function checar(file, pageWidthMm, pares) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const expectedCenter = mm(pageWidthMm) / 2;

  console.log("===", file, "===");
  for (const needle of pares) {
    const it = content.items.find((i) => i.str === needle);
    if (!it) {
      console.log("NAO ENCONTRADO:", needle);
      continue;
    }
    const x = it.transform[4];
    const w = it.width;
    const center = x + w / 2;
    const desvioMm = (center - expectedCenter) / 2.834645669291339;
    console.log(needle);
    console.log("  centro=", center.toFixed(1), "pt | esperado=", expectedCenter.toFixed(1), "pt | desvio=", desvioMm.toFixed(2), "mm");
  }
}

await checar("public/brand/moldura/moldura-tablet-A4.pdf", 297, [
  "INICIE O TURNO DEVIDAMENTE TRAJADO",
  "ENCERRE O TURNO COM O MESMO TRAJE QUE INICIOU",
]);
await checar("public/brand/moldura/moldura-tablet-A3.pdf", 420, [
  "INICIE O TURNO DEVIDAMENTE TRAJADO",
  "ENCERRE O TURNO COM O MESMO TRAJE QUE INICIOU",
]);
