"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { solicitarDepositoAsaas } from "./actions";
import CampoValorReais from "@/components/CampoValorReais";
import SeloAsaas from "@/components/SeloAsaas";

const LABEL_STATUS_DEPOSITO: Record<string, string> = {
  PENDENTE: "Aguardando pagamento",
  RECEBIDO: "Recebido",
  EXPIRADO: "Expirado",
};

const COR_STATUS_DEPOSITO: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  RECEBIDO: "bg-brand-50 text-brand-700 border-brand-200",
  EXPIRADO: "bg-stone-100 text-stone-500 border-stone-200",
};

export default function SaldoAsaasCard({
  saldo,
  depositosRecentes,
  pixLiberado,
  splitPercentualAsaas,
  producao,
}: {
  saldo: number | null;
  depositosRecentes: { id: number; valor: number; status: string; criadoEm: Date }[];
  /// null = não deu pra confirmar agora (falha na consulta à Asaas) — nesse
  /// caso não mostra nem o aviso nem a garantia de que está tudo liberado.
  pixLiberado: boolean | null;
  /// 0 = sem taxa de plataforma combinada com esta empresa (padrão). Vindo
  /// de Empresa.splitPercentualAsaas — ver criarDepositoAsaas em
  /// src/lib/pagamentos/asaas-deposito.ts pra onde isso é aplicado de
  /// verdade (Split da Asaas no momento do depósito).
  splitPercentualAsaas: number;
  producao: boolean;
}) {
  const [state, formAction, pending] = useActionState(solicitarDepositoAsaas, undefined);
  const [copiado, setCopiado] = useState(false);
  // A tela toda já se atualiza sozinha a cada 5s (ver AutoRefresh em
  // page.tsx), então basta reagir ao que chega em depositosRecentes — sem
  // precisar de um timer próprio aqui. state.id só existe depois de gerar
  // um PIX nesta mesma visita à página (persiste entre os refreshes porque
  // router.refresh() não remonta o componente).
  const depositoGerado = state?.id !== undefined ? depositosRecentes.find((d) => d.id === state.id) : undefined;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-navy-900 text-sm">Crédito pra pagar extras (Asaas)</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {producao
              ? "💳 Dinheiro de verdade — PIX pago aqui vira crédito real."
              : "🧪 Ambiente de testes (sandbox) — nenhum dinheiro real envolvido ainda."}
          </p>
        </div>
        <p className="text-2xl font-semibold text-navy-900">
          {saldo !== null ? `R$ ${saldo.toFixed(2)}` : "—"}
        </p>
      </div>

      <SeloAsaas porte="pequeno" />

      {pixLiberado === false && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ O Pix desta conta ainda não foi liberado pela Asaas (falta a
          verificação de identidade) — o pagamento automático dos extras só
          começa a funcionar depois disso. Veja o passo a passo em{" "}
          <Link href="/configuracoes" className="underline font-medium">
            Configurações
          </Link>
          .
        </p>
      )}

      {!state?.qrCode ? (
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-3">
            <CampoValorReais name="valor" label="Valor do depósito (R$)" placeholder="500,00" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
            >
              {pending ? "Gerando..." : "Gerar PIX"}
            </button>
          </div>
          {splitPercentualAsaas > 0 && (
            <p className="text-xs text-stone-500">
              Desse valor, {splitPercentualAsaas.toString().replace(".", ",")}% é a taxa de uso da
              plataforma iFREE — o restante cai no seu saldo pra pagar os extras.
            </p>
          )}
        </form>
      ) : depositoGerado?.status === "EXPIRADO" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-600 bg-stone-100 border border-stone-200 rounded-lg px-3 py-2">
            ⌛ Esse PIX expirou sem ser pago.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 self-start transition-colors"
          >
            Gerar um novo PIX
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {depositoGerado?.status === "RECEBIDO" ? (
            <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 font-medium">
              ✅ Pix confirmado! Já caiu no saldo acima.
            </p>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              ⏳ Aguardando confirmação do Pix — a tela atualiza sozinha assim
              que cair.
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-stone-200 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 gerada na hora, não é um asset otimizável pelo next/image */}
            <img src={state.qrCodeImagemUrl} alt="QR code do PIX" className="w-40 h-40 shrink-0" />
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-sm text-stone-600">Escaneie o QR code ou copie o código abaixo pra pagar.</p>
              <textarea
                readOnly
                value={state.qrCode}
                rows={3}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-stone-50 resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(state.qrCode);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
                className="text-sm text-brand-700 underline self-start"
              >
                {copiado ? "Copiado!" : "📋 Copiar código"}
              </button>
            </div>
          </div>
        </div>
      )}

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      {depositosRecentes.length > 0 && (
        <div className="border-t border-stone-100 pt-2">
          <p className="text-xs font-medium text-stone-500 mb-1.5">Depósitos recentes</p>
          <ul className="flex flex-col gap-1">
            {depositosRecentes.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm gap-2">
                <span className="text-stone-600">
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d.criadoEm)}
                </span>
                <span className="font-medium text-stone-800">R$ {d.valor.toFixed(2)}</span>
                <span
                  className={`text-[11px] font-medium rounded-full border px-2 py-0.5 ${COR_STATUS_DEPOSITO[d.status]}`}
                >
                  {LABEL_STATUS_DEPOSITO[d.status] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
