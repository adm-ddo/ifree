import Link from "next/link";

export default function AlertaPagamentosPendentes({
  quantidade,
  total,
}: {
  quantidade: number;
  total: number;
}) {
  if (quantidade === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
      ⚠️ {quantidade} {quantidade === 1 ? "pagamento pendente" : "pagamentos pendentes"} · R${" "}
      {total.toFixed(2)} pra enviar via PIX manualmente ·{" "}
      <Link href="/pagamentos?status=PENDENTE" className="underline font-medium">
        ver quem e quanto
      </Link>
    </div>
  );
}
