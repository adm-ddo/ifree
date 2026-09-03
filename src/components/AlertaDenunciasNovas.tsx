import Link from "next/link";

/** Alerta de denúncia nova (status RECEBIDO, ainda sem triagem) — visual
 * mais forte (vermelho, faixa inteira clicável) que os outros avisos do
 * topo (pagamentos/férias/experiência, todos âmbar) de propósito: é o
 * assunto mais sensível do sistema, precisa chamar atenção de verdade.
 * Some sozinho assim que o responsável abre o caso e muda a etapa —
 * mesmo espírito dos outros avisos (desaparecem quando o item deixa de
 * precisar de atenção, sem precisar de um "marcar como lido" à parte). */
export default function AlertaDenunciasNovas({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;

  return (
    <Link
      href="/etica"
      className="block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 text-center transition-colors"
    >
      🚨 {quantidade} {quantidade === 1 ? "nova denúncia recebida" : "novas denúncias recebidas"} na
      Central de Ética — clique para ver
    </Link>
  );
}
