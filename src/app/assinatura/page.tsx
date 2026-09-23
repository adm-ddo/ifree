import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  valorMensalidadeEfetivo,
  podeUsarLiberacaoConfianca,
  proximaLiberacaoConfiancaEm,
  valorParcelaTabletPendente,
} from "@/lib/assinatura";
import AutoRefresh from "@/components/AutoRefresh";
import GerarPixForm from "./GerarPixForm";
import LiberacaoConfiancaButton from "./LiberacaoConfiancaButton";
import { entrarMesmoBloqueado } from "./actions";
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

/** Tela de assinatura — funciona tanto como página de bloqueio (quando
 * requireTenant redireciona pra cá por inadimplência) quanto como consulta
 * normal de "minha assinatura" a qualquer momento. Por isso usa
 * requireSessao, não requireTenant — senão o próprio bloqueio criaria um
 * loop de redirecionamento. */
export default async function AssinaturaPage() {
  const sessao = await requireSessao();
  if (sessao.empresaEfetivoId === null) {
    redirect(sessao.isMaster ? "/master" : "/empresas");
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
      tabletFornecido: true,
      tabletValorTotal: true,
      tabletParcelasTotal: true,
      tabletParcelasPagas: true,
    },
  });

  // Última cobrança de QUALQUER status (não só PENDENTE) — é o que permite
  // o GerarPixForm detectar "esse Pix específico acabou de ser confirmado"
  // comparando o idTransacaoExterna, em vez de só olhar se ainda existe
  // pendência (mesmo padrão de SaldoAsaasCard.tsx pro depósito dos extras).
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
  const valorTablet = valorParcelaTabletPendente({
    tabletFornecido: empresa.tabletFornecido,
    tabletValorTotal: empresa.tabletValorTotal !== null ? Number(empresa.tabletValorTotal) : null,
    tabletParcelasTotal: empresa.tabletParcelasTotal,
    tabletParcelasPagas: empresa.tabletParcelasPagas,
  });
  const bloqueado = empresa.statusAssinatura === "ATRASADA" || empresa.statusAssinatura === "CANCELADA";
  const liberadoPorConfianca = !!empresa.liberacaoConfiancaAteEm && empresa.liberacaoConfiancaAteEm > new Date();
  // Bloqueio "de verdade" depois de considerar a liberação de confiança —
  // é o que decide se mostra a caixa vermelha de bloqueio ou não. `bloqueado`
  // sozinho (baseado só em statusAssinatura) continua sendo o gatilho do
  // AutoRefresh, porque precisa continuar atualizando tanto pra detectar o
  // pagamento quanto pra detectar quando a janela de confiança expira.
  const bloqueadoDeVerdade = bloqueado && !liberadoPorConfianca;

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        {/* Atualiza sozinho enquanto bloqueado, esperando desbloquear.
         * Enquanto há QR mostrado (gerado agora ou reaproveitado de uma
         * visita anterior), quem cuida do próprio refresh é o
         * GerarPixForm — precisa ser lá, não aqui, porque "Gerar PIX" é
         * client-side e não re-renderiza este Server Component. */}
        {bloqueado && <AutoRefresh intervaloMs={5000} />}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy-900">Assinatura</h1>
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
          {valorTablet !== null ? (
            <>
              <p>Mensalidade: R$ {valor.toFixed(2)}</p>
              <p>
                Parcela do tablet ({empresa.tabletParcelasPagas + 1}/{empresa.tabletParcelasTotal}): R${" "}
                {valorTablet.toFixed(2)}
              </p>
              <p className="font-medium text-navy-900">
                Total a pagar: R$ {(valor + valorTablet).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="font-medium text-navy-900">Mensalidade: R$ {valor.toFixed(2)}</p>
          )}
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
