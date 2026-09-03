"use client";

import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Widget de verificação humana (Cloudflare Turnstile) pros formulários
 * públicos sem login (cadastro, recuperação de senha) — sem
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada, não renderiza nada e o
 * formulário funciona exatamente como antes (ver captchaValido em
 * src/lib/captcha.ts, que também vira no-op nesse caso). O próprio widget
 * injeta um campo escondido "cf-turnstile-response" dentro do <form> em
 * volta assim que a pessoa resolve o desafio — não precisa de estado
 * React nem de props aqui. */
export default function CaptchaWidget() {
  if (!SITE_KEY) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} />
    </>
  );
}
