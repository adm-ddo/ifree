import { redirect } from "next/navigation";

/** /novo foi promovida a home oficial (src/app/page.tsx) em 2026-09-28 —
 * essa rota só existe pra não quebrar quem já tinha o link salvo/
 * compartilhado. */
export default function NovoRedirectPage() {
  redirect("/");
}
