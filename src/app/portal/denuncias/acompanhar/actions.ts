"use server";

import { redirect } from "next/navigation";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { verificarProtocoloSenha, criarSessaoDenunciaAnonima, registrarLogAuditoria } from "@/lib/etica";

export type EntrarPortalState = { erro?: string } | undefined;

/** Acompanhar uma denúncia ANÔNIMA de dentro do Portal, digitando
 * protocolo+senha — sem escopo por empresa (diferente do canal público
 * em src/app/denuncia/[token]/acompanhar/actions.ts): a pessoa já provou
 * quem é logando no Portal, então pode acompanhar qualquer protocolo seu,
 * de qualquer uma das empresas onde trabalha. O gate de
 * requirePessoaComTermosAceitos é só "precisa estar logada no Portal pra
 * usar esta tela" — a denúncia em si continua sem nenhum vínculo salvo
 * com o pessoaId dela (por isso ela precisa do protocolo+senha, não
 * aparece sozinha em "Minhas denúncias"). */
export async function entrarComProtocoloPortal(
  _prev: EntrarPortalState,
  formData: FormData
): Promise<EntrarPortalState> {
  await requirePessoaComTermosAceitos();

  const resultado = await verificarProtocoloSenha(
    String(formData.get("protocolo") ?? ""),
    String(formData.get("senha") ?? "")
  );
  if ("erro" in resultado) return resultado;

  await criarSessaoDenunciaAnonima(resultado.denunciaId);
  await registrarLogAuditoria(resultado.denunciaId, "acesso_via_protocolo");

  redirect("/portal/denuncias/acompanhar");
}
