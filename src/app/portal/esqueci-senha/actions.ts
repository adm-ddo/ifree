"use server";

import { prisma } from "@/lib/prisma";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { criarTokenAutenticacaoPessoa, tokenRecenteExistePessoa } from "@/lib/tokenAutenticacaoPessoa";
import { enviarEmailRecuperacaoSenhaPessoa } from "@/lib/email";
import { mascararEmail } from "@/lib/mascarar";
import { captchaValido } from "@/lib/captcha";

export type EsqueciSenhaState =
  | { erro: string; naoEncontrado?: boolean; semAcesso?: boolean }
  | { sucesso: true; emailMascarado: string }
  | undefined;

/** Pedido do Thiago em 2026-09-26: mostrar pra qual e-mail as instruções
 * foram enviadas, em vez da mensagem genérica de sempre — e-mail vem
 * MASCARADO (mascararEmail, src/lib/mascarar.ts), nunca o endereço
 * inteiro. Isso muda a postura de antes (sempre a mesma mensagem, exista
 * ou não o CPF) só até onde o próprio cadastrar-acesso/actions.ts já
 * concorda que é seguro: CPF não é segredo neste sistema (mesmo
 * comentário de lá), então dizer "CPF não encontrado" ou "esse CPF ainda
 * não tem senha configurada" não vaza nada que valha a pena esconder — o
 * endereço de e-mail em si continua protegido pela máscara. */
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

  if (!pessoa) {
    return {
      erro: "CPF não encontrado. Você nunca trabalhou por uma empresa que usa o iFREE?",
      naoEncontrado: true,
    };
  }
  if (!pessoa.senhaHash) {
    return {
      erro: "Esse CPF ainda não tem senha configurada — crie seu acesso primeiro.",
      semAcesso: true,
    };
  }
  if (!pessoa.email) {
    return {
      erro:
        "Esse cadastro não tem e-mail salvo, então não tem pra onde mandar o link. Peça pra alguém da empresa atualizar seu cadastro com um e-mail.",
    };
  }

  const jaTemTokenRecente = await tokenRecenteExistePessoa(pessoa.id, "RECUPERACAO_SENHA", 2);
  if (!jaTemTokenRecente) {
    const token = await criarTokenAutenticacaoPessoa(pessoa.id, "RECUPERACAO_SENHA", 1);
    await enviarEmailRecuperacaoSenhaPessoa(pessoa.email, pessoa.nome, token);
  }

  return { sucesso: true, emailMascarado: mascararEmail(pessoa.email) };
}
