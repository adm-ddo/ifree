/** Contato comercial do iFREE — reaproveitado na landing page, no
 * one-pager em PDF e nos templates de Instagram, pra não espalhar o
 * número/mensagem em vários lugares diferentes. */
export const WHATSAPP_NUMERO = "5551992826704";
export const WHATSAPP_NUMERO_FORMATADO = "(51) 99282-6704";

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}
