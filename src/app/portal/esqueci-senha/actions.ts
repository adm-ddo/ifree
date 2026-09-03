"use server";

import { prisma } from "@/lib/prisma";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { criarTokenAutenticacaoPessoa, tokenRecenteExistePessoa } from "@/lib/tokenAutenticacaoPessoa";
import { enviarEmailRecuperacaoSenhaPessoa } from "@/lib/email";
import { captchaValido } from "@/lib/captcha";

export type EsqueciSenhaState = { erro?: string; sucesso?: boolean } | undefined;

/** Sempre a mesma mensagem de sucesso, exista ou não o CPF, tenha ou não
 * acesso configurado — nunca revela se um CPF já tem Portal ativo pra
 * quem só sabe o número (CPF não é segredo, ver actions.ts de
 * cadastrar-acesso). */
export async function solicitarRecuperacaoSenhaPessoa(
  _prev: EsqueciSenhaState,
  formData: FormData
): Promise<EsqueciSenhaState> {
  const cpfBruto = String(formData.get("cpf") ?? "");
  if (!cpfValido(cpfBruto)) return { erro: "Informe um CPF válido." };

  if (!(await captchaValido(formData))) {
    return { erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  const documento = apenasDigitos(cpfBruto);
  const pessoa = await prisma.pessoa.findUnique({ where: { documento } });

  if (pessoa?.email && pessoa.senhaHash) {
    const jaTemTokenRecente = await tokenRecenteExistePessoa(pessoa.id, "RECUPERACAO_SENHA", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacaoPessoa(pessoa.id, "RECUPERACAO_SENHA", 1);
      await enviarEmailRecuperacaoSenhaPessoa(pessoa.email, pessoa.nome, token);
    }
  }

  return { sucesso: true };
}
