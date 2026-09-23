import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireResponsavelEtica, slaVencido, LABEL_CATEGORIA_DENUNCIA, LABEL_STATUS_DENUNCIA } from "@/lib/etica";
import { formatarDataHora } from "@/lib/data";
import ChatWindow from "@/components/ChatWindow";
import GravidadeSelect from "@/app/etica/[id]/GravidadeSelect";
import StatusStepper from "@/app/etica/[id]/StatusStepper";
import { buscarMensagensDenunciaEmpresa, enviarMensagemDenunciaEmpresa } from "@/app/etica/actions";

/** Espelho completo de src/app/etica/[id]/page.tsx (v1, não tocado) —
 * reaproveita GravidadeSelect, StatusStepper e ChatWindow direto (sem
 * link hardcoded pro v1 em nenhum deles). Só o cabeçalho muda. */
export default async function V2DenunciaEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireResponsavelEtica();
  const { id } = await params;
  const denunciaId = Number(id);
  if (!Number.isInteger(denunciaId)) notFound();

  const denuncia = await prisma.denuncia.findUnique({
    where: { id: denunciaId },
    select: {
      id: true,
      empresaId: true,
      protocolo: true,
      categoria: true,
      descricao: true,
      gravidade: true,
      status: true,
      identificado: true,
      criadoEm: true,
      prazoSlaEm: true,
      pessoa: { select: { nome: true, documento: true } },
      etapas: { orderBy: { criadoEm: "asc" }, select: { status: true, observacao: true, autorEmail: true, criadoEm: true } },
      logs: { orderBy: { criadoEm: "desc" }, select: { acao: true, detalhe: true, autorEmail: true, criadoEm: true } },
    },
  });
  if (!denuncia || denuncia.empresaId !== sessao.empresaEfetivoId) notFound();

  const { mensagens: mensagensIniciais } = await buscarMensagensDenunciaEmpresa(denunciaId);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-4 flex-wrap text-xs font-bold">
        <Link href="/v2/etica" className="text-brand-700">
          ← Central de Ética
        </Link>
        <a href={`/etica/${denunciaId}/pdf`} target="_blank" rel="noopener noreferrer" className="text-brand-700">
          🖨️ Gerar PDF do caso
        </a>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold text-navy-900">
            Protocolo {denuncia.protocolo.slice(0, 4)}-{denuncia.protocolo.slice(4)}
          </h1>
          {slaVencido(denuncia) && (
            <span className="rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-bold px-3 py-1">SLA vencido</span>
          )}
        </div>
        <p className="text-sm text-stone-600">
          {LABEL_CATEGORIA_DENUNCIA[denuncia.categoria]} · Recebida em {formatarDataHora(denuncia.criadoEm)}
        </p>
        <p className="text-sm text-stone-600">
          {denuncia.identificado ? (
            <>
              Identificado: <strong>{denuncia.pessoa?.nome ?? "—"}</strong>
            </>
          ) : (
            "Denúncia anônima"
          )}
        </p>
        <div className="border-t border-stone-100 pt-2 mt-1">
          <p className="text-sm text-stone-700 whitespace-pre-line">{denuncia.descricao}</p>
        </div>
      </div>

      <GravidadeSelect denunciaId={denunciaId} gravidadeAtual={denuncia.gravidade} />

      <StatusStepper denunciaId={denunciaId} statusAtual={denuncia.status} />

      <ChatWindow
        meuAutor="EMPRESA"
        outroNome={denuncia.identificado ? denuncia.pessoa?.nome ?? "Denunciante" : "Denunciante (anônimo)"}
        mensagensIniciais={mensagensIniciais}
        outraLeituraInicialEm={null}
        aoBuscar={buscarMensagensDenunciaEmpresa.bind(null, denunciaId)}
        aoEnviar={enviarMensagemDenunciaEmpresa.bind(null, denunciaId)}
      />

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col gap-3">
        <h2 className="font-bold text-navy-900 text-sm">Linha do tempo</h2>
        <ul className="flex flex-col gap-2">
          {denuncia.etapas.map((e, i) => (
            <li key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0 last:pb-0">
              <p className="font-bold text-navy-900">{LABEL_STATUS_DENUNCIA[e.status]}</p>
              <p className="text-xs text-stone-500">
                {formatarDataHora(e.criadoEm)} · {e.autorEmail ?? "Automático"}
              </p>
              {e.observacao && <p className="text-xs text-stone-600 mt-0.5">{e.observacao}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 flex flex-col gap-3">
        <h2 className="font-bold text-navy-900 text-sm">Log de auditoria</h2>
        <ul className="flex flex-col gap-2">
          {denuncia.logs.map((l, i) => (
            <li key={i} className="text-xs text-stone-600 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
              <span className="font-bold text-navy-900">{l.acao}</span>
              {l.detalhe && <> — {l.detalhe}</>}
              <span className="text-stone-400">
                {" "}
                · {formatarDataHora(l.criadoEm)}
                {l.autorEmail ? ` · ${l.autorEmail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
