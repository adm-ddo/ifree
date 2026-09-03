import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { usuarioEhResponsavelEtica } from "@/lib/etica";
import { TERMOS_CONTRATO_PADRAO_TEXTO } from "@/lib/termos";
import ConfiguracoesForm from "./ConfiguracoesForm";
import TermosForm from "./TermosForm";
import PausaForm from "./PausaForm";
import IntervaloCltForm from "./IntervaloCltForm";
import EscalaHorarioCltForm from "./EscalaHorarioCltForm";
import DiariaForm from "./DiariaForm";
import HorarioFechamentoForm from "./HorarioFechamentoForm";
import SemanaPagamentoForm from "./SemanaPagamentoForm";
import SlaEticaForm from "./SlaEticaForm";
import LimparTurnosTesteForm from "./LimparTurnosTesteForm";

export default async function ConfiguracoesPage() {
  const sessao = await requireTenant();
  const [empresa, responsavelEtica] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
        nome: true,
        cnpj: true,
        endereco: true,
        termosContrato: true,
        modoPausaDia: true,
        modoPausaNoite: true,
        diariaLimiarMeiaMin: true,
        diariaLimiarCompletaMin: true,
        horarioInicioDiaMin: true,
        horarioInicioNoiteMin: true,
        horarioFechamentoDiaMin: true,
        horarioFechamentoNoiteMin: true,
        semanaPagamentoInicioDia: true,
        semanaPagamentoDia: true,
        funcionariosBaterIntervalo: true,
        horarioEntrada5x2Min: true,
        horarioSaida5x2Min: true,
        horarioEntrada5x2NoiteMin: true,
        horarioSaida5x2NoiteMin: true,
        horarioEntrada6x1Min: true,
        horarioSaida6x1Min: true,
        horarioEntrada6x1NoiteMin: true,
        horarioSaida6x1NoiteMin: true,
        horarioEntrada12x36Min: true,
        horarioSaida12x36Min: true,
        horarioEntrada12x36NoiteMin: true,
        horarioSaida12x36NoiteMin: true,
        slaDenunciaDias: true,
      },
    }),
    usuarioEhResponsavelEtica(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster),
  ]);
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

      {responsavelEtica && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy-900">Central de Ética</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Canal de denúncias (NR-1) — link público, painel e casos.
            </p>
          </div>
          <Link
            href="/etica"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 shrink-0"
          >
            ⚖️ Abrir Central de Ética
          </Link>
        </div>
      )}

      <ConfiguracoesForm nome={empresa.nome} cnpj={empresa.cnpj} endereco={empresa.endereco ?? ""} />

      <TermosForm
        textoInicial={empresa.termosContrato?.trim() || TERMOS_CONTRATO_PADRAO_TEXTO}
        personalizado={personalizado}
      />

      <PausaForm
        modoPausaDiaAtual={empresa.modoPausaDia}
        modoPausaNoiteAtual={empresa.modoPausaNoite}
      />

      <IntervaloCltForm funcionariosBaterIntervaloAtual={empresa.funcionariosBaterIntervalo} />

      <EscalaHorarioCltForm
        cincoXDois={{ entrada: empresa.horarioEntrada5x2Min, saida: empresa.horarioSaida5x2Min }}
        cincoXDoisNoite={{ entrada: empresa.horarioEntrada5x2NoiteMin, saida: empresa.horarioSaida5x2NoiteMin }}
        seisXUm={{ entrada: empresa.horarioEntrada6x1Min, saida: empresa.horarioSaida6x1Min }}
        seisXUmNoite={{ entrada: empresa.horarioEntrada6x1NoiteMin, saida: empresa.horarioSaida6x1NoiteMin }}
        dozeXTrintaSeis={{ entrada: empresa.horarioEntrada12x36Min, saida: empresa.horarioSaida12x36Min }}
        dozeXTrintaSeisNoite={{
          entrada: empresa.horarioEntrada12x36NoiteMin,
          saida: empresa.horarioSaida12x36NoiteMin,
        }}
      />

      <DiariaForm
        limiarMeiaHoras={empresa.diariaLimiarMeiaMin / 60}
        limiarCompletaHoras={empresa.diariaLimiarCompletaMin / 60}
      />

      <HorarioFechamentoForm
        horarioInicioDiaMin={empresa.horarioInicioDiaMin}
        horarioInicioNoiteMin={empresa.horarioInicioNoiteMin}
        horarioFechamentoDiaMin={empresa.horarioFechamentoDiaMin}
        horarioFechamentoNoiteMin={empresa.horarioFechamentoNoiteMin}
      />

      <SemanaPagamentoForm
        inicioDiaAtual={empresa.semanaPagamentoInicioDia}
        diaPagamentoAtual={empresa.semanaPagamentoDia}
      />

      {responsavelEtica && <SlaEticaForm slaDenunciaDiasAtual={empresa.slaDenunciaDias} />}

      <LimparTurnosTesteForm />
    </div>
  );
}
