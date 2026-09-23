import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { buscarDadosDashboard, type ResumoPessoaTurno } from "@/lib/dashboard";
import { formatarHora } from "@/lib/data";
import AutoRefresh from "@/components/AutoRefresh";
import AvatarPessoa from "@/components/AvatarPessoa";
import SeletorEmpresaV2 from "@/components/v2/SeletorEmpresaV2";
import ConfirmarSaidaConflitoButton from "@/app/dashboard/ConfirmarSaidaConflitoButton";
import AlertaHorarioNormalButton from "@/app/dashboard/AlertaHorarioNormalButton";
import AlertaHorarioNormalCltButton from "@/app/dashboard/AlertaHorarioNormalCltButton";
import type { ModoPagamento, FrequenciaPagamento } from "@/generated/prisma/enums";
import type { TipoTurno } from "@/lib/turno";

/** Espelho completo do dashboard v1 (src/app/dashboard/page.tsx, não
 * tocado) no visual da v2 — mesmos dados (em turno agora, turnos de
 * hoje/ontem agrupados por dia/noite/dobrado, troca de empresa,
 * atualização automática), reaproveitando os mesmos componentes de ação
 * do v1 (AutoRefresh, ConfirmarSaidaConflitoButton,
 * AlertaHorarioNormalButton/CltButton — todos genéricos, sem estilo
 * específico do v1 que precisasse mudar). Exceção: o seletor de empresa
 * tem versão própria (SeletorEmpresaV2) porque a action original sempre
 * redireciona pra /dashboard (v1) depois de trocar — ver
 * src/app/v2/actions.ts. Só o layout visual (cartão de destaque + pills +
 * listas arredondadas) é novo. */
export default async function V2DashboardPage() {
  const sessao = await requireTenant();
  const dados = await buscarDadosDashboard(sessao.empresaEfetivoId);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* 15s em vez dos 5s originais — ainda "atualiza sozinho" pra quem
          acompanha turno abrindo/PIX confirmando, mas sem re-rodar todas as
          queries do painel 3x mais vezes do que precisa (ver auditoria de
          performance pedida pelo Thiago em 2026-09-19). */}
      <AutoRefresh intervaloMs={15000} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">{sessao.empresaEfetivoNome}</h1>
          <p className="text-stone-500 text-sm mt-0.5">Painel</p>
        </div>
        <SeletorEmpresaV2
          // Mesma correção do v1 (src/app/dashboard/page.tsx) — só passa a
          // lista quando a empresa atual é de fato uma das suas; senão o
          // <select> mostrava a primeira empresa própria como se
          // selecionada mesmo estando numa empresa de cliente (master
          // acessando via /master → Acessar). Reportado pelo Thiago em
          // 2026-09-22 (caso real: BAR CABRAL 322).
          empresas={
            sessao.minhasEmpresas.some((e) => e.id === sessao.empresaEfetivoId) ? sessao.minhasEmpresas : []
          }
          empresaAtivaId={sessao.empresaEfetivoId}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[13px] font-semibold opacity-70">Pagamentos pendentes</span>
          <span className="text-2xl font-extrabold tracking-tight mt-1.5">
            R$ {dados.pagamentosPendentes.total.toFixed(2)}
          </span>
          <span className="text-xs opacity-75 mt-1">
            {dados.pagamentosPendentes.quantidade}{" "}
            {dados.pagamentosPendentes.quantidade === 1 ? "pagamento aguardando" : "pagamentos aguardando"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
          <Pill label="Em turno agora" valor={dados.itensEmTurno.length} />
          <Pill label="Turnos hoje" valor={dados.turnosHoje} />
          <Pill label="Funções" valor={dados.totalFuncoes} />
          <Pill label="Totens ativos" valor={dados.totalTotens} />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-bold text-navy-900">Em turno agora</p>
          <span className="text-[10px] text-stone-400">atualiza sozinho</span>
        </div>
        {dados.itensEmTurno.length === 0 ? (
          <p className="text-stone-500 text-sm">Ninguém em turno neste momento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dados.itensEmTurno.map((item) => (
              <li
                key={`${item.origem}-${item.id}`}
                className={`flex flex-col gap-1.5 bg-stone-50 rounded-xl px-3.5 py-2.5 border-l-4 ${
                  item.origem === "CLT" ? "border-l-navy-400" : "border-l-brand-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <AvatarPessoa pessoaId={item.pessoaId} nome={item.nome} temFoto={item.temFoto} sexo={item.sexo} tamanho="sm" />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={item.origem === "CLT" ? `/v2/funcionarios/${item.pessoaId}` : `/v2/freelancers/${item.pessoaId}`}
                      className="block text-[13px] font-bold text-navy-900 hover:underline truncate"
                    >
                      {item.nome}
                    </Link>
                    <span className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {item.origem === "CLT" ? (
                        <>
                          <BadgeClt />
                          {item.emIntervalo && <BadgeSimples cor="amber">Em intervalo</BadgeSimples>}
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] text-stone-500">{item.funcaoNome}</span>
                          <BadgeModoPagamento modo={item.modoPagamentoAplicado} />
                          <BadgeFrequenciaPagamento frequencia={item.frequenciaPagamentoAplicada} />
                          <BadgeTipoTurno tipo={item.tipoTurno} />
                        </>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-stone-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                    chegou {formatarHora(item.horaEntrada)}
                  </span>
                </div>
                {item.conflitoDesde &&
                  (item.origem === "EXTRA" ? (
                    <ConfirmarSaidaConflitoButton turnoId={item.id} conflitoDesde={item.conflitoDesde} />
                  ) : (
                    <p className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
        resumo={dados.resumoHoje}
        valorTotal={dados.valorTotalHoje}
        vazioGeral="Ninguém encerrou turno hoje ainda."
      />

      <SecaoTurnosFechados
        titulo="Ontem"
        resumo={dados.resumoOntem}
        valorTotal={dados.valorTotalOntem}
        vazioGeral="Ninguém encerrou turno ontem."
        linkImprimir="/relatorios/pagamentos/pdf"
      />
    </div>
  );
}

function Pill({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-3 py-2.5">
      <span className="block text-[10px] text-stone-500 font-semibold truncate">{label}</span>
      <span className="block text-base font-extrabold text-navy-900 mt-0.5">{valor}</span>
    </div>
  );
}

function BadgeSimples({ cor, children }: { cor: "amber" | "indigo" | "purple" | "stone" | "brand"; children: React.ReactNode }) {
  const cores: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
    stone: "bg-stone-100 text-stone-600",
    brand: "bg-brand-100 text-brand-700",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 shrink-0 ${cores[cor]}`}>
      {children}
    </span>
  );
}

function BadgeModoPagamento({ modo }: { modo: ModoPagamento }) {
  return modo === "DIARIA" ? <BadgeSimples cor="amber">Diária</BadgeSimples> : <BadgeSimples cor="stone">Hora</BadgeSimples>;
}

function BadgeFrequenciaPagamento({ frequencia }: { frequencia: FrequenciaPagamento }) {
  return frequencia === "SEMANAL" ? (
    <BadgeSimples cor="indigo">Semanal</BadgeSimples>
  ) : (
    <BadgeSimples cor="stone">Diário</BadgeSimples>
  );
}

function BadgeClt() {
  return <BadgeSimples cor="indigo">CLT</BadgeSimples>;
}

function BadgeTipoTurno({ tipo }: { tipo: TipoTurno | "DOBRADO" }) {
  if (tipo === "DOBRADO") return <BadgeSimples cor="purple">🔁 Dobrado</BadgeSimples>;
  return <BadgeSimples cor="stone">{tipo === "DIA" ? "☀️ Dia" : "🌙 Noite"}</BadgeSimples>;
}

function BadgeStatusPagamento({ status }: { status: "PAGO" | "PENDENTE" | "ERRO" }) {
  if (status === "PAGO") return <BadgeSimples cor="brand">✓ Pago</BadgeSimples>;
  if (status === "ERRO") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 shrink-0">
        Erro no pagamento
      </span>
    );
  }
  return <BadgeSimples cor="amber">Pendente</BadgeSimples>;
}

function BadgeOrigemPagamento({ origem }: { origem: "AUTOMATICO" | "MANUAL" | "MISTO" }) {
  if (origem === "AUTOMATICO") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 shrink-0">
        🌐 Online
      </span>
    );
  }
  if (origem === "MISTO") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 shrink-0">
        🌐✋ Misto
      </span>
    );
  }
  return <BadgeSimples cor="stone">✋ Manual</BadgeSimples>;
}

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
    <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[13px] font-bold text-navy-900">{titulo}</p>
        <div className="flex items-center gap-3">
          {resumo.length > 0 && <span className="text-[13px] font-bold text-navy-900">R$ {valorTotal.toFixed(2)}</span>}
          {linkImprimir && (
            <a
              href={linkImprimir}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone-200 text-[11px] font-bold px-3 py-1.5 text-stone-600"
            >
              🖨️ Imprimir
            </a>
          )}
        </div>
      </div>
      {resumo.length === 0 ? (
        <p className="text-stone-500 text-sm">{vazioGeral}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <GrupoTurno titulo="☀️ Turno dia" cor="amber" pessoas={porDia} vazio="Ninguém no turno do dia." />
          <GrupoTurno titulo="🌙 Turno noite" cor="indigo" pessoas={porNoite} vazio="Ninguém no turno da noite." />
          {porDobrado.length > 0 && (
            <GrupoTurno titulo="🔁 Dobrado" cor="purple" pessoas={porDobrado} vazio="" />
          )}
        </div>
      )}
      <Link href="/v2/turnos" className="block text-[12px] font-bold text-brand-700 mt-3">
        Ver todos os turnos →
      </Link>
    </div>
  );
}

const GRUPO_COR: Record<"amber" | "indigo" | "purple", { bg: string; texto: string }> = {
  amber: { bg: "bg-amber-50", texto: "text-amber-700" },
  indigo: { bg: "bg-indigo-50", texto: "text-indigo-700" },
  purple: { bg: "bg-purple-50", texto: "text-purple-700" },
};

function GrupoTurno({
  titulo,
  cor,
  pessoas,
  vazio,
}: {
  titulo: string;
  cor: "amber" | "indigo" | "purple";
  pessoas: [string, ResumoPessoaTurno][];
  vazio: string;
}) {
  const total = pessoas.reduce((soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0), 0);
  const { bg, texto } = GRUPO_COR[cor];
  return (
    <div className={`rounded-xl overflow-hidden ${bg}`}>
      <div className="px-3 py-1.5 flex items-center justify-between gap-3">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${texto}`}>
          {titulo} · {pessoas.length}
        </span>
        {pessoas.length > 0 && <span className={`text-[10px] font-bold ${texto}`}>R$ {total.toFixed(2)}</span>}
      </div>
      {pessoas.length === 0 ? (
        <p className="text-stone-400 text-xs px-3 pb-2.5">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 px-2 pb-2">
          {pessoas.map(([chave, r]) => (
            <li key={chave} className="bg-white rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-[12.5px] text-navy-900 flex flex-wrap items-center gap-1.5">
                  <Link
                    href={r.origem === "CLT" ? `/v2/funcionarios/${r.pessoaId}` : `/v2/freelancers/${r.pessoaId}`}
                    className="hover:underline"
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
                <p className="text-[10.5px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {formatarHora(r.primeiraEntrada)}–{formatarHora(r.ultimaSaida)} · {r.turnos}{" "}
                  {r.turnos === 1 ? "turno" : "turnos"}
                </p>
              </div>
              {r.origem === "EXTRA" && (
                <span className="flex items-center gap-1.5 shrink-0">
                  <BadgeStatusPagamento status={r.statusPagamento} />
                  {r.statusPagamento === "PAGO" && <BadgeOrigemPagamento origem={r.origemPagamento} />}
                  <span className="text-[12px] font-bold text-navy-900">R$ {r.valorTotal.toFixed(2)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
