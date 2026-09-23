"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha, criarSessao } from "@/lib/auth";
import { buscarConviteValido } from "@/lib/conviteEquipe";

export type CadastrarViaConviteState = { erro?: string } | undefined;

const ERRO_CONVITE_INVALIDO = "Esse link não é mais válido — peça um novo pra quem te convidou.";

/** Resgate de ConviteEquipe — mesmo espírito de definirSenhaPessoa
 * (src/app/portal/verificar-email/[token]/actions.ts), só que criando o
 * Usuario (não só a senha de uma Pessoa que já existia): revalida o
 * convite no servidor (nunca confia no que a página já mostrou, pode ter
 * sido resgatado por outra aba entre a exibição e o submit), confere
 * e-mail livre, cria Usuario + UsuarioEmpresa com os módulos do convite
 * numa transação só com a marcação de uso, loga automaticamente e manda
 * pro painel. */
export async function resgatarConviteEquipe(
  _prev: CadastrarViaConviteState,
  formData: FormData
): Promise<CadastrarViaConviteState> {
  const token = String(formData.get("token") ?? "");
  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!nomeCompleto || !email || !senha) {
    return { erro: "Preencha nome, e-mail e senha." };
  }
  if (senha.length < 8) {
    return { erro: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { erro: "As senhas não conferem." };
  }

  const resultado = await buscarConviteValido(token);
  if (!resultado.valido) {
    return { erro: ERRO_CONVITE_INVALIDO };
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { erro: "Já existe uma conta com esse e-mail — entre normalmente em vez de usar o convite." };
  }

  const senhaHash = await hashSenha(senha);

  const usuario = await prisma.$transaction(async (tx) => {
    const novoUsuario = await tx.usuario.create({
      data: {
        nomeCompleto,
        email,
        senhaHash,
        // E-mail confirmado de cara — a pessoa só chegou até aqui porque
        // recebeu o link de quem convidou, equivalente a já ter clicado
        // num link de confirmação.
        emailVerificadoEm: new Date(),
        empresas: {
          // admin: false sempre — quem entra por convite nunca pode
          // gerenciar a equipe (convidar mais gente, editar módulo de
          // outro) mesmo que "configuracoes" esteja entre os módulos
          // marcados; só o dono original (ou quem ele promover à mão
          // depois) mexe em /equipe. Ver src/lib/adminEquipe.ts.
          create: {
            empresaId: resultado.empresaId,
            modulosPermitidos: resultado.modulosPermitidos,
            admin: false,
          },
        },
      },
    });
    await tx.conviteEquipe.update({
      where: { id: resultado.conviteId },
      data: { usadoEm: new Date(), usadoPorId: novoUsuario.id },
    });
    return novoUsuario;
  });

  await criarSessao(usuario.id);
  redirect("/v2/dashboard");
}
