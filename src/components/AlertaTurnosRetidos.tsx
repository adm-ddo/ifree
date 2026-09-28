import Link from "next/link";

/** Turnos com pagamento retido por duração fora do normal — ver
 * Turno.pagamentoRetidoRevisao no schema. Vermelho (mesmo peso de
 * AlertaDenunciasNovas.tsx) de propósito: é dinheiro parado esperando
 * decisão, pedido do Thiago em 2026-09-28 depois de um turno de ~16h30
 * ter sido pago automático por engano (entrada perdida virou "saída" do
 * dia seguinte). */
export default function AlertaTurnosRetidos({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;

  return (
    <Link
      href="/turnos?retido=1"
      className="block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 text-center transition-colors"
    >
      🚨 {quantidade} {quantidade === 1 ? "turno com duração fora do normal" : "turnos com duração fora do normal"} — pagamento RETIDO, não sai sozinho · clique para revisar
    </Link>
  );
}
