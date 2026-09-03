"use client";

import { useEffect, useState, useTransition } from "react";
import {
  entrarComProtocoloEmbutido,
  buscarDadosDenunciaAnonima,
  buscarMensagensDenunciaAnonima,
  enviarMensagemDenunciaAnonima,
  type DadosDenunciaAnonima,
} from "@/app/denuncia/[token]/acompanhar/actions";
import { LABEL_CATEGORIA_DENUNCIA } from "@/lib/etica-constantes";
import ChatWindow from "@/components/ChatWindow";
import EtapaDenunciaBadges from "@/components/EtapaDenunciaBadges";

/** Acompanhamento embutido no totem — mesma ideia de TotemNovaDenunciaForm:
 * nunca navega pra /denuncia/[token]/acompanhar, só troca de "fase" dentro
 * deste componente. entrarComProtocoloEmbutido confere protocolo+senha e
 * abre a sessão anônima (cookie) sem redirect(); depois disso, os dados do
 * caso e o chat vêm dos mesmos endpoints que a página pública usa. */
export default function TotemAcompanharPanel({
  tokenDenuncia,
  aoVoltar,
}: {
  tokenDenuncia: string;
  aoVoltar: () => void;
}) {
  const [dados, setDados] = useState<DadosDenunciaAnonima | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [carregandoCaso, setCarregandoCaso] = useState(false);

  function entrar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const protocolo = String(formData.get("protocolo") ?? "");
      const senha = String(formData.get("senha") ?? "");
      const resultado = await entrarComProtocoloEmbutido(tokenDenuncia, protocolo, senha);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setCarregandoCaso(true);
      const dadosCaso = await buscarDadosDenunciaAnonima();
      setCarregandoCaso(false);
      if (!dadosCaso) {
        setErro("Não foi possível carregar a denúncia. Tente de novo.");
        return;
      }
      setDados(dadosCaso);
    });
  }

  if (dados) {
    return (
      <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-left">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-navy-900">
            Protocolo {dados.protocolo.slice(0, 4)}-{dados.protocolo.slice(4)}
          </h1>
          <p className="text-base text-stone-600">
            {LABEL_CATEGORIA_DENUNCIA[dados.categoria]} · Recebida em {dados.criadoEmLabel}
          </p>
          <EtapaDenunciaBadges statusAtual={dados.status} />
        </div>

        <TotemChatDenuncia />

        <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
          Voltar ao check-in
        </button>
      </div>
    );
  }

  return (
    <form
      action={entrar}
      className="flex flex-col gap-4 items-stretch w-full max-w-md text-left"
    >
      <h1 className="text-2xl font-semibold text-navy-900 text-center">Acompanhar denúncia</h1>
      <p className="text-lg text-stone-600 text-center">
        Digite o protocolo e a senha que você recebeu ao denunciar.
      </p>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Protocolo</label>
        <input
          name="protocolo"
          required
          placeholder="1234-567890"
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Senha</label>
        <input
          name="senha"
          required
          placeholder="Senha de 8 caracteres"
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</p>
      )}

      <button
        type="submit"
        disabled={pending || carregandoCaso}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors"
      >
        {pending || carregandoCaso ? "Entrando..." : "Acompanhar denúncia"}
      </button>
      <button type="button" onClick={aoVoltar} className="text-lg text-stone-500 hover:text-stone-700 underline">
        Voltar
      </button>
    </form>
  );
}

/** Chat isolado num componente próprio só pra poder buscar as mensagens
 * iniciais assim que o caso carrega (useEffect), sem precisar subir mais
 * um estado de "mensagens" pro componente pai. */
function TotemChatDenuncia() {
  const [mensagensIniciais, setMensagensIniciais] = useState<
    Awaited<ReturnType<typeof buscarMensagensDenunciaAnonima>> | null
  >(null);

  useEffect(() => {
    buscarMensagensDenunciaAnonima().then(setMensagensIniciais);
  }, []);

  if (!mensagensIniciais) {
    return <p className="text-base text-stone-500 text-center py-6">Carregando conversa...</p>;
  }

  return (
    <ChatWindow
      meuAutor="PESSOA"
      outroNome="Empresa"
      mensagensIniciais={mensagensIniciais.mensagens}
      outraLeituraInicialEm={mensagensIniciais.outraLeituraEm}
      aoBuscar={buscarMensagensDenunciaAnonima}
      aoEnviar={enviarMensagemDenunciaAnonima}
    />
  );
}
