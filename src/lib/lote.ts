/** Processa uma lista em lotes de `concorrencia` itens em paralelo, um
 * lote de cada vez — usado em todo lugar que chama um provedor externo
 * (e-mail, Asaas) uma vez por item de uma lista que cresce junto com a
 * base de usuários (turnos fechando à noite, freelancers avisados de uma
 * vaga nova, empresas com pagamento pendente de confirmação). Sem isso,
 * um loop sequencial (um item de cada vez, esperando cada um terminar)
 * cresce proporcionalmente à quantidade de gente cadastrada até estourar
 * o tempo limite da função serverless no meio — matando o processo sem
 * erro pra ninguém e sem terminar o resto da lista (foi exatamente o que
 * achamos no aviso de vaga nova por e-mail, ver src/lib/match-passivo.ts).
 * `concorrencia` baixa o bastante pra não virar uma rajada de centenas de
 * requisições simultâneas contra a API de um provedor externo (Resend,
 * Asaas) que tem seu próprio limite de taxa. Cada callback trata o
 * próprio erro — uma falha isolada num item nunca derruba os outros do
 * lote nem interrompe o resto da lista. */
export async function processarEmLotes<T>(
  itens: T[],
  concorrencia: number,
  processar: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < itens.length; i += concorrencia) {
    const lote = itens.slice(i, i + concorrencia);
    await Promise.all(lote.map(processar));
  }
}
