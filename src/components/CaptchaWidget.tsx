"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/// Tempo máximo esperando o widget resolver sozinho antes de liberar o
/// envio sem ele — folga generosa sobre o normal (o modo "Managed" resolve
/// em 1-3s pra quem não é bot), mas curta o suficiente pra não segurar
/// alguém de verdade por muito tempo.
const TIMEOUT_MS = 8000;

/** Widget de verificação humana (Cloudflare Turnstile) pros formulários
 * públicos (login, cadastro, recuperação de senha) — sem
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada, não renderiza nada e o
 * formulário funciona exatamente como antes (ver captchaValido em
 * src/lib/captcha.ts, que também vira no-op nesse caso). O próprio widget
 * injeta um campo escondido "cf-turnstile-response" dentro do <form> em
 * volta assim que a pessoa resolve o desafio.
 *
 * Nunca trava o formulário: se em TIMEOUT_MS não aparecer esse campo (o
 * script pode ter sido bloqueado por um bloqueador de anúncio, alguma
 * extensão de privacidade, rede ruim, ou o próprio Cloudflare instável),
 * marca um campo escondido avisando isso — captchaValido aceita esse aviso
 * e deixa passar sem verificação. Já aconteceu de derrubar login de gente
 * de verdade por causa disso; deixar entrar sem captcha é sempre melhor do
 * que trancar alguém legítimo pra fora do próprio sistema. */
export default function CaptchaWidget() {
  const [naoCarregou, setNaoCarregou] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    const id = setTimeout(() => {
      // O Cloudflare cria esse campo escondido assim que o widget começa a
      // renderizar — MUITO antes do desafio ser resolvido de fato. Um
      // elemento presente mas vazio não significa "resolveu", então checar
      // só a existência do campo (sem olhar o valor) deixa esse fallback
      // sem efeito bem no caso real que ele existe pra cobrir: o widget
      // apareceu mas travou (challenge interativo nunca completado, rede
      // instável no meio do processo etc).
      const token = document.querySelector<HTMLInputElement>(
        'input[name="cf-turnstile-response"]'
      )?.value;
      if (!token) setNaoCarregou(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} />
      {naoCarregou && (
        <>
          <input type="hidden" name="cf-turnstile-timeout" value="1" />
          <p className="text-xs text-stone-400">
            Verificação de segurança indisponível no momento — isso não vai
            te impedir de continuar.
          </p>
        </>
      )}
    </>
  );
}
