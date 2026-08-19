import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { formatarDataHora } from "@/lib/data";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";

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
  const sessao = await requireTenant();
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const turno = await buscarTurnoDaEmpresa(turnoId, sessao.empresaEfetivoId);
  if (!turno) notFound();

  const [fotoEntradaDataUrl, fotoSaidaDataUrl, assinaturaContratoDataUrl, assinaturaReciboDataUrl] =
    await Promise.all([
      baixarComoDataUrl(turno.fotoEntradaUrl),
      turno.fotoSaidaUrl ? baixarComoDataUrl(turno.fotoSaidaUrl) : null,
      baixarComoDataUrl(turno.assinaturaContratoUrl),
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
        <span className="text-xs rounded-full border px-3 py-1.5 border-stone-300 text-stone-700 shrink-0">
          {STATUS_LABEL[turno.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-navy-900 text-sm">Turno</h2>
          <Linha label="Entrada" valor={formatarDataHora(turno.horaEntrada)} />
          <Linha
            label="Saída"
            valor={turno.horaSaida ? formatarDataHora(turno.horaSaida) : "Em andamento"}
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
            label={`Chave PIX (${LABEL_TIPO_CHAVE_PIX[turno.pessoa.tipoChavePix]})`}
            valor={turno.pessoa.chavePix}
          />
          <Linha label="Empresa" valor={`${turno.empresa.nome} · ${turno.empresa.cnpj}`} />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:col-span-2">
          <h2 className="font-semibold text-navy-900 text-sm">Contato</h2>
          <Linha label="Telefone" valor={turno.pessoa.telefone} />
          <Linha label="Endereço" valor={enderecoCompleto} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FotoCard titulo="Foto na entrada" src={fotoEntradaDataUrl} />
        {fotoSaidaDataUrl && <FotoCard titulo="Foto na saída" src={fotoSaidaDataUrl} />}
        <FotoCard titulo="Assinatura do contrato" src={assinaturaContratoDataUrl} />
        {assinaturaReciboDataUrl && (
          <FotoCard titulo="Assinatura do recibo" src={assinaturaReciboDataUrl} />
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/turnos/${turno.id}/contrato/pdf`}
          target="_blank"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50"
        >
          Ver contrato (PDF)
        </a>
        {turno.status !== "ABERTO" && (
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
