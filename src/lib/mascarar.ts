/** Mascara um e-mail pra exibir "enviamos pra onde" sem revelar o endereço
 * inteiro (ex.: "joao.silva@gmail.com" -> "jo***@gmail.com") — usado em
 * solicitarRecuperacaoSenhaPessoa (src/app/portal/esqueci-senha/actions.ts)
 * pra confirmar o destino do e-mail de recuperação de senha sem expor o
 * endereço completo de quem só sabe o CPF (CPF não é segredo neste
 * sistema, ver comentário em src/app/portal/cadastrar-acesso/actions.ts —
 * mas o e-mail continua sendo). Sem "server-only": string pura, sem
 * dependência de banco/sessão. */
export function mascararEmail(email: string): string {
  const [local, dominio] = email.split("@");
  if (!dominio) return email;
  const visivel = local.slice(0, Math.min(2, local.length));
  return `${visivel}***@${dominio}`;
}
