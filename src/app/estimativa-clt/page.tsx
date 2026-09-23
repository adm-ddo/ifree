import { requireModulo } from "@/lib/requireModulo";
import { prisma } from "@/lib/prisma";

function mesReferencia(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(data);
}

export default async function EstimativaCltPage({
  searchParams,
}: {
  searchParams: Promise<{ pessoaId?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireModulo("estimativaClt");
  const { pessoaId, inicio, fim } = await searchParams;

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, ativo: true },
    include: { pessoa: { select: { id: true, nome: true } } },
    orderBy: { pessoa: { nome: "asc" } },
  });

  const pessoaIdNum = pessoaId ? Number(pessoaId) : null;
  const pessoaSelecionada = vinculos.find((v) => v.pessoa.id === pessoaIdNum)?.pessoa ?? null;

  let resultado: {
    totalRecebido: number;
    quantidadeTurnos: number;
    mesesTrabalhados: number;
    remuneracaoMediaMensal: number;
    feriasProporcionais: number;
    decimoTerceiroProporcional: number;
    fgtsAcumulado: number;
    multaFgts: number;
    inssPatronalEstimado: number;
    totalDireitosTrabalhador: number;
  } | null = null;

  if (pessoaIdNum && inicio && fim) {
    const dataInicio = new Date(`${inicio}T00:00:00-03:00`);
    const dataFim = new Date(`${fim}T23:59:59-03:00`);

    const turnos = await prisma.turno.findMany({
      where: {
        pessoaId: pessoaIdNum,
        empresaId: sessao.empresaEfetivoId,
        status: "PAGO",
        horaEntrada: { gte: dataInicio, lte: dataFim },
      },
      select: { valorTotal: true, horaEntrada: true },
    });

    const totalRecebido = turnos.reduce((soma, t) => soma + Number(t.valorTotal ?? 0), 0);
    const meses = new Set(turnos.map((t) => mesReferencia(t.horaEntrada)));
    const mesesTrabalhados = meses.size;
    const remuneracaoMediaMensal = mesesTrabalhados > 0 ? totalRecebido / mesesTrabalhados : 0;

    const baseFerias = (remuneracaoMediaMensal / 12) * mesesTrabalhados;
    const feriasProporcionais = baseFerias + baseFerias / 3;
    const decimoTerceiroProporcional = (remuneracaoMediaMensal / 12) * mesesTrabalhados;
    const fgtsAcumulado = totalRecebido * 0.08;
    const multaFgts = fgtsAcumulado * 0.4;
    const inssPatronalEstimado = totalRecebido * 0.2;

    resultado = {
      totalRecebido,
      quantidadeTurnos: turnos.length,
      mesesTrabalhados,
      remuneracaoMediaMensal,
      feriasProporcionais,
      decimoTerceiroProporcional,
      fgtsAcumulado,
      multaFgts,
      inssPatronalEstimado,
      totalDireitosTrabalhador: feriasProporcionais + decimoTerceiroProporcional + fgtsAcumulado + multaFgts,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Estimativa de custo CLT</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Quanto custaria, aproximadamente, se essa pessoa tivesse sido
          registrada como CLT no período — só pra decisão interna.
        </p>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 text-red-900 p-4 text-sm leading-relaxed">
        <p className="font-semibold">Isto não é um recibo, holerite ou documento legal.</p>
        <p className="mt-1">
          É só uma estimativa de valores calculada em cima do histórico de
          turnos pagos, pra apoiar decisão interna (ex: vale a pena
          formalizar essa pessoa como CLT? negociar um acordo de verdade?).
          Não tem assinatura, não é prova de pagamento, e não substitui um
          advogado trabalhista ou contador — alíquotas de INSS/FGTS podem
          mudar, e um acordo de verdade precisa ser desenhado por um
          profissional pra ter validade.
        </p>
      </div>

      <form method="GET" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-stone-500">Pessoa</label>
          <select
            name="pessoaId"
            defaultValue={pessoaId ?? ""}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            {vinculos.map((v) => (
              <option key={v.pessoa.id} value={v.pessoa.id}>
                {v.pessoa.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">De</label>
          <input
            type="date"
            name="inicio"
            defaultValue={inicio ?? ""}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Até</label>
          <input
            type="date"
            name="fim"
            defaultValue={fim ?? ""}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Calcular
        </button>
      </form>

      {pessoaIdNum && inicio && fim && resultado && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-navy-900">{pessoaSelecionada?.nome}</h2>
            <p className="text-xs text-stone-500">
              {resultado.quantidadeTurnos} turno(s) pago(s) no período · {resultado.mesesTrabalhados} mês(es)
              com pelo menos 1 turno · recebimento total R$ {resultado.totalRecebido.toFixed(2)} · média
              mensal estimada R$ {resultado.remuneracaoMediaMensal.toFixed(2)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-2">
              Se fosse CLT, o que a pessoa teria direito de receber (estimativa)
            </h3>
            <Linha label="Férias proporcionais + 1/3" valor={resultado.feriasProporcionais} />
            <Linha label="13º salário proporcional" valor={resultado.decimoTerceiroProporcional} />
            <Linha label="FGTS acumulado (8%)" valor={resultado.fgtsAcumulado} />
            <Linha label="Multa de 40% sobre o FGTS" valor={resultado.multaFgts} />
            <div className="flex items-center justify-between text-sm pt-2 mt-1 border-t border-stone-200 font-semibold">
              <span className="text-stone-700">Total estimado</span>
              <span className="text-brand-700">R$ {resultado.totalDireitosTrabalhador.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-2">
              Custo adicional só da empresa (não é pago à pessoa)
            </h3>
            <Linha label="INSS patronal estimado (~20%)" valor={resultado.inssPatronalEstimado} />
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-stone-500">{label}</span>
      <span className="text-navy-900">R$ {valor.toFixed(2)}</span>
    </div>
  );
}
