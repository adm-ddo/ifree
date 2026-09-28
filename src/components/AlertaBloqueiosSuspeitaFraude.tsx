import Link from "next/link";

/** Pessoas bloqueadas automaticamente no totem por bater entrada fora dos
 * turnos permitidos — ver VinculoPessoaEmpresa.bloqueadoSuspeitaFraudeEm
 * no schema. Vermelho (mesmo peso de AlertaDenunciasNovas.tsx e
 * AlertaTurnosRetidos.tsx) de propósito: bloqueio de acesso por suspeita
 * de fraude, pedido do Thiago em 2026-09-28. */
export default function AlertaBloqueiosSuspeitaFraude({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;

  return (
    <Link
      href="/freelancers?bloqueado=1"
      className="block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 text-center transition-colors"
    >
      🚨 {quantidade} {quantidade === 1 ? "pessoa bloqueada" : "pessoas bloqueadas"} por suspeita de fraude no
      totem · clique para revisar
    </Link>
  );
}
