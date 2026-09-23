import Link from "next/link";

/** Aviso proativo de renovação — aparece a partir de
 * Empresa.avisoVencimentoDias antes do vencimento (escolhido pelo próprio
 * dono em /configuracoes, ver AssinaturaConfigForm.tsx), tanto em TRIAL
 * quanto já ATIVA. Diferente do bloqueio de ATRASADA/CANCELADA (que
 * redireciona pra /assinatura à força): aqui o painel continua funcionando
 * normal, é só um lembrete com atalho pro PIX que já está pronto em
 * /assinatura.
 *
 * A partir do vencimento (diasRestantes <= 0) troca pro tom de urgência
 * pedido pelo Thiago em 2026-09-22: em vez de só dizer que já venceu,
 * mostra a contagem regressiva em horas até o bloqueio de verdade
 * (ATRASADA, ver GRACA_DIAS em src/lib/assinatura.ts) — gatilho de
 * urgência pra evitar surpresa quando o sistema travar. */
export default function AlertaAssinaturaVencendo({
  diasRestantes,
  emTrial,
  horasParaBloqueio,
}: {
  diasRestantes: number;
  emTrial: boolean;
  horasParaBloqueio: number | null;
}) {
  const vencido = diasRestantes <= 0;
  const horas = horasParaBloqueio ?? 0;
  const mensagem = vencido
    ? emTrial
      ? `⚠️ Seu teste grátis acabou! Sistema será bloqueado em ${horas} ${horas === 1 ? "hora" : "horas"}`
      : `⚠️ Sistema vencido! Será bloqueado em ${horas} ${horas === 1 ? "hora" : "horas"}`
    : emTrial
      ? `Seu teste grátis acaba em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`
      : `Sua assinatura vence em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`;

  return (
    <div
      className={`border-b text-sm px-4 py-2 text-center ${
        vencido ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900"
      }`}
    >
      {vencido ? "🚨" : "⏰"} {mensagem} ·{" "}
      <Link href="/assinatura" className="underline font-semibold">
        renovar agora
      </Link>
    </div>
  );
}
