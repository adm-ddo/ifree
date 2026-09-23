import Link from "next/link";
import { buscarTokenValidoPessoa } from "@/lib/tokenAutenticacaoPessoa";
import ConfirmarTrocaEmailForm from "./ConfirmarTrocaEmailForm";

const MOTIVO_LABEL: Record<string, string> = {
  expirado: "Esse link de confirmação expirou.",
  usado: "Esse link já foi usado.",
  invalido: "Esse link não é válido.",
};

/** Segunda metade do fluxo de troca de e-mail (ver solicitarTrocaEmail,
 * src/app/portal/actions.ts) — clicado a partir do link mandado pro e-mail
 * NOVO, não pro atual. Rota pública (sem requirePessoa): quem clica pode
 * estar num aparelho diferente de onde está logado no Portal. */
export default async function ConfirmarEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await buscarTokenValidoPessoa(token, "TROCA_EMAIL");

  if (!resultado.valido || !resultado.novoEmailPendente) {
    const motivo = resultado.valido ? "invalido" : resultado.motivo;
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
          <h1 className="text-xl font-semibold text-navy-900">Link inválido</h1>
          <p className="text-sm text-stone-600">
            {MOTIVO_LABEL[motivo]} Peça a troca de e-mail de novo no seu perfil do Portal.
          </p>
          <Link href="/portal" className="text-brand-700 underline text-sm">
            Voltar pro Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <ConfirmarTrocaEmailForm token={token} novoEmail={resultado.novoEmailPendente} />
    </div>
  );
}
