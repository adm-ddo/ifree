// Service Worker só pra notificação push do Portal (iFREE Conecta) —
// registrado com scope "/portal/" (ver AtivarNotificacoesPush.tsx), não
// afeta o painel da empresa nem o totem. Arquivo estático de propósito
// (fora do bundle do Next.js): um Service Worker precisa viver num
// caminho fixo e servido tal como está, sem hash de build.

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = {};
  }

  const titulo = dados.title || "iFREE Conecta";
  const opcoes = {
    body: dados.body || "",
    icon: "/brand/icones-app/icon-conecta-192.png",
    badge: "/brand/icones-app/icon-conecta-192.png",
    data: { url: dados.url || "/portal/conversas" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Clique na notificação: foca uma aba do Portal já aberta na URL certa,
// ou abre uma nova — mesmo padrão de qualquer PWA com push.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/portal/conversas";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if (cliente.url.includes(url) && "focus" in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
