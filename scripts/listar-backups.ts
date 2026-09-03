import "dotenv/config";
import { list } from "@vercel/blob";

/** Lista os backups disponíveis no Blob, mais recente primeiro — usado
 * pra escolher qual arquivo passar pra scripts/restaurar-backup.ts.
 * Rodar com: npx tsx scripts/listar-backups.ts */
async function main() {
  const { blobs } = await list({ prefix: "backups/" });
  const ordenados = blobs.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  if (ordenados.length === 0) {
    console.log("Nenhum backup encontrado ainda.");
    return;
  }

  for (const b of ordenados) {
    const tamanhoKb = (b.size / 1024).toFixed(1);
    console.log(`${b.uploadedAt.toISOString()}  ${tamanhoKb.padStart(8)}KB  ${b.url}`);
  }
  console.log(`\n${ordenados.length} backup(s). Pra restaurar o mais recente:`);
  console.log(`npx tsx scripts/restaurar-backup.ts "${ordenados[0].url}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
