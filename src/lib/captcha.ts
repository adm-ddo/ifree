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
  if (!token) {
    // Sem token: só deixa passar se foi o próprio CaptchaWidget avisando
    // que o script não carregou a tempo (bloqueador de anúncio, rede ruim,
    // Cloudflare instável) — ver TIMEOUT_MS em CaptchaWidget.tsx. Nunca
    // travar um login/cadastro legítimo só porque o widget não apareceu;
    // já aconteceu de derrubar acesso de gente de verdade por causa disso.
    const semCarregarATempo = formData.get("cf-turnstile-timeout") === "1";
    if (semCarregarATempo) {
      console.warn("Captcha não carregou a tempo — deixando passar sem verificação.");
      return true;
    }
    console.warn("Captcha: envio chegou sem token e sem aviso de timeout — bloqueando.");
    return false;
  }

  try {
    const resposta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secreta, response: token }),
    });
    const dados = (await resposta.json()) as { success?: boolean; ["error-codes"]?: string[] };
    if (dados.success !== true) {
      console.warn("Captcha: Cloudflare rejeitou o token —", JSON.stringify(dados));
    }
    return dados.success === true;
  } catch (err) {
    console.error("Falha ao verificar captcha com o Cloudflare:", err);
    return true;
  }
}
