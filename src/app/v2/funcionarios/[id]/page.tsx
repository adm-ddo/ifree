import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { formatarDataHoraComDiaSemana, formatarDataHora, formatarHora, dataISOBrasil } from "@/lib/data";
import { formatarCpf } from "@/lib/cpf";
import SalarioEscalaForm from "@/app/funcionarios/[id]/SalarioEscalaForm";
import BeneficiosForm from "@/app/funcionarios/[id]/BeneficiosForm";
import FeriasCard from "@/app/funcionarios/[id]/FeriasCard";
import ExperienciaCard from "@/app/funcionarios/[id]/ExperienciaCard";
import RescisaoCard from "@/app/funcionarios/[id]/RescisaoCard";
import DadosFuncionarioForm from "@/app/funcionarios/[id]/DadosFuncionarioForm";
import RegistroPontoHistorico from "@/app/funcionarios/[id]/RegistroPontoHistorico";
import ExtraDiarioForm from "@/app/funcionarios/[id]/ExtraDiarioForm";
import CriarTurnoManualForm from "@/app/funcionarios/[id]/CriarTurnoManualForm";
import ConverterVinculoButton from "@/components/ConverterVinculoButton";
import RestricaoHorarioForm from "@/components/RestricaoHorarioForm";
import AvatarPessoa from "@/components/AvatarPessoa";
import { converterParaExtra, atualizarRestricaoHorario } from "@/app/funcionarios/actions";
import { calcularStatusFerias, calcularFeriasEmAndamento } from "@/lib/ferias";
import { calcularStatusExperiencia } from "@/lib/experiencia";
import { STATUS_PENDENTES } from "@/lib/financeiro";
import PagamentosExtraPendentesCard from "@/app/funcionarios/[id]/PagamentosExtraPendentesCard";
import {
  horarioEsperadoClt,
  calcularDesvioPontoClt,
  saidaEsperadaClt,
  calcularSaldoDiarioClt,
  pausaAplicadaEm,
} from "@/lib/ponto";
import { paraDatetimeLocalBrasil } from "@/lib/data";

function formatarDataUTC(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Espelho completo de src/app/funcionarios/[id]/page.tsx (v1, não
 * tocado) — mesma query/regras; TODOS os sub-componentes (formulários,
 * cards) são reaproveitados direto, sem duplicar, porque nenhum deles
 * tem link hardcoded pro v1 (as duas únicas rotas hardcoded na árvore
 * inteira são geradores de PDF — espelho de ponto e advertência —, que
 * funcionam igual independente de v1/v2). Só o cabeçalho (link "←
 * Funcionários" e o avatar) muda. */
export default async function V2FuncionarioDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireModulo("funcionarios");
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    include: {
      pessoa: {
        select: {
          nome: true,
          documento: true,
          telefone: true,
          endereco: true,
          numero: true,
          complemento: true,
          email: true,
          rg: true,
          ctpsNumero: true,
          ctpsSerieUf: true,
          pisPasepNit: true,
          dataNascimento: true,
          cep: true,
          contatoEmergenciaNome: true,
          contatoEmergenciaTelefone: true,
          chavePix: true,
          tipoChavePix: true,
          fotoPerfilUrl: true,
          sexo: true,
        },
      },
      restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } },
    },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") notFound();

  const temChavePix = vinculo.pessoa.chavePix !== null && vinculo.pessoa.tipoChavePix !== null;
  const podeGerarAdvertencia = Boolean(vinculo.pessoa.ctpsNumero && vinculo.pessoa.ctpsSerieUf && vinculo.cargo);

  const dadosObrigatoriosFaltando = [
    !vinculo.pessoa.pisPasepNit && "PIS/PASEP/NIT",
    !vinculo.matriculaInterna && "matrícula interna",
  ].filter((x): x is string => Boolean(x));

  const [historicoSalarial, funcoesAtivas, empresaHorarios] = await Promise.all([
    prisma.historicoSalarial.findMany({ where: { vinculoId: vinculo.id }, orderBy: { vigenteDesde: "desc" } }),
    prisma.funcao.findMany({ where: { empresaId: sessao.empresaEfetivoId, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
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
      },
    }),
  ]);

  const horarioEsperado = horarioEsperadoClt(vinculo.escalaTrabalho, vinculo.escalaTurno, vinculo.horarioEntradaMin, vinculo.horarioSaidaMin, empresaHorarios);

  let statusFerias: null | { fase: "AQUISITIVO"; texto: string } | { fase: "CONCESSIVO"; texto: string; urgente: boolean } | { fase: "VENCIDA"; texto: string } = null;
  if (vinculo.dataAdmissao) {
    const status = calcularStatusFerias(vinculo.dataAdmissao, vinculo.ultimasFeriasGozadasEm, new Date());
    if (status.fase === "AQUISITIVO") {
      statusFerias = { fase: "AQUISITIVO", texto: `Ainda no período aquisitivo — direito a férias em ${formatarDataUTC(status.direitoEm)}.` };
    } else if (status.fase === "CONCESSIVO") {
      statusFerias = {
        fase: "CONCESSIVO",
        texto: `Com direito a férias — precisa tirar até ${formatarDataUTC(status.venceEm)} (${status.diasRestantes} dia(s) restantes).`,
        urgente: status.diasRestantes <= 60,
      };
    } else {
      statusFerias = { fase: "VENCIDA", texto: `⚠️ Férias vencidas desde ${formatarDataUTC(status.venceuEm)} — ${status.diasEmAtraso} dia(s) em atraso.` };
    }
  }

  const feriasEmAndamento = calcularFeriasEmAndamento(vinculo.ultimasFeriasGozadasEm, vinculo.feriasQuantidadeDias, new Date());

  let statusExperiencia: null | {
    fase: "EFETIVADO" | "EM_ANDAMENTO" | "ATENCAO" | "VENCIDO";
    etapa1Label: string;
    etapa2Label: string | null;
    contratoFimLabel: string;
    textoStatus: string;
    etapaAtual: 1 | 2;
    podeContinuarParaEtapa2: boolean;
  } = null;
  if (vinculo.dataAdmissao && vinculo.experienciaDias1) {
    const exp = calcularStatusExperiencia(vinculo.dataAdmissao, vinculo.experienciaDias1, vinculo.experienciaDias2, vinculo.experienciaContinuouEm, vinculo.experienciaEfetivadoEm, new Date());
    const decisaoEtapa = exp.etapaAtual === 1 ? "1ª etapa" : "2ª etapa";
    const oQueDecidir = exp.etapaAtual === 1 && exp.etapa2FimEm !== null ? "prorrogar pro 2º período, efetivar ou dispensar" : "efetivar ou dispensar";
    const textoStatus =
      exp.fase === "EFETIVADO"
        ? `✅ Efetivado em ${formatarDataUTC(vinculo.experienciaEfetivadoEm!)}.`
        : exp.fase === "VENCIDO"
          ? `🔴 Fim da ${decisaoEtapa} vencido há ${Math.abs(exp.diasRestantes)} dia(s) sem decisão (${oQueDecidir}).`
          : exp.fase === "ATENCAO"
            ? `⚠️ Faltam ${exp.diasRestantes} dia(s) pra decidir sobre a ${decisaoEtapa} (${oQueDecidir}).`
            : `Em andamento (${decisaoEtapa}) — faltam ${exp.diasRestantes} dia(s).`;
    statusExperiencia = {
      fase: exp.fase,
      etapa1Label: formatarDataUTC(exp.etapa1FimEm),
      etapa2Label: exp.etapa2FimEm ? formatarDataUTC(exp.etapa2FimEm) : null,
      contratoFimLabel: formatarDataUTC(exp.contratoFimEm),
      textoStatus,
      etapaAtual: exp.etapaAtual,
      podeContinuarParaEtapa2: exp.etapaAtual === 1 && exp.etapa2FimEm !== null,
    };
  }

  const [registros, pagamentosPendentes] = await Promise.all([
    prisma.registroPonto.findMany({ where: { pessoaId, empresaId: sessao.empresaEfetivoId }, orderBy: { horaEntrada: "desc" }, take: 60 }),
    prisma.pagamento.findMany({
      where: { status: { in: STATUS_PENDENTES }, turno: { pessoaId, empresaId: sessao.empresaEfetivoId } },
      select: { valor: true, turno: { select: { horaEntrada: true, funcao: { select: { nome: true } } } } },
      orderBy: { turno: { horaEntrada: "desc" } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/v2/funcionarios" className="text-xs font-bold text-brand-700">
            ← Funcionários
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <AvatarPessoa pessoaId={pessoaId} nome={vinculo.pessoa.nome} temFoto={Boolean(vinculo.pessoa.fotoPerfilUrl)} sexo={vinculo.pessoa.sexo} tamanho="lg" />
            <h1 className="text-xl font-extrabold text-navy-900">{vinculo.pessoa.nome}</h1>
            <DadosFuncionarioForm
              pessoaId={pessoaId}
              dadosIniciais={{
                nome: vinculo.pessoa.nome,
                telefone: vinculo.pessoa.telefone,
                endereco: vinculo.pessoa.endereco,
                numero: vinculo.pessoa.numero ?? "",
                complemento: vinculo.pessoa.complemento ?? "",
                email: vinculo.pessoa.email ?? "",
                rg: vinculo.pessoa.rg ?? "",
                ctpsNumero: vinculo.pessoa.ctpsNumero ?? "",
                ctpsSerieUf: vinculo.pessoa.ctpsSerieUf ?? "",
                pisPasepNit: vinculo.pessoa.pisPasepNit ?? "",
                chavePix: vinculo.pessoa.chavePix ?? "",
                dataNascimento: vinculo.pessoa.dataNascimento ? vinculo.pessoa.dataNascimento.toISOString().slice(0, 10) : "",
                cep: vinculo.pessoa.cep ?? "",
                contatoEmergenciaNome: vinculo.pessoa.contatoEmergenciaNome ?? "",
                contatoEmergenciaTelefone: vinculo.pessoa.contatoEmergenciaTelefone ?? "",
              }}
            />
          </div>
          <p className="text-stone-500 mt-1 text-sm">
            CPF {formatarCpf(vinculo.pessoa.documento)} · {vinculo.pessoa.telefone}
          </p>
        </div>
        <a
          href={`/relatorios/espelho/${pessoaId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 shrink-0"
        >
          🖨️ Espelho de ponto (mês passado)
        </a>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
        Controle interno de jornada — não substitui o registro eletrônico de ponto oficial (Portaria MTE 671/2021).
      </div>

      {dadosObrigatoriosFaltando.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
          ⚠️ Faltam dados obrigatórios pra funcionário CLT: <strong>{dadosObrigatoriosFaltando.join(", ")}</strong>.
          Preencha em &ldquo;Editar dados&rdquo; (ao lado do nome, acima) ou em &ldquo;Salário e escala&rdquo; abaixo.
        </div>
      )}

      <PagamentosExtraPendentesCard
        pessoaId={pessoaId}
        itens={pagamentosPendentes.map((p) => ({
          valor: Number(p.valor),
          horaEntradaLabel: formatarDataHoraComDiaSemana(p.turno.horaEntrada),
          funcaoNome: p.turno.funcao.nome,
        }))}
      />

      <ConverterVinculoButton
        action={converterParaExtra}
        pessoaId={pessoaId}
        label="🎫 Converter para extra"
        confirmText={`Converter ${vinculo.pessoa.nome} para extra? Ela vai sair de /funcionarios e passar a aparecer em /freelancers.`}
      />

      <SalarioEscalaForm
        pessoaId={pessoaId}
        salarioMensalAtual={vinculo.salarioMensal !== null ? Number(vinculo.salarioMensal) : null}
        cargoAtual={vinculo.cargo}
        matriculaInternaAtual={vinculo.matriculaInterna}
        escalaTrabalhoAtual={vinculo.escalaTrabalho}
        escalaTurnoAtual={vinculo.escalaTurno}
        cargaHorariaSemanalHorasAtual={vinculo.cargaHorariaSemanalMin !== null ? vinculo.cargaHorariaSemanalMin / 60 : null}
        horarioEntradaMinAtual={vinculo.horarioEntradaMin}
        horarioSaidaMinAtual={vinculo.horarioSaidaMin}
        modoPausaOverrideAtual={vinculo.modoPausaOverride}
        historicoSalarial={historicoSalarial.map((h) => ({ valor: Number(h.valor), vigenteDesdeLabel: formatarDataUTC(h.vigenteDesde) }))}
      />

      <RestricaoHorarioForm pessoaId={pessoaId} restricoesAtuais={vinculo.restricoesHorario} action={atualizarRestricaoHorario} />

      <BeneficiosForm
        pessoaId={pessoaId}
        insalubridade={{ recebe: vinculo.recebeInsalubridade, valor: vinculo.valorInsalubridade !== null ? Number(vinculo.valorInsalubridade) : null }}
        periculosidade={{ recebe: vinculo.recebePericulosidade, valor: vinculo.valorPericulosidade !== null ? Number(vinculo.valorPericulosidade) : null }}
        transporte={{ recebe: vinculo.recebeTransporte, valor: vinculo.valorTransporte !== null ? Number(vinculo.valorTransporte) : null, comDesconto: vinculo.transporteComDesconto }}
        bonificacao={{ recebe: vinculo.recebeBonificacao, valor: vinculo.valorBonificacao !== null ? Number(vinculo.valorBonificacao) : null }}
        premioAssiduidade={{ recebe: vinculo.recebePremioAssiduidade, valor: vinculo.valorPremioAssiduidade !== null ? Number(vinculo.valorPremioAssiduidade) : null }}
      />

      {vinculo.recebeTransporte && !vinculo.transporteComDesconto && (
        <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col gap-2">
          <h2 className="font-bold text-navy-900 text-sm">🧾 Recibo de ajuda de custo</h2>
          <p className="text-xs text-stone-500">
            Gera um recibo pra imprimir — a forma de pagamento (dinheiro ou PIX) fica em branco pra marcar à caneta na hora de pagar.
          </p>
          {vinculo.valorTransporte === null ? (
            <p className="text-xs text-amber-700">Defina o valor da ajuda de custo acima antes de gerar o recibo.</p>
          ) : (
            <form action={`/funcionarios/${pessoaId}/recibo-ajuda-custo/pdf`} method="GET" target="_blank" className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                Mês de referência
                <input type="month" name="mes" defaultValue={dataISOBrasil(new Date()).slice(0, 7)} className="border border-stone-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                Data
                <input type="date" name="data" defaultValue={dataISOBrasil(new Date())} className="border border-stone-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="rounded-full border border-stone-200 text-sm font-bold px-4 py-2">
                Gerar recibo
              </button>
            </form>
          )}
        </div>
      )}

      <ExtraDiarioForm
        pessoaId={pessoaId}
        permiteExtraDiarioAtual={vinculo.permiteExtraDiario}
        modoPagamentoAtual={vinculo.modoPagamento}
        valorDiariaAtual={vinculo.valorDiaria !== null ? Number(vinculo.valorDiaria) : null}
        frequenciaPagamentoAtual={vinculo.frequenciaPagamento}
        temChavePix={temChavePix}
      />

      <CriarTurnoManualForm pessoaId={pessoaId} funcoes={funcoesAtivas} temChavePix={temChavePix} />

      <FeriasCard
        pessoaId={pessoaId}
        dataAdmissaoValue={vinculo.dataAdmissao ? vinculo.dataAdmissao.toISOString().slice(0, 10) : ""}
        status={statusFerias}
        emAndamento={feriasEmAndamento ? { retornoLabel: formatarDataUTC(feriasEmAndamento.retorno), diasRestantes: feriasEmAndamento.diasRestantes } : null}
      />

      <ExperienciaCard
        pessoaId={pessoaId}
        temDataAdmissao={vinculo.dataAdmissao !== null}
        dias1Atual={vinculo.experienciaDias1}
        dias2Atual={vinculo.experienciaDias2}
        status={statusExperiencia}
        jaRescindido={vinculo.dataRescisao !== null}
      />

      <RescisaoCard
        pessoaId={pessoaId}
        pessoaNome={vinculo.pessoa.nome}
        jaRescindido={vinculo.dataRescisao !== null}
        dataRescisaoValue={vinculo.dataRescisao ? vinculo.dataRescisao.toISOString().slice(0, 10) : dataISOBrasil(new Date())}
        registradaPorEmail={vinculo.rescisaoRegistradaPorEmail}
        registradaEmLabel={vinculo.rescisaoRegistradaEm ? formatarDataHora(vinculo.rescisaoRegistradaEm) : null}
        emPeriodoExperiencia={statusExperiencia !== null && statusExperiencia.fase !== "EFETIVADO"}
        contratoFimLabel={statusExperiencia?.contratoFimLabel ?? null}
      />

      {registros.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum registro de ponto ainda pra essa pessoa nesta empresa.</p>
      ) : (
        <RegistroPontoHistorico
          podeGerarAdvertencia={podeGerarAdvertencia}
          registros={registros.map((r) => ({
            id: r.id,
            entradaLabel: formatarDataHoraComDiaSemana(r.horaEntrada),
            intervaloLabel: r.entradaIntervalo && r.saidaIntervalo ? `${formatarHora(r.entradaIntervalo)}–${formatarHora(r.saidaIntervalo)}` : null,
            saidaLabel: r.horaSaida ? formatarHora(r.horaSaida) : null,
            minutosTrabalhados: r.minutosTrabalhados,
            minutosDescontadosPausa: r.minutosDescontadosPausa,
            status: r.status,
            encerradoManualmentePorEmail: r.correcaoSaidaEm ? r.correcaoSaidaPorEmail : null,
            ...calcularDesvioPontoClt(r.horaEntrada, r.horaSaida, horarioEsperado),
            ...calcularSaldoDiarioClt(r.minutosTrabalhados, horarioEsperado, pausaAplicadaEm(r)),
            saidaSugeridaValue: (() => {
              const sugerida = saidaEsperadaClt(r.horaEntrada, horarioEsperado);
              return sugerida ? paraDatetimeLocalBrasil(sugerida) : null;
            })(),
            horaSaidaValue: r.horaSaida ? paraDatetimeLocalBrasil(r.horaSaida) : null,
          }))}
        />
      )}
    </div>
  );
}
