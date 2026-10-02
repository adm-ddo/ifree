import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import ApiKeysManager from "./ApiKeysManager";

/** Gerenciamento de chaves de API externa (ver prisma/schema.prisma
 * ApiKeyExterna e src/lib/api-externa/auth.ts) — só v2, feature nova, sem
 * espelho em v1 (ver feedback_v1_congelado_100_v2 nas memórias). */
export default async function ApiExternaPage() {
  const sessao = await requireModulo("configuracoes");

  const chaves = await prisma.apiKeyExterna.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nome: true,
      prefixo: true,
      escopos: true,
      criadoEm: true,
      ultimoUsoEm: true,
      revogadaEm: true,
    },
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">Integração via API</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Gere uma chave pra outro sistema (ex.: seu financeiro) consultar o saldo Pix e os pagamentos
            feitos pelo iFREE, sem precisar logar no painel.
          </p>
        </div>
        <Link
          href="/manual/api-externa"
          target="_blank"
          className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0 whitespace-nowrap"
        >
          📄 Ver manual / baixar PDF
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col gap-3 text-sm">
        <h2 className="font-bold text-navy-900">Como usar</h2>
        <p className="text-stone-600">
          Gere uma chave abaixo e mande pra quem for integrar. Toda chamada precisa do cabeçalho{" "}
          <code className="bg-stone-100 rounded px-1 py-0.5 text-xs">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
        <div className="flex flex-col gap-2 rounded-xl bg-stone-50 border border-stone-200 p-3 font-mono text-xs overflow-x-auto">
          <div>
            <span className="text-stone-400">GET</span> https://ifree.app.br/api/v1/financeiro/saldo
          </div>
          <div>
            <span className="text-stone-400">GET</span> https://ifree.app.br/api/v1/financeiro/pagamentos?inicio=2026-09-01&amp;fim=2026-09-30
          </div>
        </div>
        <p className="text-stone-500 text-xs">
          <strong>/saldo</strong> devolve o saldo Pix atual da conta (consulta ao vivo na Asaas).{" "}
          <strong>/pagamentos</strong> lista os Pix efetivamente pagos no período (<code>inicio</code>/<code>fim</code>{" "}
          no formato AAAA-MM-DD, os dois obrigatórios).
        </p>
      </div>

      <ApiKeysManager chaves={chaves} />
    </div>
  );
}
