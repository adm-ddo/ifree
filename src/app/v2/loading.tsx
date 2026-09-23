/** Mostrado pelo Next.js durante a navegação entre páginas dentro de
 * /v2/** enquanto a próxima página busca os próprios dados no servidor —
 * antes deste arquivo não existia NENHUM loading.tsx na v2, então a tela
 * ficava congelada (o conteúdo antigo parado na tela) até a próxima página
 * terminar de buscar tudo, o que parecia "travado" mesmo quando a busca em
 * si não demorava tanto. Skeleton simples, só pra dar feedback imediato de
 * que algo está acontecendo — não tenta imitar o layout de cada página. */
export default function V2Loading() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl animate-pulse">
      <div className="h-6 w-40 rounded-lg bg-stone-200" />
      <div className="h-24 rounded-2xl bg-stone-200" />
      <div className="h-40 rounded-2xl bg-stone-200" />
      <div className="h-40 rounded-2xl bg-stone-200" />
    </div>
  );
}
