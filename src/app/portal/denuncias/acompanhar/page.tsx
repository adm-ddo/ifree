import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { getDenunciaIdDaSessaoAnonima, LABEL_CATEGORIA_DENUNCIA } from "@/lib/etica";
import { formatarDataHora } from "@/lib/data";
import ChatWindow from "@/components/ChatWindow";
import EtapaDenunciaBadges from "@/components/EtapaDenunciaBadges";
import EntrarPortalForm from "./EntrarPortalForm";
import { buscarMensagensDenunciaAnonima, enviarMensagemDenunciaAnonima } from "@/app/denuncia/[token]/acompanhar/actions";

/** Acompanhar uma denúncia ANÔNIMA (mesmo feita fora do Portal) digitando
 * protocolo+senha, sem sair do Portal — alternativa ao link público
 * (/denuncia/[token]/acompanhar) pra quem já está logada e prefere não
 * precisar do link específico daquela empresa. As identificadas já
 * aparecem sozinhas em /portal/denuncias, não precisam disto. */
export default async function AcompanharDenunciaPortalPage() {
  await requirePessoaComTermosAceitos();

  const denunciaId = await getDenunciaIdDaSessaoAnonima();
  const denuncia = denunciaId
    ? await prisma.denuncia.findUnique({
        where: { id: denunciaId },
        select: {
          protocolo: true,
          categoria: true,
          status: true,
          criadoEm: true,
          empresa: { select: { nome: true } },
        },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 text-sm">
        <Link href="/portal/denuncias" className="text-brand-700 hover:underline">
          ← Canal de Ética
        </Link>
      </div>

      {!denuncia ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold text-navy-900">Acompanhar denúncia anônima</h1>
            <p className="text-stone-600 mt-1 text-sm">
              Digite o protocolo e a senha que você recebeu ao denunciar
              (pelo totem, pelo link público, ou por aqui mesmo).
            </p>
          </div>
          <EntrarPortalForm />
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-navy-900">
              Protocolo {denuncia.protocolo.slice(0, 4)}-{denuncia.protocolo.slice(4)}
            </h1>
            <p className="text-sm text-stone-600">
              {denuncia.empresa.nome} · {LABEL_CATEGORIA_DENUNCIA[denuncia.categoria]} ·{" "}
              {formatarDataHora(denuncia.criadoEm)}
            </p>
            <EtapaDenunciaBadges statusAtual={denuncia.status} />
          </div>

          <ChatWindow
            meuAutor="PESSOA"
            outroNome={denuncia.empresa.nome}
            mensagensIniciais={(await buscarMensagensDenunciaAnonima()).mensagens}
            outraLeituraInicialEm={null}
            aoBuscar={buscarMensagensDenunciaAnonima}
            aoEnviar={enviarMensagemDenunciaAnonima}
          />
        </>
      )}
    </div>
  );
}
