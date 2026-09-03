import "server-only";

/** Verifica o token do Cloudflare Turnstile (CaptchaWidget.tsx) enviado
 * junto do formulário. Sem TURNSTILE_SECRET_KEY configurada (ambiente
 * local, ou antes de gerar as chaves), vira um no-op que deixa passar —
 * mesmo espírito de "recurso desligado sem a chave configurada, não
 * derruba quem está tentando usar o formulário" já usado em
 * src/lib/email.ts pro Resend. Uma falha de rede ao chamar o Cloudflare
 * também deixa passar, pelo mesmo motivo: um formulário legítimo não
 * deveria travar por causa de uma instabilidade de um serviço externo de
 * verificação. */
export async function captchaValido(formData: FormData): Promise<boolean> {
  const secreta = process.env.TURNSTILE_SECRET_KEY;
  if (!secreta) {
    console.warn("TURNSTILE_SECRET_KEY não configurada — captcha não verificado.");
    return true;
  }

  const token = String(formData.get("cf-turnstile-response") ?? "");
  if (!token) return false;

  try {
    const resposta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secreta, response: token }),
    });
    const dados = (await resposta.json()) as { success?: boolean };
    return dados.success === true;
  } catch (err) {
    console.error("Falha ao verificar captcha com o Cloudflare:", err);
    return true;
  }
}
