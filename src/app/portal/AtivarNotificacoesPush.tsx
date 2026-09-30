"use client";

import { useEffect, useState } from "react";
import { salvarPushSubscription } from "./actions";

const CHAVE_DISPENSADO = "portal-push-dispensado";

/// applicationServerKey do pushManager.subscribe precisa de Uint8Array,
/// não da string base64url que a chave VAPID pública vem — conversão
/// padrão recomendada pela própria spec de Web Push.
function base64UrlParaUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Ativa notificação push no Portal — mesmo espírito de
 * SugestaoInstalarApp.tsx (componente solto, sem props do servidor
 * exceto a chave pública, resolve tudo em cliente). Precisa de gesto do
 * usuário (clique) pra pedir permissão — não dá pra pedir sozinho no
 * useEffect, todo navegador bloqueia isso. Nunca aparece se o navegador
 * não suportar (iOS fora do modo instalado, navegadores antigos), se a
 * pessoa já negou permissão, ou se ela dispensou o convite antes
 * (localStorage, por aparelho). */
export default function AtivarNotificacoesPush({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [suportado, setSuportado] = useState(false);
  const [jaAtivado, setJaAtivado] = useState(false);
  const [dispensado, setDispensado] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!vapidPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    setSuportado(true);

    try {
      setDispensado(localStorage.getItem(CHAVE_DISPENSADO) === "1");
    } catch {
      setDispensado(false);
    }

    navigator.serviceWorker
      .register("/portal/sw-push.js", { scope: "/portal/" })
      .then((registro) => registro.pushManager.getSubscription())
      .then((subscription) => setJaAtivado(subscription !== null))
      .catch(() => {});
  }, [vapidPublicKey]);

  function dispensar() {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      // Storage bloqueado — só não lembra da próxima vez, sem quebrar nada.
    }
  }

  async function ativar() {
    if (!vapidPublicKey) return;
    setErro(null);
    setEnviando(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setErro("Permissão não concedida — dá pra ativar depois nas configurações do navegador.");
        return;
      }
      const registro = await navigator.serviceWorker.register("/portal/sw-push.js", { scope: "/portal/" });
      const subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaUint8Array(vapidPublicKey) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Assinatura incompleta");
      }
      const resultado = await salvarPushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setJaAtivado(true);
    } catch {
      setErro("Não deu pra ativar agora — tenta de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  if (!suportado || jaAtivado || dispensado) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex items-start gap-3">
      <span className="text-2xl shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-800">Ativar notificações de vaga</p>
        <p className="text-xs text-brand-700 mt-0.5">
          Receba um aviso no celular quando uma empresa chamar sua atenção numa conversa.
        </p>
        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={ativar}
          disabled={enviando}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {enviando ? "Ativando..." : "Ativar"}
        </button>
        <button type="button" onClick={dispensar} className="text-xs text-brand-700 underline">
          Agora não
        </button>
      </div>
    </div>
  );
}
