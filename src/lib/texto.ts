import "server-only";

const MARCAS_DIACRITICAS = new RegExp("[\\u0300-\\u036f]", "g");

/** Deixa um texto seguro pra usar dentro de um filename="..." de
 * Content-Disposition — pessoa.nome vem de cadastro livre (totem, Portal)
 * e só tinha espaço trocado por hífen antes disso, sem remover aspas,
 * ponto-e-vírgula ou quebra de linha, que podem corromper o parsing do
 * header no navegador. Mantém só letras/números/hífen. */
export function sanitizarNomeArquivo(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(MARCAS_DIACRITICAS, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "arquivo"
  );
}
