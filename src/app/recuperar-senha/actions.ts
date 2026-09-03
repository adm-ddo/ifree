"use server";

import { prisma } from "@/lib/prisma";
import { criarTokenAutenticacao, tokenRecenteExiste } from "@/lib/tokenAutenticacao";
import { enviarEmailRecuperacaoSenha } from "@/lib/email";
import { captchaValido } from "@/lib/captcha";

export type RecuperarSenhaState = { erro?: string; sucesso?: boolean } | undefined;

/** Sempre a mesma mensagem de sucesso, exista ou não o e-mail na base —
 * nunca revela quem está cadastrado (mesmo cuidado que o fluxo antigo,
 * baseado em nome+CPF, já tinha com sua mensagem de erro genérica). */
export async function solicitarRecuperacaoSenha(
  _prev: RecuperarSenhaState,
  formData: FormData
): Promise<RecuperarSenhaState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  if (!(await captchaValido(formData))) {
    return { erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    // Evita spam de clique no botão de reenviar: não manda outro e-mail
    // se já existe um link válido enviado há menos de 2 minutos.
    const jaTemTokenRecente = await tokenRecenteExiste(usuario.id, "RECUPERACAO_SENHA", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacao(usuario.id, "RECUPERACAO_SENHA", 1);
      await enviarEmailRecuperacaoSenha(email, usuario.nomeCompleto ?? "", token);
    }
  }

  return { sucesso: true };
}
