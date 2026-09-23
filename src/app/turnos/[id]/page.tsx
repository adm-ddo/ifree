import { notFound } from "next/navigation";
import { requireModulo } from "@/lib/requireModulo";
import { buscarTurnoDaEmpresa } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDataHora, formatarDataHoraComDiaSemana, paraDatetimeLocalBrasil } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { corGrupoPagamento } from "@/lib/grupo-pagamento";
import CorrigirFuncaoForm from "./CorrigirFuncaoForm";
import CorrigirSaidaForm from "./CorrigirSaidaForm";
import AvaliarExtraCard from "./AvaliarExtraCard";
import ConverterVinculoButton from "@/components/ConverterVinculoButton";
import { marcarTurnoDobrado } from "../actions";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

export default async function TurnoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await requireModulo("turnos");
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const turno = await buscarTurnoDaEmpresa(turnoId, sessao.empresaEfetivoId);
  if (!turno) notFound();

  const avaliacaoEmpresa =
    turno.status !== "ABERTO"
      ? await prisma.avaliacao.findUnique({
          where: { turnoId_autor: { turnoId: turno.id, autor: "EMPRESA" } },
          select: { nota: true, tags: true },
        })
      : null;

  const funcoesAtivas = await prisma.funcao.findMany({
    where: { empresaId: sessao.empresaEfetivoId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const [fotoEntradaDataUrl, fotoSaidaDataUrl, assinaturaContratoDataUrl, assinaturaReciboDataUrl] =
    await Promise.all([
      turno.fotoEntradaUrl ? baixarComoDataUrl(turno.fotoEntradaUrl) : null,
      turno.fotoSaidaUrl ? baixarComoDataUrl(turno.fotoSaidaUrl) : null,
      turno.assinaturaContratoUrl ? baixarComoDataUrl(turno.assinaturaContratoUrl) : null,
      turno.assinaturaReciboUrl ? baixarComoDataUrl(turno.assinaturaReciboUrl) : null,
    ]);

  const enderecoCompleto = [
    turno.pessoa.endereco,
    turno.pessoa.numero,
    turno.pessoa.complemento,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">{turno.pessoa.nome}</h1>
          <p className="text-stone-600 mt-1 text-sm">
            {turno.funcao.nome} · {LABEL_TIPO_DOCUMENTO[turno.pessoa.tipoDocumento]}{" "}
            {formatarDocumento(turno.pessoa.tipoDocumento, turno.pessoa.documento)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs rounded-full border px-3 py-1.5 border-stone-300 text-stone-700">
            {STATUS_LABEL[turno.status]}
          </span>
          {turno.pagamento?.status === "CONCLUIDO" && (
            <span
              className={`text-xs rounded-full border px-3 py-1.5 ${
                turno.pagamento.pagoAutomaticamente
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
              title={
                turno.pagamento.pagoAutomaticamente
                  ? "PIX enviado automaticamente pela conta de pagamento conectada"
                  : "Marcado como pago manualmente pelo admin"
              }
            >
              {turno.pagamento.pagoAutomaticamente ? "🌐 Online" : "✋ Manual"}
            </span>
          )}
          {turno.pagamento?.grupoPagamentoId != null && (
            <>
              <span
                className={`text-xs rounded-full border px-3 py-1.5 ${corGrupoPagamento(turno.pagamento.grupoPagamentoId)}`}
                title="Pago junto com outros turnos numa única transferência PIX"
              >
                🔗 Pago em grupo
              </span>
              <Link
                href={`/pagamentos/grupo/${turno.pagamento.grupoPagamentoId}/recibo/pdf`}
                target="_blank"
                className="text-xs text-brand-700 hover:underline"
              >
                Recibo agrupado
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-navy-900 text-sm">Turno</h2>
          <Linha label="Entrada" valor={formatarDataHoraComDiaSemana(turno.horaEntrada)} />
          <Linha
            label="Saída"
            valor={
              turno.horaSaida
                ? formatarDataHoraComDiaSemana(turno.horaSaida, turno.horaEntrada)
                : "Em andamento"
            }
          />
          {turno.minutosArredondados !== null && (
            <Linha
              label="Tempo (arredondado)"
              valor={`${Math.floor(turno.minutosArredondados / 60)}h${String(
                turno.minutosArredondados % 60
              ).padStart(2, "0")}min`}
            />
          )}
          {!!turno.minutosDescontadosPausa && (
            <Linha
              label="Intervalo descontado"
              valor={`${turno.minutosDescontadosPausa}min`}
            />
          )}
          {turno.modoPagamentoAplicado === "DIARIA" && turno.valorDiariaAplicada !== null ? (
            <Linha
              label="Diária combinada"
              valor={`R$ ${Number(turno.valorDiariaAplicada).toFixed(2)}`}
            />
          ) : (
            <Linha
              label="Valor/hora aplicado"
              valor={`R$ ${Number(turno.valorHoraAplicado).toFixed(2)}`}
            />
          )}
          {turno.valorTotal !== null && (
            <Linha
              label="Valor total"
              valor={`R$ ${Number(turno.valorTotal).toFixed(2)}`}
              destaque
            />
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-navy-900 text-sm">Pagamento</h2>
          <Linha
            label={`Chave PIX (${turno.pessoa.tipoChavePix ? LABEL_TIPO_CHAVE_PIX[turno.pessoa.tipoChavePix] : "—"})`}
            valor={turno.pessoa.chavePix ?? "—"}
          />
          <Linha label="Empresa" valor={`${turno.empresa.nome} · ${turno.empresa.cnpj}`} />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:col-span-2">
          <h2 className="font-semibold text-navy-900 text-sm">Contato</h2>
          <Linha label="Telefone" valor={turno.pessoa.telefone} />
          <Linha label="Endereço" valor={enderecoCompleto} />
        </div>
      </div>

      {turno.status !== "ABERTO" && (
        <AvaliarExtraCard turnoId={turno.id} pessoaNome={turno.pessoa.nome} avaliacaoExistente={avaliacaoEmpresa} />
      )}

      {turno.criadoManualmente && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          📝 Lançado manualmente por {turno.criadoManualmentePorEmail} — sem foto/assinatura, esse
          turno não passou pelo totem.
        </div>
      )}

      {turno.correcaoFuncaoEm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Função corrigida pelo administrador ({turno.correcaoFuncaoPorEmail}) em{" "}
          {formatarDataHora(turno.correcaoFuncaoEm)} — era{" "}
          <strong>{turno.funcaoOriginalNome}</strong>
          {turno.valorHoraOriginalAplicado !== null && (
            <> (R$ {Number(turno.valorHoraOriginalAplicado).toFixed(2)}/h)</>
          )}
          .
        </div>
      )}

      {turno.status !== "PAGO" && (
        <CorrigirFuncaoForm
          turnoId={turno.id}
          funcaoAtualId={turno.funcao.id}
          funcoes={funcoesAtivas}
        />
      )}

      {/* Ninguém bateu a saída e ainda não foi resolvido de nenhuma forma —
          por padrão o sistema já fechou como se fosse só 1 turno (o dia),
          já que essa é a regra pra maioria das pessoas; aqui pergunta
          explicitamente se essa pessoa é exceção (emendou pro da noite),
          deixando as duas saídas lado a lado em vez de espalhadas. */}
      {turno.fechamentoAutomatico && !turno.correcaoSaidaEm && !turno.turnoDobrado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-3">
          <p className="text-xs text-amber-800">
            ⏱️ Ninguém bateu a saída — o sistema encerrou este turno sozinho no
            horário de corte de 1 turno (regra padrão). Essa pessoa emendou pro
            turno da noite (dobrou)?
          </p>
          <ConverterVinculoButton
            action={marcarTurnoDobrado}
            pessoaId={turno.id}
            label="🔁 Sim, dobrou — marcar como turno dobrado"
            confirmText="Marcar esse turno como dobrado (dia + noite seguidos)? O horário de saída e o valor vão ser recalculados com o corte da noite e o intervalo de pausa em dobro."
          />
          <p className="text-xs text-amber-700">
            Se não dobrou, só corrija o horário de saída certo do turno abaixo.
          </p>
          {turno.status === "PAGO" && (
            <p className="text-xs text-amber-700">
              Esse turno já está marcado como pago — o valor vai ser
              recalculado; se já tiver enviado o PIX com o valor antigo,
              confira se precisa ajustar a diferença por fora.
            </p>
          )}
        </div>
      )}

      {turno.turnoDobrado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          🔁 Turno marcado como dobrado (dia + noite seguidos).
        </div>
      )}

      {turno.correcaoSaidaEm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Saída corrigida manualmente pela empresa ({turno.correcaoSaidaPorEmail}) em{" "}
          {formatarDataHora(turno.correcaoSaidaEm)}
          {turno.horaSaidaOriginal && (
            <>
              {" "}
              — o sistema tinha encerrado sozinho às{" "}
              <strong>{formatarDataHora(turno.horaSaidaOriginal)}</strong>
            </>
          )}
          .
        </div>
      )}

      {turno.status !== "ABERTO" &&
        (turno.fechamentoAutomatico || turno.correcaoSaidaEm) &&
        turno.horaSaida && (
          <div id="corrigir-saida" className="flex flex-col gap-3 scroll-mt-4">
            {turno.status === "PAGO" && (
              <p className="text-xs text-stone-500 -mb-2">
                Esse turno já está marcado como pago — corrigir aqui atualiza
                as horas e o valor também; se já tiver enviado o PIX com o
                valor antigo, confira se precisa ajustar a diferença por
                fora.
              </p>
            )}
            <CorrigirSaidaForm
              turnoId={turno.id}
              horaSaidaAtualValue={paraDatetimeLocalBrasil(turno.horaSaida)}
            />
          </div>
        )}

      {/* Fora do caso acima (ex.: turno já corrigido, ou lançado manualmente)
          o atalho de marcar como dobrado continua disponível sozinho. */}
      {!turno.turnoDobrado &&
        !(turno.fechamentoAutomatico && !turno.correcaoSaidaEm) && (
          <ConverterVinculoButton
            action={marcarTurnoDobrado}
            pessoaId={turno.id}
            label="🔁 Marcar turno como dobrado"
            confirmText="Marcar esse turno como dobrado (dia + noite seguidos)? Se já tiver sido encerrado sozinho pelo sistema, o horário de saída e o valor vão ser recalculados com o corte da noite e o intervalo em dobro."
          />
        )}

      {(fotoEntradaDataUrl || fotoSaidaDataUrl || assinaturaContratoDataUrl || assinaturaReciboDataUrl) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fotoEntradaDataUrl && <FotoCard titulo="Foto na entrada" src={fotoEntradaDataUrl} />}
          {fotoSaidaDataUrl && <FotoCard titulo="Foto na saída" src={fotoSaidaDataUrl} />}
          {assinaturaContratoDataUrl && (
            <FotoCard titulo="Assinatura do contrato" src={assinaturaContratoDataUrl} />
          )}
          {assinaturaReciboDataUrl && (
            <FotoCard titulo="Assinatura do recibo" src={assinaturaReciboDataUrl} />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {turno.assinaturaContratoUrl && (
          <a
            href={`/turnos/${turno.id}/contrato/pdf`}
            target="_blank"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50"
          >
            Ver contrato (PDF)
          </a>
        )}
        {turno.status !== "ABERTO" && turno.assinaturaReciboUrl && (
          <a
            href={`/turnos/${turno.id}/recibo/pdf`}
            target="_blank"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50"
          >
            Ver recibo (PDF)
          </a>
        )}
      </div>
    </div>
  );
}

function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className={destaque ? "font-semibold text-brand-700" : "text-navy-900"}>
        {valor}
      </span>
    </div>
  );
}

function FotoCard({ titulo, src }: { titulo: string; src: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm flex flex-col gap-2">
      <p className="text-xs text-stone-500">{titulo}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={titulo} className="rounded-lg border border-stone-200 w-full object-contain" />
    </div>
  );
}
