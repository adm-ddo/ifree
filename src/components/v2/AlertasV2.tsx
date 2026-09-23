import Link from "next/link";

/** Espelho dos 6 avisos do topo do v1 (src/components/Alerta*.tsx, todos
 * não tocados) — mesmo texto/regra de cada um, empilhados aqui em vez de
 * dentro do AppHeader do v1 (que não aparece na v2). Todos os links já
 * apontam pro /v2. Denúncias novas usa vermelho (mais forte que os
 * outros, âmbar) de propósito — mesmo motivo do v1: é o assunto mais
 * sensível do sistema. */
export default function AlertasV2({
  assinaturaAlerta,
  denunciasNovas,
  candidaturasPendentes,
  candidaturasPendentesComMatch,
  pagamentosPendentes,
  feriasAlerta,
  experienciaAlerta,
  pgrAlerta,
}: {
  assinaturaAlerta: { diasRestantes: number; emTrial: boolean; horasParaBloqueio: number | null } | null;
  denunciasNovas: number;
  candidaturasPendentes: number;
  candidaturasPendentesComMatch: number;
  pagamentosPendentes: { quantidade: number; total: number } | null;
  feriasAlerta: { vencidas: number; vencendoEmBreve: number } | null;
  experienciaAlerta: { vencidos: number; vencendoEmBreve: number } | null;
  pgrAlerta: { nuncaFez: boolean; diasDesdeUltimoCiclo: number | null } | null;
}) {
  return (
    <>
      {assinaturaAlerta && (
        <div
          className={`border-b text-xs px-4 py-2 text-center ${
            assinaturaAlerta.diasRestantes <= 0
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {assinaturaAlerta.diasRestantes <= 0 ? "🚨" : "⏰"}{" "}
          {assinaturaAlerta.diasRestantes <= 0
            ? assinaturaAlerta.emTrial
              ? `⚠️ Seu teste grátis acabou! Sistema será bloqueado em ${assinaturaAlerta.horasParaBloqueio ?? 0} ${(assinaturaAlerta.horasParaBloqueio ?? 0) === 1 ? "hora" : "horas"}`
              : `⚠️ Sistema vencido! Será bloqueado em ${assinaturaAlerta.horasParaBloqueio ?? 0} ${(assinaturaAlerta.horasParaBloqueio ?? 0) === 1 ? "hora" : "horas"}`
            : assinaturaAlerta.emTrial
              ? `Seu teste grátis acaba em ${assinaturaAlerta.diasRestantes} ${assinaturaAlerta.diasRestantes === 1 ? "dia" : "dias"}`
              : `Sua assinatura vence em ${assinaturaAlerta.diasRestantes} ${assinaturaAlerta.diasRestantes === 1 ? "dia" : "dias"}`}{" "}
          ·{" "}
          <Link href="/v2/assinatura" className="underline font-bold">
            renovar agora
          </Link>
        </div>
      )}

      {denunciasNovas > 0 && (
        <Link
          href="/v2/etica"
          className="block bg-red-600 text-white text-xs font-bold px-4 py-2.5 text-center"
        >
          🚨 {denunciasNovas} {denunciasNovas === 1 ? "nova denúncia recebida" : "novas denúncias recebidas"} na
          Central de Ética — clique para ver
        </Link>
      )}

      {candidaturasPendentes > 0 && (
        <div className="bg-brand-50 border-b border-brand-200 text-brand-900 text-xs px-4 py-2 text-center">
          🎯 {candidaturasPendentes} candidatura{candidaturasPendentes === 1 ? "" : "s"} aguardando resposta nas
          suas vagas{candidaturasPendentesComMatch > 0 && ` (${candidaturasPendentesComMatch} com match)`} ·{" "}
          <Link href="/v2/vagas" className="underline font-bold">
            ver vagas
          </Link>
        </div>
      )}

      {pagamentosPendentes && pagamentosPendentes.quantidade > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
          ⚠️ {pagamentosPendentes.quantidade} {pagamentosPendentes.quantidade === 1 ? "pagamento pendente" : "pagamentos pendentes"} · R${" "}
          {pagamentosPendentes.total.toFixed(2)} pra enviar via PIX manualmente ·{" "}
          <Link href="/v2/pagamentos?status=PENDENTE" className="underline font-bold">
            ver quem e quanto
          </Link>
        </div>
      )}

      {feriasAlerta && (feriasAlerta.vencidas > 0 || feriasAlerta.vencendoEmBreve > 0) && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
          🏖️{" "}
          {[
            feriasAlerta.vencidas > 0 &&
              `${feriasAlerta.vencidas} ${feriasAlerta.vencidas === 1 ? "funcionário" : "funcionários"} com férias vencidas`,
            feriasAlerta.vencendoEmBreve > 0 && `${feriasAlerta.vencendoEmBreve} vencendo em até 60 dias`,
          ]
            .filter(Boolean)
            .join(" · ")}{" "}
          ·{" "}
          <Link href="/v2/funcionarios" className="underline font-bold">
            ver funcionários
          </Link>
        </div>
      )}

      {experienciaAlerta && (experienciaAlerta.vencidos > 0 || experienciaAlerta.vencendoEmBreve > 0) && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
          📋{" "}
          {[
            experienciaAlerta.vencidos > 0 && `${experienciaAlerta.vencidos} contrato(s) de experiência vencido(s) sem decisão`,
            experienciaAlerta.vencendoEmBreve > 0 && `${experienciaAlerta.vencendoEmBreve} vencendo em até 15 dias`,
          ]
            .filter(Boolean)
            .join(" · ")}{" "}
          ·{" "}
          <Link href="/v2/funcionarios" className="underline font-bold">
            ver funcionários
          </Link>
        </div>
      )}

      {pgrAlerta && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
          🧠{" "}
          {pgrAlerta.nuncaFez
            ? "Sua empresa ainda não fez a avaliação de riscos psicossociais (PGR/NR-1)"
            : `A reavaliação do PGR (riscos psicossociais) está vencida há ${pgrAlerta.diasDesdeUltimoCiclo! - 365} dia(s) — a NR-1 exige revisão anual`}{" "}
          ·{" "}
          <Link href="/v2/pgr" className="underline font-bold">
            abrir PGR
          </Link>
        </div>
      )}
    </>
  );
}
