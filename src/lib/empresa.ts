export type DadosEmpresaState = { erro?: string } | undefined;

export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
};

/** Lê e valida os campos comuns de empresa (usado no /cadastro, em
 * /empresas ao adicionar uma nova empresa a um login já existente, e em
 * /configuracoes ao editar). E-mail é obrigatório — é pra onde vão as
 * cobranças da empresa e o que pré-preenche o e-mail de contato na hora
 * de conectar a conta de pagamento (ver ContaAsaasForm); o resto do
 * endereço fica opcional, igual sempre foi. */
export function lerDadosEmpresa(
  formData: FormData
): { erro: string } | { dados: DadosEmpresa } {
  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();

  if (!nome || !cnpj || !email) {
    return { erro: "Preencha nome, CNPJ e e-mail." };
  }

  return {
    dados: {
      nome,
      cnpj,
      email,
      endereco: endereco || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      cep: cep || null,
    },
  };
}
