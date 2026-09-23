"use client";

import { useState } from "react";

/** Estado de campo de formulário que precisa refletir o valor mais
 * recente vindo do servidor, mesmo depois que o componente já montou.
 *
 * Sem isso, `<input defaultValue={x}>` (ou `<select defaultValue={x}>`)
 * só usa `x` na primeira montagem — é assim que o React funciona pra
 * campo não controlado. Se o servidor revalida a página com um `x` novo
 * (o caso mais comum: o PRÓPRIO formulário acabou de salvar, o
 * `revalidatePath` trouxe o dado atualizado, mas o componente cliente não
 * desmontou), o campo continua mostrando o valor de antes do save — a
 * pessoa vê "Configuração salva" mas o campo parece não ter mudado nada.
 * Foi exatamente esse bug relatado pelo Thiago em 2026-09-20 (intervalo
 * de uma funcionária CLT em SalarioEscalaForm.tsx).
 *
 * "Resincronizar durante a renderização" (comparar o valor vindo do
 * servidor contra uma cópia guardada e já corrigir os dois juntos, no
 * corpo síncrono do componente) é o padrão que o próprio React recomenda
 * pra isso — évita tanto o bug do defaultValue quanto o "flash" de um
 * useEffect rodando só depois da pintura na tela. */
export function useCampoSincronizado<T>(valorDoServidor: T): [T, (novoValor: T) => void] {
  const [valor, setValor] = useState(valorDoServidor);
  const [valorAnterior, setValorAnterior] = useState(valorDoServidor);

  if (valorDoServidor !== valorAnterior) {
    setValorAnterior(valorDoServidor);
    setValor(valorDoServidor);
  }

  return [valor, setValor];
}
