"use server";

import { prisma } from "@/lib/prisma";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { criarTokenAutenticacaoPessoa } from "@/lib/tokenAutenticacaoPessoa";
import { enviarEmailVerificacaoPessoa } from "@/lib/email";
import { captchaValido } from "@/lib/captcha";
import { uploadDataUrl } from "@/lib/blob";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEXOS_VALIDOS = ["MASCULINO", "FEMININO", "PREFIRO_NAO_DIZER"] as const;

export type CriarCadastroPortalState = { erro?: string; sucesso?: boolean } | undefined;

/** Cadastro do zero pelo Portal — pra quem NUNCA trabalhou por nenhuma
 * empresa no iFREE (sem Pessoa nenhuma ainda), diferente de
 * cadastrar-acesso (que só configura senha pra uma Pessoa que já existe,
 * criada pelo totem ou por um admin). Sempre CPF (não CNPJ/MEI): o login
 * do Portal só aceita CPF, então cadastrar com CNPJ aqui deixaria a
 * pessoa sem jeito de entrar depois. Sem chave PIX obrigatória — ao
 * contrário do totem, não tem turno acontecendo agora pra exigir isso já;
 * fica pro checklist de completude do perfil, preenchido depois.
 *
 * Foto é obrigatória aqui (diferente do resto do perfil, preenchido depois
 * no Portal) — CadastroPortalForm só chama esta action depois de capturar
 * pela câmera. indicadoPorPessoaId vem de um link de indicação
 * (?ref=<pessoaId> em /portal/cadastro), sempre reconferido aqui antes de
 * creditar — indicadoPorNomeTexto é só o texto livre de quem respondeu
 * "sim" sem ter vindo pelo link. */
export async function criarCadastroPortal(
  _prev: CriarCadastroPortalState,
  formData: FormData
): Promise<CriarCadastroPortalState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpfBruto = String(formData.get("cpf") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fotoDataUrl = String(formData.get("fotoDataUrl") ?? "");
  const sexoBruto = String(formData.get("sexo") ?? "");
  const pcdBruto = String(formData.get("pcd") ?? "");
  const pcd = pcdBruto === "sim" ? true : pcdBruto === "nao" ? false : null;
  const indicadoPorNomeTexto = String(formData.get("indicadoPorNomeTexto") ?? "").trim();
  const indicadoPorPessoaIdBruto = String(formData.get("indicadoPorPessoaId") ?? "");

  if (!(await captchaValido(formData))) {
    return { erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  if (!nome) return { erro: "Informe o nome completo." };
  if (nome.length > 150) return { erro: "O nome pode ter no máximo 150 caracteres." };
  if (!cpfValido(cpfBruto)) return { erro: "Informe um CPF válido." };
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (telefone.length > 30) return { erro: "Telefone inválido." };
  if (!cep) return { erro: "Informe o CEP." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (endereco.length > 200) return { erro: "Endereço muito longo." };
  if (!numero) return { erro: "Informe o número." };
  if (numero.length > 20) return { erro: "Número inválido." };
  if (complemento.length > 100) return { erro: "Complemento muito longo." };
  if (!bairro) return { erro: "Informe o bairro." };
  if (!cidade) return { erro: "Informe a cidade." };
  if (!EMAIL_REGEX.test(email)) return { erro: "Informe um e-mail válido." };
  if (email.length > 200) return { erro: "E-mail muito longo." };
  if (!SEXOS_VALIDOS.includes(sexoBruto as (typeof SEXOS_VALIDOS)[number])) {
    return { erro: "Escolha uma opção de gênero." };
  }

  const TIPOS_PERMITIDOS = ["data:image/jpeg", "data:image/png", "data:image/webp"];
  if (!TIPOS_PERMITIDOS.some((tipo) => fotoDataUrl.startsWith(`${tipo};base64`))) {
    return { erro: "Tire uma foto pela câmera antes de continuar." };
  }
  if (indicadoPorNomeTexto.length > 150) return { erro: "Nome de quem indicou muito longo." };

  const documento = apenasDigitos(cpfBruto);

  const existente = await prisma.pessoa.findUnique({ where: { documento } });
  if (existente) {
    return {
      erro: 'Esse CPF já está cadastrado — use "Configurar acesso" ou "Entrar".',
    };
  }

  // Nunca confia cego no id vindo do form — só credita a indicação se o
  // link realmente aponta pra uma Pessoa que existe (ver comentário do
  // campo indicadoPorPessoaId no schema).
  let indicadoPorPessoaId: number | null = null;
  if (indicadoPorPessoaIdBruto) {
    const idCandidato = Number(indicadoPorPessoaIdBruto);
    if (Number.isInteger(idCandidato)) {
      const indicador = await prisma.pessoa.findUnique({ where: { id: idCandidato }, select: { id: true } });
      if (indicador) indicadoPorPessoaId = indicador.id;
    }
  }

  const fotoPerfilUrl = await uploadDataUrl(`pessoas/foto-perfil-cadastro-${Date.now()}.jpg`, fotoDataUrl);

  const pessoa = await prisma.pessoa.create({
    data: {
      nome,
      documento,
      tipoDocumento: "CPF",
      telefone,
      cep,
      endereco,
      numero,
      complemento: complemento || null,
      bairro,
      cidade,
      email,
      fotoPerfilUrl,
      sexo: sexoBruto as (typeof SEXOS_VALIDOS)[number],
      pcd,
      indicadoPorPessoaId,
      // Guarda o texto só quando NÃO veio por link (indicação confiável já
      // resolvida acima) — evita os dois ficarem preenchidos e confundindo
      // qual é a fonte real do crédito.
      indicadoPorNomeTexto: !indicadoPorPessoaId && indicadoPorNomeTexto ? indicadoPorNomeTexto : null,
    },
  });

  const token = await criarTokenAutenticacaoPessoa(pessoa.id, "VERIFICACAO_EMAIL", 24);
  await enviarEmailVerificacaoPessoa(email, nome, token);

  return { sucesso: true };
}
