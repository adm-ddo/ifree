"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoa } from "@/lib/auth-pessoa";
import { chavePixValida, detectarTipoChavePix } from "@/lib/documento";
import { normalizarTags } from "@/lib/habilidades";
import { BIOGRAFIA_MINIMO_CARACTERES } from "@/lib/perfil-completude";
import { meiosTransporteValidos } from "@/lib/transporte";
import { uploadDataUrl } from "@/lib/blob";
import { criarTokenAutenticacaoPessoa, tokenRecenteExistePessoa } from "@/lib/tokenAutenticacaoPessoa";
import { enviarEmailTrocaEmailPessoa } from "@/lib/email";
import { revalidatePath } from "next/cache";

export type AtualizarMeusDadosState = { erro?: string; sucesso?: boolean } | undefined;

/** Mesmo espírito de atualizarDadosPessoa (totem, src/app/t/[token]/actions.ts)
 * — mesma validação — só que gated pela sessão do Portal em vez de um
 * token de totem, e sempre usando o pessoaId da própria sessão (nunca um
 * id vindo do form) pra ninguém editar o cadastro de outra pessoa.
 * Estendido além do escopo original do totem (telefone/endereço/PIX) com
 * RG/data de nascimento/contato de emergência — campos que já existiam no
 * schema mas só o admin conseguia editar. E-mail fica de fora desta action
 * de propósito (ver solicitarTrocaEmail abaixo): trocar e-mail muda pra
 * onde vai o link de recuperação de senha, então precisa confirmar que a
 * pessoa tem acesso ao endereço NOVO antes de valer — não dá só pra
 * sobrescrever direto como os outros campos. */
export async function atualizarMeusDados(
  _prev: AtualizarMeusDadosState,
  formData: FormData
): Promise<AtualizarMeusDadosState> {
  const sessao = await requirePessoa();

  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const dataNascimentoBruta = String(formData.get("dataNascimento") ?? "").trim();
  const contatoEmergenciaNome = String(formData.get("contatoEmergenciaNome") ?? "").trim();
  const contatoEmergenciaTelefone = String(formData.get("contatoEmergenciaTelefone") ?? "").trim();
  const meiosTransporte = meiosTransporteValidos(formData.getAll("meiosTransporte"));

  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  if (!bairro) return { erro: "Informe o bairro." };
  if (!cep) return { erro: "Informe o CEP." };
  if (!cidade) return { erro: "Informe a cidade." };
  if (!chavePix) return { erro: "Informe a chave PIX." };

  const tipoChavePix = detectarTipoChavePix(chavePix);
  if (!chavePixValida(tipoChavePix, chavePix)) {
    return { erro: `A chave PIX não parece válida (detectada como ${tipoChavePix.toLowerCase()}).` };
  }

  if (!dataNascimentoBruta) return { erro: "Informe a data de nascimento." };
  const dataNascimento = new Date(dataNascimentoBruta);
  if (Number.isNaN(dataNascimento.getTime())) {
    return { erro: "Informe uma data de nascimento válida." };
  }

  await prisma.pessoa.update({
    where: { id: sessao.pessoaId },
    data: {
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      bairro,
      cep,
      cidade,
      chavePix,
      tipoChavePix,
      rg: rg || null,
      dataNascimento,
      contatoEmergenciaNome: contatoEmergenciaNome || null,
      contatoEmergenciaTelefone: contatoEmergenciaTelefone || null,
      meiosTransporte,
    },
  });

  revalidatePath("/portal");
  return { sucesso: true };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SolicitarTrocaEmailState = { erro?: string; sucesso?: boolean } | undefined;

/** Pede a troca do e-mail cadastrado — nunca sobrescreve na hora (ver
 * docblock de atualizarMeusDados acima). Manda um link de confirmação pro
 * e-mail NOVO (mesmo padrão de token de uso único já usado em
 * criarCadastroPortal/cadastrar-acesso), e só troca de verdade quando a
 * pessoa clicar nele — ver confirmarTrocaEmail em
 * src/app/portal/confirmar-email/[token]/actions.ts. */
export async function solicitarTrocaEmail(
  _prev: SolicitarTrocaEmailState,
  formData: FormData
): Promise<SolicitarTrocaEmailState> {
  const sessao = await requirePessoa();

  const novoEmail = String(formData.get("novoEmail") ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(novoEmail)) return { erro: "Informe um e-mail válido." };
  if (novoEmail.length > 200) return { erro: "E-mail muito longo." };

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: { nome: true, email: true },
  });
  if (pessoa.email === novoEmail) return { erro: "Esse já é o seu e-mail atual." };

  // Não é um login (Portal só loga por CPF), mas evita duas pessoas
  // compartilhando sem querer o mesmo e-mail — ele também serve de
  // segundo fator de identidade em outras empresas (ver perfilIncompleto,
  // src/app/t/[token]/actions.ts), então precisa continuar identificando
  // uma pessoa só.
  const jaUsadoPorOutra = await prisma.pessoa.findFirst({
    where: { email: novoEmail, id: { not: sessao.pessoaId } },
    select: { id: true },
  });
  if (jaUsadoPorOutra) {
    return { erro: "Esse e-mail já está em uso por outro cadastro." };
  }

  // Cooldown de 2 min contra clique duplo/reenvio em loop — mesmo padrão
  // já usado em solicitarAcessoPessoa (portal/cadastrar-acesso/actions.ts).
  const jaTemTokenRecente = await tokenRecenteExistePessoa(sessao.pessoaId, "TROCA_EMAIL", 2);
  if (!jaTemTokenRecente) {
    const token = await criarTokenAutenticacaoPessoa(sessao.pessoaId, "TROCA_EMAIL", 24, novoEmail);
    await enviarEmailTrocaEmailPessoa(novoEmail, pessoa.nome, token);
  }

  return { sucesso: true };
}

export type AtualizarPerfilProfissionalState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarPerfilProfissional(
  _prev: AtualizarPerfilProfissionalState,
  formData: FormData
): Promise<AtualizarPerfilProfissionalState> {
  const sessao = await requirePessoa();

  const biografia = String(formData.get("biografia") ?? "").trim();
  const habilidades = normalizarTags(formData.getAll("habilidades"));
  const vagasDesejadas = normalizarTags(formData.getAll("vagasDesejadas"));
  const sexoBruto = String(formData.get("sexo") ?? "");
  const SEXOS_VALIDOS = ["MASCULINO", "FEMININO", "PREFIRO_NAO_DIZER"] as const;
  const sexo = SEXOS_VALIDOS.includes(sexoBruto as (typeof SEXOS_VALIDOS)[number])
    ? (sexoBruto as (typeof SEXOS_VALIDOS)[number])
    : null;

  if (biografia.length < BIOGRAFIA_MINIMO_CARACTERES) {
    return {
      erro: `A biografia precisa ter pelo menos ${BIOGRAFIA_MINIMO_CARACTERES} caracteres (${biografia.length}/${BIOGRAFIA_MINIMO_CARACTERES}).`,
    };
  }

  await prisma.pessoa.update({
    where: { id: sessao.pessoaId },
    data: { biografia, habilidades, vagasDesejadas, sexo },
  });

  revalidatePath("/portal");
  return { sucesso: true };
}

export type AtualizarFotoPerfilResultado = { sucesso: true } | { erro: string };

/** Chamada direto como função pelo componente cliente (mesmo padrão do
 * upload de foto no totem, src/app/t/[token]/actions.ts) em vez de um
 * <form action>: a data URL da foto pode ser grande, e aqui não precisa
 * de progressive enhancement — é sempre disparada por JS (input file ou
 * câmera), nunca por um submit de formulário puro. */
export async function atualizarFotoPerfil(
  fotoDataUrl: string
): Promise<AtualizarFotoPerfilResultado> {
  const sessao = await requirePessoa();

  const TIPOS_PERMITIDOS = ["data:image/jpeg", "data:image/png", "data:image/webp"];
  if (!TIPOS_PERMITIDOS.some((tipo) => fotoDataUrl.startsWith(`${tipo};base64`))) {
    return { erro: "Imagem inválida — use JPEG, PNG ou WebP." };
  }

  const fotoPerfilUrl = await uploadDataUrl(
    `pessoas/foto-perfil-${sessao.pessoaId}-${Date.now()}.jpg`,
    fotoDataUrl
  );

  await prisma.pessoa.update({ where: { id: sessao.pessoaId }, data: { fotoPerfilUrl } });

  revalidatePath("/portal");
  return { sucesso: true };
}

/** Chamada direto pelo switch (não via form) — liga/desliga a
 * participação no quadro de vagas (iFREE Conecta). Default false: opt-in
 * explícito, ninguém fica visível/participando sem pedir. */
export async function atualizarDisponibilidade(disponivel: boolean): Promise<void> {
  const sessao = await requirePessoa();
  await prisma.pessoa.update({
    where: { id: sessao.pessoaId },
    data: { disponivelParaOportunidades: disponivel },
  });
  revalidatePath("/portal");
  revalidatePath("/portal/vagas");
}
