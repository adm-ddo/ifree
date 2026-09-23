import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  valorMensalidadeEfetivo,
  podeUsarLiberacaoConfianca,
  proximaLiberacaoConfiancaEm,
} from "@/lib/assinatura";
import AutoRefresh from "@/components/AutoRefresh";
import GerarPixForm from "@/app/assinatura/GerarPixForm";
import LiberacaoConfiancaButton from "@/app/assinatura/LiberacaoConfiancaButton";
import { entrarMesmoBloqueado } from "@/app/assinatura/actions";
import type { StatusAssinatura } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: "Em teste grátis",
  ATIVA: "Em dia",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSE: Record<StatusAssinatura, string> = {
  TRIAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ATIVA: "bg-brand-50 text-brand-700 border-brand-200",
  ATRASADA: "bg-red-50 text-red-700 border-red-200",
  CANCELADA: "bg-stone-100 text-stone-600 border-stone-200",
};

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

/** Espelho completo de src/app/assinatura/page.tsx (v1, não tocado) —
 * mesma regra (funciona como bloqueio E como consulta normal, por isso
 * requireSessao em vez de requireTenant), reaproveitando GerarPixForm e
 * LiberacaoConfiancaButton direto (nenhum tem link pro v1). Única
 * diferença: sem empresa ativa, manda pro /v2/empresas em vez de
 * /empresas. */
export default async function V2AssinaturaPage() {
  const sessao = await requireSessao();
  if (sessao.empresaEfetivoId === null) {
    redirect(sessao.isMaster ? "/master" : "/v2/empresas");
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: {
      nome: true,
      statusAssinatura: true,
      assinaturaVenceEm: true,
      valorMensalidade: true,
      liberacaoConfiancaUsadaEm: true,
      liberacaoConfiancaAteEm: true,
    },
  });

  const ultimaCobranca = await prisma.cobrancaMensalidade.findFirst({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { criadoEm: "desc" },
    select: { idTransacaoExterna: true, status: true, qrCode: true, qrCodeImagemUrl: true, expiraEm: true },
  });
  const cobrancaPendente =
    ultimaCobranca?.status === "PENDENTE" &&
    ultimaCobranca.qrCode &&
    ultimaCobranca.idTransacaoExterna &&
    ultimaCobranca.expiraEm > new Date()
      ? ultimaCobranca
      : null;

  const valor = valorMensalidadeEfetivo(
    empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null
  );
  const bloqueado = empresa.statusAssinatura === "ATRASADA" || empresa.statusAssinatura === "CANCELADA";
  const liberadoPorConfianca = !!empresa.liberacaoConfiancaAteEm && empresa.liberacaoConfiancaAteEm > new Date();
  const bloqueadoDeVerdade = bloqueado && !liberadoPorConfianca;

  return (
    <div className="flex flex-1 items-center justify-center py-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        {bloqueado && <AutoRefresh intervaloMs={5000} />}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-navy-900">Assinatura</h1>
            <p className="text-sm text-stone-500 mt-0.5">{empresa.nome}</p>
          </div>
          <span
            className={`text-xs rounded-full border px-3 py-1.5 shrink-0 ${
              liberadoPorConfianca
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : STATUS_CLASSE[empresa.statusAssinatura]
            }`}
          >
            {liberadoPorConfianca ? "Liberado por confiança" : STATUS_LABEL[empresa.statusAssinatura]}
          </span>
        </div>

        {liberadoPorConfianca && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            🔓 Liberado por confiança até {formatarDataHora(empresa.liberacaoConfiancaAteEm!)} — pague
            antes disso pra não bloquear de novo (essa liberação já foi usada e não se repete).
          </div>
        )}

        {bloqueadoDeVerdade && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            O painel está bloqueado por falta de pagamento. O totem continua
            funcionando normalmente — gere o PIX abaixo pra liberar o painel
            de novo, na hora que o pagamento cair.
          </div>
        )}

        {bloqueadoDeVerdade && sessao.isMaster && (
          <form action={entrarMesmoBloqueado.bind(null, sessao.empresaEfetivoId)}>
            <button
              type="submit"
              className="w-full rounded-lg border border-navy-300 text-navy-800 text-sm font-medium py-2.5 hover:bg-navy-50 transition-colors"
            >
              🔑 Entrar mesmo assim (acesso master)
            </button>
          </form>
        )}

        {bloqueadoDeVerdade && podeUsarLiberacaoConfianca(empresa.liberacaoConfiancaUsadaEm) && (
          <LiberacaoConfiancaButton empresaId={sessao.empresaEfetivoId} />
        )}

        {bloqueadoDeVerdade && !podeUsarLiberacaoConfianca(empresa.liberacaoConfiancaUsadaEm) && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            Você já usou sua liberação de confiança em{" "}
            {formatarDataHora(empresa.liberacaoConfiancaUsadaEm!)} — pode usar de novo a partir de{" "}
            {formatarDataHora(proximaLiberacaoConfiancaEm(empresa.liberacaoConfiancaUsadaEm)!)} (1x por
            mês). Até lá, só libera pagando.
          </div>
        )}

        <div className="text-sm text-stone-600 flex flex-col gap-1">
          {empresa.statusAssinatura === "TRIAL" && empresa.assinaturaVenceEm && (
            <p>Período de teste grátis até {formatarData(empresa.assinaturaVenceEm)}.</p>
          )}
          {empresa.statusAssinatura === "ATIVA" && empresa.assinaturaVenceEm && (
            <p>Próximo vencimento: {formatarData(empresa.assinaturaVenceEm)}.</p>
          )}
          <p className="font-medium text-navy-900">Mensalidade: R$ {valor.toFixed(2)}</p>
        </div>

        <GerarPixForm
          empresaId={sessao.empresaEfetivoId}
          proximoVencimentoLabel={empresa.assinaturaVenceEm ? formatarData(empresa.assinaturaVenceEm) : null}
          cobrancaInicial={
            cobrancaPendente
              ? {
                  idTransacaoExterna: cobrancaPendente.idTransacaoExterna!,
                  qrCode: cobrancaPendente.qrCode!,
                  qrCodeImagemUrl: cobrancaPendente.qrCodeImagemUrl,
                  expiraEm: cobrancaPendente.expiraEm.toISOString(),
                }
              : null
          }
          ultimaCobranca={
            ultimaCobranca
              ? { idTransacaoExterna: ultimaCobranca.idTransacaoExterna, status: ultimaCobranca.status }
              : null
          }
        />
      </div>
    </div>
  );
}
