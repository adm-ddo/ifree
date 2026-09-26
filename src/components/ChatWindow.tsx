"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export type MensagemChat = {
  id: number;
  autor: "EMPRESA" | "PESSOA";
  texto: string;
  criadoEm: string;
};

/// Baixado de 5000 pra 2000 (pedido do Thiago em 2026-09-26) — mensagem
/// nova demorava até 5s pra aparecer do outro lado, parecia "travado" pra
/// quem já está acostumado com chat de verdade (WhatsApp etc.).
const INTERVALO_POLL_MS = 2000;

export type ResultadoBusca = { mensagens: MensagemChat[]; outraLeituraEm: string | null };

/** Janela de chat compartilhada pelos dois lados (empresa em /conversas,
 * freelancer em /portal/conversas) — a diferença entre um lado e outro é
 * só qual server action cada `aoEnviar`/`aoBuscar` chama por trás, a UI é
 * a mesma. Sem WebSocket: atualiza sozinha a cada poucos segundos
 * enquanto a tela está aberta (ver INTERVALO_POLL_MS) — o app inteiro
 * hoje é request/response, não vale introduzir infra nova só pra isso.
 *
 * `outraLeituraEm` é quando o OUTRO lado leu a conversa pela última vez —
 * cada `aoBuscar` também marca minha própria leitura no servidor (ver as
 * actions), então isso vem sempre atualizado nesse mesmo poll. Compara
 * contra o criadoEm de cada mensagem MINHA pra desenhar o tique duplo
 * (lida) ou simples (enviada), estilo WhatsApp. */
export default function ChatWindow({
  meuAutor,
  mensagensIniciais,
  outraLeituraInicialEm,
  aoEnviar,
  aoBuscar,
  outroNome,
}: {
  meuAutor: "EMPRESA" | "PESSOA";
  mensagensIniciais: MensagemChat[];
  outraLeituraInicialEm: string | null;
  aoEnviar: (texto: string) => Promise<{ erro?: string } | void>;
  aoBuscar: () => Promise<ResultadoBusca>;
  outroNome: string;
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [outraLeituraEm, setOutraLeituraEm] = useState(outraLeituraInicialEm);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const resultado = await aoBuscar();
        setMensagens(resultado.mensagens);
        setOutraLeituraEm(resultado.outraLeituraEm);
      } catch {
        // Falha de poll não deveria travar o chat — só tenta de novo no
        // próximo ciclo.
      }
    }, INTERVALO_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aoBuscar é estável por render (closure da action), recriar o intervalo a cada render seria redundante
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  function enviar() {
    const valor = texto.trim();
    if (!valor) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await aoEnviar(valor);
      if (resultado && "erro" in resultado && resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setTexto("");
      const novoResultado = await aoBuscar();
      setMensagens(novoResultado.mensagens);
      setOutraLeituraEm(novoResultado.outraLeituraEm);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-stone-200 px-4 py-3">
        <h1 className="font-semibold text-navy-900">{outroNome}</h1>
      </div>

      <div className="flex flex-col gap-2 px-4 py-2 max-h-[60vh] overflow-y-auto min-h-[200px]">
        {mensagens.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-8">
            Nenhuma mensagem ainda — diga oi!
          </p>
        ) : (
          mensagens.map((m) => {
            const minha = m.autor === meuAutor;
            const lida = minha && !!outraLeituraEm && outraLeituraEm > m.criadoEm;
            return (
              <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    minha
                      ? "bg-brand-500 text-navy-900"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {m.texto}
                  {minha && (
                    <span
                      className={`ml-1.5 text-xs align-middle ${lida ? "text-navy-900" : "text-navy-900/40"}`}
                      title={lida ? "Lida" : "Enviada"}
                    >
                      {lida ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      <div className="border-t border-stone-200 p-3 flex flex-col gap-2">
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Escreva uma mensagem..."
            maxLength={2000}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={pending || !texto.trim()}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
