import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { LABEL_CATEGORIA_DENUNCIA, LABEL_STATUS_DENUNCIA } from "@/lib/etica";
import { formatarDataHora } from "@/lib/data";

export default async function MinhasDenunciasPage() {
  const sessao = await requirePessoaComTermosAceitos();

  const denuncias = await prisma.denuncia.findMany({
    where: { pessoaId: sessao.pessoaId, identificado: true },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      protocolo: true,
      categoria: true,
      status: true,
      criadoEm: true,
      empresa: { select: { nome: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Canal de Ética</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Suas denúncias identificadas. Denúncias anônimas (mesmo as
            feitas por aqui) não aparecem nesta lista — acompanhe pelo
            protocolo e senha recebidos na hora.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/portal/denuncias/acompanhar"
            className="rounded-lg border border-stone-300 text-sm font-medium px-4 py-2.5 hover:bg-stone-50 transition-colors"
          >
            🔍 Acompanhar anônima
          </Link>
          <Link
            href="/portal/denuncias/nova"
            className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            📢 Nova denúncia
          </Link>
        </div>
      </div>

      {denuncias.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma denúncia identificada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {denuncias.map((d) => (
            <li key={d.id}>
              <Link
                href={`/portal/denuncias/${d.id}`}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 hover:border-brand-300 transition-colors"
              >
                <div>
                  <p className="font-medium text-navy-900">
                    {d.protocolo.slice(0, 4)}-{d.protocolo.slice(4)} · {LABEL_CATEGORIA_DENUNCIA[d.categoria]}
                  </p>
                  <p className="text-xs text-stone-500">
                    {d.empresa.nome} · {formatarDataHora(d.criadoEm)}
                  </p>
                </div>
                <span className="rounded-full border border-stone-200 bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-0.5">
                  {LABEL_STATUS_DENUNCIA[d.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
