import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { usuarioEhResponsavelEtica } from "@/lib/etica";
import { TERMOS_CONTRATO_PADRAO_TEXTO } from "@/lib/termos";
import ConfiguracoesForm from "@/app/configuracoes/ConfiguracoesForm";
import TermosForm from "@/app/configuracoes/TermosForm";
import PausaForm from "@/app/configuracoes/PausaForm";
import IntervaloCltForm from "@/app/configuracoes/IntervaloCltForm";
import EscalaHorarioCltForm from "@/app/configuracoes/EscalaHorarioCltForm";
import DiariaForm from "@/app/configuracoes/DiariaForm";
import HorarioFechamentoForm from "@/app/configuracoes/HorarioFechamentoForm";
import SemanaPagamentoForm from "@/app/configuracoes/SemanaPagamentoForm";
import SlaEticaForm from "@/app/configuracoes/SlaEticaForm";
import LimparTurnosTesteForm from "@/app/configuracoes/LimparTurnosTesteForm";
import ContaAsaasForm from "@/app/configuracoes/ContaAsaasForm";
import AlertaSaldoBaixoForm from "@/app/configuracoes/AlertaSaldoBaixoForm";
import AssinaturaConfigFormV2 from "@/components/v2/AssinaturaConfigFormV2";
import { verificarStatusAsaas } from "@/lib/pagamentos/asaas-conta-status";
import { diasParaVencer } from "@/lib/assinatura";

/** Espelho completo de src/app/configuracoes/page.tsx (v1, não tocado) —
 * mesma query; TODOS os formulários são reaproveitados direto (nenhum
 * tem chrome do v1). Todas as rotas hardcoded já apontam pro /v2 (Totens,
 * Equipe, Empresas, Central de Ética) — só os 2 links "Pagamentos" dentro
 * do guia do ContaAsaasForm continuam de propósito no v1, ponteiros de
 * texto dentro de um componente reaproveitado, não vale duplicar 669
 * linhas do ContaAsaasForm só por isso. AssinaturaConfigFormV2 é cópia do
 * AssinaturaConfigForm do v1 só pelo link de "regularizar agora" apontar
 * pro /v2/assinatura. */
export default async function V2ConfiguracoesPage() {
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
        alertaSaldoBaixoAtivo: true,
        alertaSaldoBaixoValorMinimo: true,
      },
    }),
    usuarioEhResponsavelEtica(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster),
    prisma.contaAsaasEmpresa.findUnique({
      where: { empresaId: sessao.empresaEfetivoId },
      select: { status: true, criadoEm: true, desconectadoEm: true },
    }),
    verificarStatusAsaas(sessao.empresaEfetivoId),
  ]);
  const personalizado = Boolean(empresa.termosContrato?.trim());

  const diaVencimento = empresa.assinaturaVenceEm
    ? Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(empresa.assinaturaVenceEm))
    : null;
  const diasRestantesAssinatura = empresa.assinaturaVenceEm ? diasParaVencer(empresa.assinaturaVenceEm) : null;
  const vencimentoLabel = empresa.assinaturaVenceEm
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(empresa.assinaturaVenceEm)
    : null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Configurações</h1>
        <p className="text-stone-500 text-sm mt-0.5">Dados cadastrais da empresa.</p>
      </div>

      <AssinaturaConfigFormV2
        statusAssinatura={empresa.statusAssinatura}
        diaVencimento={diaVencimento}
        diasRestantes={diasRestantesAssinatura}
        vencimentoLabel={vencimentoLabel}
        avisoVencimentoDiasAtual={empresa.avisoVencimentoDias}
      />

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy-900 text-sm">Outras empresas</h2>
          <p className="text-xs text-stone-500 mt-0.5">Cadastre outro CNPJ no seu login ou troque entre as empresas que você já tem.</p>
        </div>
        <Link href="/v2/empresas" className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0">
          🏢 Trocar / cadastrar empresa
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy-900 text-sm">Totens</h2>
          <p className="text-xs text-stone-500 mt-0.5">Gerencie os links de totem desta empresa.</p>
        </div>
        <Link href="/v2/totens" className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0">
          📱 Ver totens
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy-900 text-sm">Equipe</h2>
          <p className="text-xs text-stone-500 mt-0.5">Convide gente pra esta empresa com só os módulos que você marcar — pro financeiro, por exemplo.</p>
        </div>
        <Link href="/v2/equipe" className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0">
          👥 Gerenciar equipe
        </Link>
      </div>

      {responsavelEtica && (
        <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900 text-sm">Central de Ética</h2>
            <p className="text-xs text-stone-500 mt-0.5">Canal de denúncias (NR-1) — link público, painel e casos.</p>
          </div>
          <Link href="/v2/etica" className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0">
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

      <TermosForm textoInicial={empresa.termosContrato?.trim() || TERMOS_CONTRATO_PADRAO_TEXTO} personalizado={personalizado} />

      <PausaForm modoPausaDiaAtual={empresa.modoPausaDia} modoPausaNoiteAtual={empresa.modoPausaNoite} />

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
        dozeXTrintaSeisNoite={{ entrada: empresa.horarioEntrada12x36NoiteMin, saida: empresa.horarioSaida12x36NoiteMin }}
      />

      <DiariaForm limiarMeiaHoras={empresa.diariaLimiarMeiaMin / 60} limiarCompletaHoras={empresa.diariaLimiarCompletaMin / 60} />

      <HorarioFechamentoForm
        horarioInicioDiaMin={empresa.horarioInicioDiaMin}
        horarioInicioNoiteMin={empresa.horarioInicioNoiteMin}
        horarioFechamentoDiaMin={empresa.horarioFechamentoDiaMin}
        horarioFechamentoNoiteMin={empresa.horarioFechamentoNoiteMin}
      />

      <SemanaPagamentoForm inicioDiaAtual={empresa.semanaPagamentoInicioDia} diaPagamentoAtual={empresa.semanaPagamentoDia} />

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

      <AlertaSaldoBaixoForm
        ativoAtual={empresa.alertaSaldoBaixoAtivo}
        valorMinimoAtual={
          empresa.alertaSaldoBaixoValorMinimo !== null ? Number(empresa.alertaSaldoBaixoValorMinimo) : null
        }
      />

      <LimparTurnosTesteForm />
    </div>
  );
}
