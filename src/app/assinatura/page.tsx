import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { valorMensalidadeEfetivo } from "@/lib/assinatura";
import DashboardAutoRefresh from "@/app/dashboard/DashboardAutoRefresh";
import GerarPixForm from "./GerarPixForm";
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
    select: { nome: true, statusAssinatura: true, assinaturaVenceEm: true, valorMensalidade: true },
  });

  const cobrancaPendente = await prisma.cobrancaMensalidade.findFirst({
    where: {
      empresaId: sessao.empresaEfetivoId,
      status: "PENDENTE",
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: "desc" },
    select: { qrCode: true, qrCodeImagemUrl: true, expiraEm: true },
  });

  const valor = valorMensalidadeEfetivo(
    empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null
  );
  const bloqueado = empresa.statusAssinatura === "ATRASADA" || empresa.statusAssinatura === "CANCELADA";

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        {bloqueado && <DashboardAutoRefresh intervaloMs={5000} />}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy-900">Assinatura</h1>
            <p className="text-sm text-stone-500 mt-0.5">{empresa.nome}</p>
          </div>
          <span
            className={`text-xs rounded-full border px-3 py-1.5 shrink-0 ${STATUS_CLASSE[empresa.statusAssinatura]}`}
          >
            {STATUS_LABEL[empresa.statusAssinatura]}
          </span>
        </div>

        {bloqueado && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            O painel está bloqueado por falta de pagamento. O totem continua
            funcionando normalmente — gere o PIX abaixo pra liberar o painel
            de novo, na hora que o pagamento cair.
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
          cobrancaInicial={
            cobrancaPendente?.qrCode
              ? {
                  qrCode: cobrancaPendente.qrCode,
                  qrCodeImagemUrl: cobrancaPendente.qrCodeImagemUrl,
                  expiraEm: cobrancaPendente.expiraEm.toISOString(),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
