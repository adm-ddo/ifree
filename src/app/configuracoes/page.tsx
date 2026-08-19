import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { TERMOS_CONTRATO_PADRAO_TEXTO } from "@/lib/termos";
import ConfiguracoesForm from "./ConfiguracoesForm";
import TermosForm from "./TermosForm";
import PausaForm from "./PausaForm";
import DiariaForm from "./DiariaForm";
import HorarioFechamentoForm from "./HorarioFechamentoForm";
import SemanaPagamentoForm from "./SemanaPagamentoForm";

export default async function ConfiguracoesPage() {
  const sessao = await requireTenant();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: {
      nome: true,
      cnpj: true,
      endereco: true,
      termosContrato: true,
      modoPausa: true,
      diariaLimiarMeiaMin: true,
      diariaLimiarCompletaMin: true,
      horarioFechamentoMin: true,
      semanaPagamentoInicioDia: true,
      semanaPagamentoDia: true,
    },
  });
  const personalizado = Boolean(empresa.termosContrato?.trim());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Configurações</h1>
        <p className="text-stone-600 mt-1 text-sm">Dados cadastrais da empresa.</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Outras empresas</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Cadastre outro CNPJ no seu login ou troque entre as empresas que
            você já tem.
          </p>
        </div>
        <Link
          href="/empresas"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 shrink-0"
        >
          🏢 Trocar / cadastrar empresa
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Totens</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gerencie os links de totem desta empresa.
          </p>
        </div>
        <Link
          href="/totens"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 shrink-0"
        >
          📱 Ver totens
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Equipe</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Crie logins separados (acesso total) pras suas empresas — pro
            financeiro, por exemplo.
          </p>
        </div>
        <Link
          href="/equipe"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 shrink-0"
        >
          👥 Gerenciar equipe
        </Link>
      </div>

      <ConfiguracoesForm nome={empresa.nome} cnpj={empresa.cnpj} endereco={empresa.endereco ?? ""} />

      <TermosForm
        textoInicial={empresa.termosContrato?.trim() || TERMOS_CONTRATO_PADRAO_TEXTO}
        personalizado={personalizado}
      />

      <PausaForm modoPausaAtual={empresa.modoPausa} />

      <DiariaForm
        limiarMeiaHoras={empresa.diariaLimiarMeiaMin / 60}
        limiarCompletaHoras={empresa.diariaLimiarCompletaMin / 60}
      />

      <HorarioFechamentoForm horarioFechamentoMin={empresa.horarioFechamentoMin} />

      <SemanaPagamentoForm
        inicioDiaAtual={empresa.semanaPagamentoInicioDia}
        diaPagamentoAtual={empresa.semanaPagamentoDia}
      />
    </div>
  );
}
