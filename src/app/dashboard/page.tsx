import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarHora, inicioDoDiaBrasil, dataISOBrasil, instanteBrasil } from "@/lib/data";
import { classificarTurno, type TipoTurno } from "@/lib/turno";
import { horarioEsperadoClt, saidaEsperadaClt } from "@/lib/ponto";
import AutoRefresh from "@/components/AutoRefresh";
import AvatarPessoa from "@/components/AvatarPessoa";
import SeletorEmpresa from "./SeletorEmpresa";
import ConfirmarSaidaConflitoButton from "./ConfirmarSaidaConflitoButton";
import AlertaHorarioNormalButton from "./AlertaHorarioNormalButton";
import AlertaHorarioNormalCltButton from "./AlertaHorarioNormalCltButton";
import type { ModoPagamento, FrequenciaPagamento, StatusTurno, Sexo } from "@/generated/prisma/enums";

/// Resumo do status de pagamento do BLOCO (pode juntar mais de um turno da
/// mesma pessoa/tipoTurno) — "PAGO" só quando todos os turnos do bloco já
/// foram pagos; "ERRO" tem prioridade sobre "PENDENTE" porque é o caso que
/// mais precisa de atenção do dono.
type StatusPagamentoResumo = "PAGO" | "PENDENTE" | "ERRO";

type ResumoPessoaTurno =
  | {
      origem: "EXTRA";
      pessoaId: number;
      nome: string;
      turnos: number;
      valorTotal: number;
      primeiraEntrada: Date;
      ultimaSaida: Date;
      modoPagamento: ModoPagamento;
      frequencia: FrequenciaPagamento;
      statusPagamento: StatusPagamentoResumo;
      /// Só relevante quando statusPagamento é "PAGO" — se o bloco junta
      /// mais de um turno pagos por vias diferentes (raro, mas possível),
      /// vira "MISTO" em vez de escolher um dos dois arbitrariamente.
      origemPagamento: "AUTOMATICO" | "MANUAL" | "MISTO";
      tipoTurno: TipoTurno | "DOBRADO";
    }
  | {
      origem: "CLT";
      pessoaId: number;
      nome: string;
      turnos: number;
      primeiraEntrada: Date;
      ultimaSaida: Date;
      tipoTurno: TipoTurno;
    };

export default async function DashboardPage() {
  const sessao = await requireTenant();

  const hoje = inicioDoDiaBrasil(new Date());
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [
    turnosHoje,
    pendentesPagamento,
    totalFuncoes,
    totalTotens,
    emTurnoAgora,
    emPontoAgoraClt,
    turnosFechadosRecentes,
    registrosPontoFechadosRecentes,
    empresaConfig,
  ] = await Promise.all([
    prisma.turno.count({
      where: { empresaId: sessao.empresaEfetivoId, criadoEm: { gte: hoje } },
    }),
    prisma.pagamento.count({
      where: {
        status: { in: ["PENDENTE", "FALHOU"] },
        turno: { empresaId: sessao.empresaEfetivoId },
      },
    }),
    prisma.funcao.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.totem.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.turno.findMany({
      where: { empresaId: sessao.empresaEfetivoId, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: {
        id: true,
        horaEntrada: true,
        modoPagamentoAplicado: true,
        frequenciaPagamentoAplicada: true,
        turnoDobrado: true,
        pessoa: { select: { id: true, nome: true, fotoPerfilUrl: true, sexo: true } },
        funcao: { select: { nome: true } },
      },
    }),
    // CLT com ponto aberto agora — mesmo espírito do card, mas via
    // RegistroPonto (sem função/modo de pagamento, que não se aplicam a
    // CLT). Antes deste card ficava só o extra; CLT era invisível aqui.
    prisma.registroPonto.findMany({
      where: { empresaId: sessao.empresaEfetivoId, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: {
        id: true,
        horaEntrada: true,
        entradaIntervalo: true,
        saidaIntervalo: true,
        pessoa: { select: { id: true, nome: true, fotoPerfilUrl: true, sexo: true } },
      },
    }),
    // Cobre hoje E ontem numa só busca — antes só buscava a janela de
    // ontem, deixando invisível um turno que já fechou mais cedo hoje
    // (ex.: turno do dia encerrado enquanto o da noite ainda está aberto).
    prisma.turno.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { gte: ontem },
        horaSaida: { not: null },
      },
      select: {
        valorTotal: true,
        horaEntrada: true,
        horaSaida: true,
        modoPagamentoAplicado: true,
        frequenciaPagamentoAplicada: true,
        turnoDobrado: true,
        status: true,
        pessoa: { select: { id: true, nome: true } },
        pagamento: { select: { pagoAutomaticamente: true } },
      },
    }),
    // Ponto de CLT já encerrado, mesma janela — antes "Hoje"/"Ontem" só
    // mostrava extra, deixando invisível quando um CLT ia embora.
    prisma.registroPonto.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { gte: ontem },
        horaSaida: { not: null },
      },
      select: {
        horaEntrada: true,
        horaSaida: true,
        pessoa: { select: { id: true, nome: true } },
      },
    }),
    // Classificação ☀️/🌙 — corte do dia da empresa, usado mais abaixo.
    // Não depende de nenhuma das buscas acima, por isso entra na mesma
    // leva em vez de esperar elas terminarem primeiro.
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
        horarioInicioDiaMin: true,
        horarioInicioNoiteMin: true,
        horarioFechamentoDiaMin: true,
        horarioFechamentoNoiteMin: true,
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

  const pessoaIds = [
    ...emTurnoAgora.map((t) => t.pessoa.id),
    ...turnosFechadosRecentes.map((t) => t.pessoa.id),
    ...registrosPontoFechadosRecentes.map((r) => r.pessoa.id),
  ];
  // Pessoa apareceu com turno/ponto aberto em OUTRA empresa depois de ter
  // aberto este — calculado logo abaixo, junto com vinculos: as duas
  // buscas dependem só do que já veio na leva acima, não uma da outra, por
  // isso rodam juntas em vez de em sequência.
  const pessoaIdsEmTurno = [...emTurnoAgora.map((t) => t.pessoa.id), ...emPontoAgoraClt.map((r) => r.pessoa.id)];

  const [vinculos, outrosTurnos, outrosRegistros] = await Promise.all([
    prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId: sessao.empresaEfetivoId, pessoaId: { in: pessoaIds } },
      select: {
        pessoaId: true,
        turnoPredefinido: true,
        escalaTrabalho: true,
        escalaTurno: true,
        horarioEntradaMin: true,
        horarioSaidaMin: true,
      },
    }),
    pessoaIdsEmTurno.length
      ? prisma.turno.findMany({
          where: { pessoaId: { in: pessoaIdsEmTurno }, empresaId: { not: sessao.empresaEfetivoId }, horaEntrada: { gte: ontem } },
          select: { pessoaId: true, horaEntrada: true },
        })
      : Promise.resolve([]),
    pessoaIdsEmTurno.length
      ? prisma.registroPonto.findMany({
          where: { pessoaId: { in: pessoaIdsEmTurno }, empresaId: { not: sessao.empresaEfetivoId }, horaEntrada: { gte: ontem } },
          select: { pessoaId: true, horaEntrada: true },
        })
      : Promise.resolve([]),
  ]);
  const turnoPredefinidoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v.turnoPredefinido]));
  const vinculoCltPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v]));
  function tipoDoTurno(pessoaId: number, horaEntrada: Date, dobrado: boolean): TipoTurno | "DOBRADO" {
    if (dobrado) return "DOBRADO";
    return classificarTurno(
      horaEntrada,
      turnoPredefinidoPorPessoa.get(pessoaId) ?? "LIVRE",
      empresaConfig.horarioInicioDiaMin,
      empresaConfig.horarioInicioNoiteMin
    );
  }

  // "Em turno agora" mistura extra (Turno aberto) e CLT (RegistroPonto
  // aberto) numa lista só, ordenada por chegada — antes só mostrava
  // extra, deixando CLT invisível aqui mesmo já tendo batido ponto.
  type ItemEmTurno =
    | {
        origem: "EXTRA";
        id: number;
        pessoaId: number;
        nome: string;
        temFoto: boolean;
        sexo: Sexo | null;
        horaEntrada: Date;
        funcaoNome: string;
        modoPagamentoAplicado: ModoPagamento;
        frequenciaPagamentoAplicada: FrequenciaPagamento;
        tipoTurno: TipoTurno | "DOBRADO";
        conflitoDesde: Date | null;
        alertaHorario: { cutoff: Date; podeDobrar: boolean } | null;
      }
    | {
        origem: "CLT";
        id: number;
        pessoaId: number;
        nome: string;
        temFoto: boolean;
        sexo: Sexo | null;
        horaEntrada: Date;
        emIntervalo: boolean;
        conflitoDesde: Date | null;
        alertaHorario: { cutoff: Date; podeDobrar: boolean } | null;
      };

  // Turno ainda aberto bem depois do horário normal de encerramento do seu
  // próprio tipo (dia/noite) — sem isso, ele só seria fechado pelo cron
  // diário (01:00, ver src/lib/fechamento-automatico.ts), acumulando horas
  // corridas o dia inteiro até lá. Avisa o dono na hora, com as duas saídas
  // plausíveis: encerrar no horário normal (esqueceu de bater saída) ou
  // virou turno dobrado (emendou pro outro período).
  function alertaHorarioNormal(
    horaEntrada: Date,
    dobrado: boolean,
    tipo: TipoTurno | "DOBRADO"
  ): { cutoff: Date; podeDobrar: boolean } | null {
    if (dobrado || tipo === "DOBRADO") return null;
    const dataISO = dataISOBrasil(horaEntrada);
    const cutoffMin = tipo === "DIA" ? empresaConfig.horarioFechamentoDiaMin : empresaConfig.horarioFechamentoNoiteMin;
    let cutoff = instanteBrasil(dataISO, cutoffMin);
    if (cutoff <= horaEntrada) cutoff = new Date(cutoff.getTime() + 24 * 60 * 60_000);
    if (cutoff > new Date()) return null;
    return { cutoff, podeDobrar: tipo === "DIA" };
  }

  // Mesmo aviso acima, só que pro ponto de CLT: o corte certo é o HORÁRIO
  // DE SAÍDA DA PRÓPRIA PESSOA (VinculoPessoaEmpresa.horarioSaidaMin, ou o
  // padrão da escala dela — ver horarioEsperadoClt em src/lib/ponto.ts),
  // NUNCA o horário de fechamento genérico do turno EXTRA (dia/noite) da
  // empresa usado acima — são conceitos diferentes que hoje moram nos
  // mesmos nomes de campo por coincidência. Sem escala/horário configurado
  // pra essa pessoa, não há o que comparar (retorna null, mesmo espírito
  // informativo de sempre).
  function alertaHorarioNormalClt(pessoaId: number, horaEntrada: Date): { cutoff: Date; podeDobrar: boolean } | null {
    const vinculo = vinculoCltPorPessoa.get(pessoaId);
    if (!vinculo) return null;
    const esperado = horarioEsperadoClt(
      vinculo.escalaTrabalho,
      vinculo.escalaTurno,
      vinculo.horarioEntradaMin,
      vinculo.horarioSaidaMin,
      empresaConfig
    );
    const cutoff = saidaEsperadaClt(horaEntrada, esperado);
    if (!cutoff || cutoff > new Date()) return null;
    return { cutoff, podeDobrar: false };
  }

  // Pessoa apareceu com turno/ponto aberto em OUTRA empresa depois de ter
  // aberto este — sinal de que ela esqueceu de bater saída aqui antes de
  // ir pra outro lugar (ver buscarConflitoOutroLocal em
  // src/app/t/[token]/actions.ts, que avisa a pessoa na hora; isto aqui é
  // o aviso simétrico pro dono de QUEM FICOU com o turno pendurado).
  // outrosTurnos/outrosRegistros já foram buscados acima, junto com vinculos.
  const outrosPorPessoa = new Map<number, Date[]>();
  for (const o of [...outrosTurnos, ...outrosRegistros]) {
    const atual = outrosPorPessoa.get(o.pessoaId) ?? [];
    atual.push(o.horaEntrada);
    outrosPorPessoa.set(o.pessoaId, atual);
  }
  function conflitoDesde(pessoaId: number, horaEntradaAqui: Date): Date | null {
    const outras = (outrosPorPessoa.get(pessoaId) ?? []).filter((d) => d > horaEntradaAqui);
    if (outras.length === 0) return null;
    return outras.reduce((a, b) => (a < b ? a : b));
  }

  const itensEmTurno: ItemEmTurno[] = [
    ...emTurnoAgora.map((t): ItemEmTurno => {
      const tipoTurno = tipoDoTurno(t.pessoa.id, t.horaEntrada, t.turnoDobrado);
      return {
        origem: "EXTRA",
        id: t.id,
        pessoaId: t.pessoa.id,
        nome: t.pessoa.nome,
        temFoto: Boolean(t.pessoa.fotoPerfilUrl),
        sexo: t.pessoa.sexo,
        horaEntrada: t.horaEntrada,
        funcaoNome: t.funcao.nome,
        modoPagamentoAplicado: t.modoPagamentoAplicado,
        frequenciaPagamentoAplicada: t.frequenciaPagamentoAplicada,
        tipoTurno,
        conflitoDesde: conflitoDesde(t.pessoa.id, t.horaEntrada),
        alertaHorario: alertaHorarioNormal(t.horaEntrada, t.turnoDobrado, tipoTurno),
      };
    }),
    ...emPontoAgoraClt.map((r): ItemEmTurno => {
      return {
        origem: "CLT",
        id: r.id,
        pessoaId: r.pessoa.id,
        nome: r.pessoa.nome,
        temFoto: Boolean(r.pessoa.fotoPerfilUrl),
        sexo: r.pessoa.sexo,
        horaEntrada: r.horaEntrada,
        emIntervalo: r.entradaIntervalo !== null && r.saidaIntervalo === null,
        conflitoDesde: conflitoDesde(r.pessoa.id, r.horaEntrada),
        alertaHorario: alertaHorarioNormalClt(r.pessoa.id, r.horaEntrada),
      };
    }),
  ].sort((a, b) => a.horaEntrada.getTime() - b.horaEntrada.getTime());

  /** Agrupa turnos/pontos já fechados por pessoa+tipoTurno (dia/noite/
   * dobrado são somados separadamente pra mesma pessoa) — mistura extra e
   * CLT na mesma lista, mesmo espírito de "Em turno agora" logo acima:
   * antes só extra aparecia aqui, CLT ficava invisível mesmo já tendo
   * batido saída. */
  // Combina o status de um turno a mais no status já acumulado do bloco —
  // ERRO tem prioridade sobre PENDENTE (o caso que mais precisa de
  // atenção), e só fica PAGO quando TODOS os turnos do bloco já foram
  // pagos.
  function combinarStatusPagamento(
    acumulado: StatusPagamentoResumo,
    status: StatusTurno
  ): StatusPagamentoResumo {
    if (acumulado === "ERRO" || status === "ERRO_PAGAMENTO") return "ERRO";
    if (acumulado === "PENDENTE" || status !== "PAGO") return "PENDENTE";
    return "PAGO";
  }

  function statusPagamentoDoTurno(status: StatusTurno): StatusPagamentoResumo {
    if (status === "ERRO_PAGAMENTO") return "ERRO";
    return status === "PAGO" ? "PAGO" : "PENDENTE";
  }

  function agregarFechados(
    turnosExtra: typeof turnosFechadosRecentes,
    registrosClt: typeof registrosPontoFechadosRecentes
  ): [string, ResumoPessoaTurno][] {
    const mapa = new Map<string, ResumoPessoaTurno>();

    for (const turno of turnosExtra) {
      if (!turno.horaSaida) continue;
      const tipoTurno = tipoDoTurno(turno.pessoa.id, turno.horaEntrada, turno.turnoDobrado);
      const chave = `EXTRA-${turno.pessoa.id}-${tipoTurno}`;
      const origemTurno: "AUTOMATICO" | "MANUAL" = turno.pagamento?.pagoAutomaticamente ? "AUTOMATICO" : "MANUAL";
      const atual = mapa.get(chave);
      if (atual && atual.origem === "EXTRA") {
        atual.turnos += 1;
        atual.valorTotal += turno.valorTotal !== null ? Number(turno.valorTotal) : 0;
        if (turno.horaEntrada < atual.primeiraEntrada) atual.primeiraEntrada = turno.horaEntrada;
        if (turno.horaSaida > atual.ultimaSaida) atual.ultimaSaida = turno.horaSaida;
        // Se qualquer turno do bloco foi por diária, sinaliza diária — é o
        // caso que mais importa destacar pro financeiro, já que o valor
        // não segue a conta simples de horas x valor/hora.
        if (turno.modoPagamentoAplicado === "DIARIA") atual.modoPagamento = "DIARIA";
        if (turno.frequenciaPagamentoAplicada === "SEMANAL") atual.frequencia = "SEMANAL";
        atual.statusPagamento = combinarStatusPagamento(atual.statusPagamento, turno.status);
        if (atual.origemPagamento !== origemTurno) atual.origemPagamento = "MISTO";
      } else {
        mapa.set(chave, {
          origem: "EXTRA",
          pessoaId: turno.pessoa.id,
          nome: turno.pessoa.nome,
          turnos: 1,
          valorTotal: turno.valorTotal !== null ? Number(turno.valorTotal) : 0,
          primeiraEntrada: turno.horaEntrada,
          ultimaSaida: turno.horaSaida,
          modoPagamento: turno.modoPagamentoAplicado,
          statusPagamento: statusPagamentoDoTurno(turno.status),
          origemPagamento: origemTurno,
          frequencia: turno.frequenciaPagamentoAplicada,
          tipoTurno,
        });
      }
    }

    for (const registro of registrosClt) {
      if (!registro.horaSaida) continue;
      // CLT nunca dobra turno — tipoDoTurno(dobrado=false) nunca devolve
      // "DOBRADO", por isso o cast é seguro.
      const tipoTurno = tipoDoTurno(registro.pessoa.id, registro.horaEntrada, false) as TipoTurno;
      const chave = `CLT-${registro.pessoa.id}-${tipoTurno}`;
      const atual = mapa.get(chave);
      if (atual && atual.origem === "CLT") {
        atual.turnos += 1;
        if (registro.horaEntrada < atual.primeiraEntrada) atual.primeiraEntrada = registro.horaEntrada;
        if (registro.horaSaida > atual.ultimaSaida) atual.ultimaSaida = registro.horaSaida;
      } else {
        mapa.set(chave, {
          origem: "CLT",
          pessoaId: registro.pessoa.id,
          nome: registro.pessoa.nome,
          turnos: 1,
          primeiraEntrada: registro.horaEntrada,
          ultimaSaida: registro.horaSaida,
          tipoTurno,
        });
      }
    }

    return [...mapa.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  }

  const turnosDeHoje = turnosFechadosRecentes.filter((t) => t.horaEntrada >= hoje);
  const turnosDeOntem = turnosFechadosRecentes.filter((t) => t.horaEntrada < hoje);
  const registrosDeHoje = registrosPontoFechadosRecentes.filter((r) => r.horaEntrada >= hoje);
  const registrosDeOntem = registrosPontoFechadosRecentes.filter((r) => r.horaEntrada < hoje);
  const resumoHoje = agregarFechados(turnosDeHoje, registrosDeHoje);
  const resumoOntem = agregarFechados(turnosDeOntem, registrosDeOntem);
  const valorTotalHoje = resumoHoje.reduce(
    (soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0),
    0
  );
  const valorTotalOntem = resumoOntem.reduce(
    (soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervaloMs={5000} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">
            {sessao.empresaEfetivoNome}
          </h1>
          <p className="text-stone-600 mt-1 text-sm">Painel da empresa.</p>
        </div>
        <SeletorEmpresa
          // Só faz sentido oferecer a troca rápida quando a empresa atual é
          // uma DAS SUAS (sessao.minhasEmpresas) — quando o master está
          // dentro de uma empresa de cliente (via /master → Acessar, ex.:
          // BAR CABRAL), o <select> ficava com um value que não bate com
          // nenhuma <option> da lista, e o navegador cai no comportamento
          // padrão de mostrar a primeira opção selecionada mesmo sem ser —
          // dava a falsa impressão de estar numa das próprias empresas do
          // master. Reportado pelo Thiago em 2026-09-22.
          empresas={
            sessao.minhasEmpresas.some((e) => e.id === sessao.empresaEfetivoId) ? sessao.minhasEmpresas : []
          }
          empresaAtivaId={sessao.empresaEfetivoId}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card label="Em turno agora" valor={itensEmTurno.length} />
        <Card label="Turnos hoje" valor={turnosHoje} />
        <Card label="Pagamentos pendentes" valor={pendentesPagamento} />
        <Card label="Funções cadastradas" valor={totalFuncoes} />
        <Card label="Totens ativos" valor={totalTotens} />
      </div>

      {totalFuncoes === 0 && (
        <p className="text-stone-500 text-sm rounded-2xl border border-dashed border-stone-300 p-4">
          Cadastre suas funções (e o valor/hora de cada uma) para poder
          liberar o totem de check-in.
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Em turno agora</h2>
          <span className="text-xs text-stone-400">atualiza sozinho</span>
        </div>
        {itensEmTurno.length === 0 ? (
          <p className="text-stone-500 text-sm p-4">Ninguém em turno neste momento.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {itensEmTurno.map((item) => (
              <li key={`${item.origem}-${item.id}`} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarPessoa pessoaId={item.pessoaId} nome={item.nome} temFoto={item.temFoto} sexo={item.sexo} tamanho="sm" />
                  <div className="min-w-0">
                  <Link
                    href={item.origem === "CLT" ? `/funcionarios/${item.pessoaId}` : `/freelancers/${item.pessoaId}`}
                    className="font-medium text-navy-900 hover:text-brand-700 hover:underline"
                  >
                    {item.nome}
                  </Link>
                  <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                    {item.origem === "CLT" ? (
                      <>
                        <BadgeClt />
                        {item.emIntervalo && (
                          <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0">
                            Em intervalo
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {item.funcaoNome}
                        <BadgeModoPagamento modo={item.modoPagamentoAplicado} />
                        <BadgeFrequenciaPagamento frequencia={item.frequenciaPagamentoAplicada} />
                        <BadgeTipoTurno tipo={item.tipoTurno} />
                      </>
                    )}
                  </p>
                  </div>
                </div>
                <span className="text-sm text-stone-600 shrink-0 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  chegou {formatarHora(item.horaEntrada)}
                </span>
                {item.conflitoDesde &&
                  (item.origem === "EXTRA" ? (
                    <ConfirmarSaidaConflitoButton turnoId={item.id} conflitoDesde={item.conflitoDesde} />
                  ) : (
                    <p className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 mt-1.5 text-xs text-amber-800">
                      ⚠️ Essa pessoa já iniciou outro turno em outro lugar às{" "}
                      {formatarHora(item.conflitoDesde)} — provavelmente esqueceu de bater saída aqui.
                    </p>
                  ))}
                {item.alertaHorario &&
                  (item.origem === "EXTRA" ? (
                    <AlertaHorarioNormalButton
                      turnoId={item.id}
                      cutoff={item.alertaHorario.cutoff}
                      podeDobrar={item.alertaHorario.podeDobrar}
                    />
                  ) : (
                    <AlertaHorarioNormalCltButton registroId={item.id} cutoff={item.alertaHorario.cutoff} />
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      <SecaoTurnosFechados
        titulo="Hoje"
        resumo={resumoHoje}
        valorTotal={valorTotalHoje}
        vazioGeral="Ninguém encerrou turno hoje ainda."
      />

      <SecaoTurnosFechados
        titulo="Ontem"
        resumo={resumoOntem}
        valorTotal={valorTotalOntem}
        vazioGeral="Ninguém encerrou turno ontem."
        linkImprimir="/relatorios/pagamentos/pdf"
      />
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}

/** Card de "Hoje" ou "Ontem" — turnos/pontos já encerrados, agrupados por
 * turno do dia/da noite (e dobrado, só quando existir) em vez de por
 * frequência de pagamento: o que mais importa aqui é conferir quem já
 * bateu saída em cada turno, extra ou CLT, não o fluxo de pagamento (que
 * já aparece como selo em cada linha, ver BadgeFrequenciaPagamento). */
function SecaoTurnosFechados({
  titulo,
  resumo,
  valorTotal,
  vazioGeral,
  linkImprimir,
}: {
  titulo: string;
  resumo: [string, ResumoPessoaTurno][];
  valorTotal: number;
  vazioGeral: string;
  linkImprimir?: string;
}) {
  const porDia = resumo.filter(([, r]) => r.tipoTurno === "DIA");
  const porNoite = resumo.filter(([, r]) => r.tipoTurno === "NOITE");
  const porDobrado = resumo.filter(([, r]) => r.tipoTurno === "DOBRADO");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy-900">{titulo}</h2>
        <div className="flex items-center gap-3">
          {resumo.length > 0 && (
            <span className="text-sm font-medium text-stone-700">
              R$ {valorTotal.toFixed(2)}
            </span>
          )}
          {linkImprimir && (
            <a
              href={linkImprimir}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 text-stone-600 hover:bg-stone-50 shrink-0"
            >
              🖨️ Imprimir
            </a>
          )}
        </div>
      </div>
      {resumo.length === 0 ? (
        <p className="text-stone-500 text-sm p-4">{vazioGeral}</p>
      ) : (
        <>
          <GrupoTurno
            titulo="☀️ Turno dia"
            corTitulo="text-amber-700"
            corFundo="bg-amber-50"
            pessoas={porDia}
            vazio="Ninguém no turno do dia."
          />
          <div className="border-t border-stone-100" />
          <GrupoTurno
            titulo="🌙 Turno noite"
            corTitulo="text-indigo-700"
            corFundo="bg-indigo-50"
            pessoas={porNoite}
            vazio="Ninguém no turno da noite."
          />
          {porDobrado.length > 0 && (
            <>
              <div className="border-t border-stone-100" />
              <GrupoTurno
                titulo="🔁 Dobrado"
                corTitulo="text-purple-700"
                corFundo="bg-purple-50"
                pessoas={porDobrado}
                vazio=""
              />
            </>
          )}
        </>
      )}
      <div className="p-3 border-t border-stone-100">
        <Link href="/turnos" className="text-sm text-brand-700 hover:underline">
          Ver todos os turnos →
        </Link>
      </div>
    </div>
  );
}

/** Um dos grupos de turno-do-dia dentro de "Hoje"/"Ontem" — dia, noite ou
 * dobrado, misturando extra e CLT. A frequência de pagamento (a cada
 * turno vs semanal) não é o critério de agrupamento aqui (ver
 * SecaoTurnosFechados); continua visível por linha via
 * BadgeFrequenciaPagamento, só faz sentido pra extra. */
function GrupoTurno({
  titulo,
  corTitulo,
  corFundo,
  pessoas,
  vazio,
}: {
  titulo: string;
  corTitulo: string;
  corFundo: string;
  pessoas: [string, ResumoPessoaTurno][];
  vazio: string;
}) {
  const total = pessoas.reduce((soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0), 0);
  return (
    <div>
      <div className={`px-4 py-2 flex items-center justify-between gap-3 ${corFundo}`}>
        <span className={`text-xs font-semibold uppercase tracking-wide ${corTitulo}`}>
          {titulo} · {pessoas.length}
        </span>
        {pessoas.length > 0 && (
          <span className={`text-xs font-medium ${corTitulo}`}>R$ {total.toFixed(2)}</span>
        )}
      </div>
      {pessoas.length === 0 ? (
        <p className="text-stone-400 text-sm p-4">{vazio}</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {pessoas.map(([chave, r]) => (
            <li key={chave} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-navy-900 flex flex-wrap items-center gap-1.5">
                  <Link
                    href={r.origem === "CLT" ? `/funcionarios/${r.pessoaId}` : `/freelancers/${r.pessoaId}`}
                    className="hover:text-brand-700 hover:underline"
                  >
                    {r.nome}
                  </Link>
                  {r.origem === "CLT" ? (
                    <BadgeClt />
                  ) : (
                    <>
                      <BadgeModoPagamento modo={r.modoPagamento} />
                      <BadgeFrequenciaPagamento frequencia={r.frequencia} />
                    </>
                  )}
                </p>
                <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  {formatarHora(r.primeiraEntrada)}–{formatarHora(r.ultimaSaida)} · {r.turnos}{" "}
                  {r.turnos === 1 ? "turno" : "turnos"}
                </p>
              </div>
              {r.origem === "EXTRA" && (
                <span className="flex items-center gap-2 shrink-0">
                  <BadgeStatusPagamento status={r.statusPagamento} />
                  {r.statusPagamento === "PAGO" && <BadgeOrigemPagamento origem={r.origemPagamento} />}
                  <span className="text-sm font-medium text-stone-700">
                    R$ {r.valorTotal.toFixed(2)}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Diferencia quem recebe por diária fixa de quem recebe por hora — o
 * cálculo dos dois é bem diferente (diária não segue horas × valor/hora),
 * então vale destacar isso de cara em toda lista de turnos. */
function BadgeModoPagamento({ modo }: { modo: ModoPagamento }) {
  return modo === "DIARIA" ? (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0">
      Dia
    </span>
  ) : (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-stone-200 bg-stone-50 text-stone-500 px-1.5 py-0.5 shrink-0">
      Hora
    </span>
  );
}

/** Status de pagamento do bloco, ao lado do valor — pra bater o olho e
 * já saber quem ainda precisa ser pago sem entrar em Pagamentos. */
function BadgeStatusPagamento({ status }: { status: "PAGO" | "PENDENTE" | "ERRO" }) {
  if (status === "PAGO") {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-brand-200 bg-brand-50 text-brand-700 px-1.5 py-0.5 shrink-0">
        ✓ Pago
      </span>
    );
  }
  if (status === "ERRO") {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-red-200 bg-red-50 text-red-700 px-1.5 py-0.5 shrink-0">
        Erro no pagamento
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0">
      Pendente
    </span>
  );
}

/** Só aparece ao lado de "✓ Pago" — distingue quem foi pago pela conta de
 * pagamento conectada (Asaas) de quem foi pago na mão pelo admin (ver
 * pagoAutomaticamente em src/lib/pagamentos/processar.ts e o mesmo selo em
 * /pagamentos e no detalhe do turno). */
function BadgeOrigemPagamento({ origem }: { origem: "AUTOMATICO" | "MANUAL" | "MISTO" }) {
  if (origem === "AUTOMATICO") {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-sky-200 bg-sky-50 text-sky-700 px-1.5 py-0.5 shrink-0">
        🌐 Online
      </span>
    );
  }
  if (origem === "MISTO") {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-violet-200 bg-violet-50 text-violet-700 px-1.5 py-0.5 shrink-0">
        🌐✋ Misto
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-stone-200 bg-stone-50 text-stone-500 px-1.5 py-0.5 shrink-0">
      ✋ Manual
    </span>
  );
}

/** Sempre visível (diário ou semanal) — antes só aparecia um selo pra quem
 * fugia do padrão (semanal), deixando quem recebe a cada turno sem nada
 * ao lado do nome. Mostrar os dois estados deixa claro de cara, sem
 * precisar adivinhar que "sem selo" = diário. */
function BadgeFrequenciaPagamento({ frequencia }: { frequencia: FrequenciaPagamento }) {
  return frequencia === "SEMANAL" ? (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 shrink-0">
      Recebimento semanal
    </span>
  ) : (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-stone-200 bg-stone-50 text-stone-500 px-1.5 py-0.5 shrink-0">
      Recebimento diário
    </span>
  );
}

/** Distingue funcionário CLT de extra nas listas combinadas do dashboard
 * ("Em turno agora" e "Hoje"/"Ontem") — CLT não tem função nem modo de
 * pagamento (controle interno de jornada, sem cálculo automático). */
function BadgeClt() {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 shrink-0">
      CLT
    </span>
  );
}

/** ☀️ Dia / 🌙 Noite / 🔁 Dobrado — mesma classificação usada pelo
 * fechamento automático (src/lib/turno.ts:classificarTurno), só pra
 * rotular a tela. Usado só em "Em turno agora" — nos cards de turno
 * fechado essa classificação já é o cabeçalho do grupo. */
function BadgeTipoTurno({ tipo }: { tipo: TipoTurno | "DOBRADO" }) {
  if (tipo === "DOBRADO") {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-1.5 py-0.5 shrink-0">
        🔁 Dobrado
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-stone-200 bg-stone-50 text-stone-600 px-1.5 py-0.5 shrink-0">
      {tipo === "DIA" ? "☀️ Dia" : "🌙 Noite"}
    </span>
  );
}
