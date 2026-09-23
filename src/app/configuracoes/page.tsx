import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
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
import ContaAsaasForm from "./ContaAsaasForm";
import AssinaturaConfigForm from "./AssinaturaConfigForm";
import { verificarStatusAsaas } from "@/lib/pagamentos/asaas-conta-status";
import { diasParaVencer } from "@/lib/assinatura";

export default async function ConfiguracoesPage() {
  const sessao = await requireModulo("configuracoes");
  const [empresa, responsavelEtica, contaAsaas, statusAsaasLive] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
        nome: true,
        cnpj: true,
        email: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        cep: true,
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
        modoPausaCltDia: true,
        modoPausaCltNoite: true,
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
        statusAssinatura: true,
        assinaturaVenceEm: true,
        avisoVencimentoDias: true,
      },
    }),
    usuarioEhResponsavelEtica(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster),
    prisma.contaAsaasEmpresa.findUnique({
      where: { empresaId: sessao.empresaEfetivoId },
      select: { status: true, criadoEm: true, desconectadoEm: true },
    }),
    // Consulta ao vivo na Asaas (não o campo status acima, que só reflete
    // o momento da criação) — é o que decide qual passo do guia mostrar
    // como atual. null quando não há conta conectada ou a consulta falhou.
    verificarStatusAsaas(sessao.empresaEfetivoId),
  ]);
  const personalizado = Boolean(empresa.termosContrato?.trim());

  const diaVencimento = empresa.assinaturaVenceEm
    ? Number(
        new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(
          empresa.assinaturaVenceEm
        )
      )
    : null;
  const diasRestantesAssinatura = empresa.assinaturaVenceEm
    ? diasParaVencer(empresa.assinaturaVenceEm)
    : null;
  const vencimentoLabel = empresa.assinaturaVenceEm
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(
        empresa.assinaturaVenceEm
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Configurações</h1>
        <p className="text-stone-600 mt-1 text-sm">Dados cadastrais da empresa.</p>
      </div>

      <AssinaturaConfigForm
        statusAssinatura={empresa.statusAssinatura}
        diaVencimento={diaVencimento}
        diasRestantes={diasRestantesAssinatura}
        vencimentoLabel={vencimentoLabel}
        avisoVencimentoDiasAtual={empresa.avisoVencimentoDias}
      />

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
            Convide gente pra esta empresa com só os módulos que você marcar —
            pro financeiro, por exemplo.
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

      <ConfiguracoesForm
        nome={empresa.nome}
        cnpj={empresa.cnpj}
        email={empresa.email ?? ""}
        endereco={empresa.endereco ?? ""}
        numero={empresa.numero ?? ""}
        complemento={empresa.complemento ?? ""}
        bairro={empresa.bairro ?? ""}
        cidade={empresa.cidade ?? ""}
        cep={empresa.cep ?? ""}
      />

      <TermosForm
        textoInicial={empresa.termosContrato?.trim() || TERMOS_CONTRATO_PADRAO_TEXTO}
        personalizado={personalizado}
      />

      <PausaForm
        modoPausaDiaAtual={empresa.modoPausaDia}
        modoPausaNoiteAtual={empresa.modoPausaNoite}
      />

      <IntervaloCltForm
        funcionariosBaterIntervaloAtual={empresa.funcionariosBaterIntervalo}
        modoPausaCltDiaAtual={empresa.modoPausaCltDia}
        modoPausaCltNoiteAtual={empresa.modoPausaCltNoite}
      />

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

      <ContaAsaasForm
        contaAtual={contaAsaas}
        statusLive={statusAsaasLive}
        producao={(process.env.ASAAS_API_BASE_URL ?? "").includes("api.asaas.com")}
        dadosEmpresa={{
          email: empresa.email,
          cep: empresa.cep,
          endereco: empresa.endereco,
          bairro: empresa.bairro,
          numero: empresa.numero,
          complemento: empresa.complemento,
        }}
      />

      <LimparTurnosTesteForm />
    </div>
  );
}
