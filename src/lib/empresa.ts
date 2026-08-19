export type DadosEmpresaState = { erro?: string } | undefined;

export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  endereco: string | null;
};

/** Lê e valida os campos comuns de empresa (usado no /cadastro e em
 * /empresas ao adicionar uma nova empresa a um login já existente). */
export function lerDadosEmpresa(
  formData: FormData
): { erro: string } | { dados: DadosEmpresa } {
  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome || !cnpj) {
    return { erro: "Preencha nome e CNPJ." };
  }

  return { dados: { nome, cnpj, endereco: endereco || null } };
}
