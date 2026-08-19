"use client";

// Bipe curtinho ao digitar no totem — gerado na hora via Web Audio API, sem
// precisar de arquivo de áudio. Reaproveita um único AudioContext (criar um
// novo a cada tecla é desnecessário e alguns navegadores limitam a
// quantidade de contexts simultâneos).
let ctx: AudioContext | null = null;

export function tocarBipTeclado() {
  if (typeof window === "undefined") return;
  const AudioContextClasse =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClasse) return;

  if (!ctx) ctx = new AudioContextClasse();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();
  oscilador.type = "sine";
  oscilador.frequency.value = 700;
  // fade-out exponencial rápido pra soar como um "tique" seco, sem clique
  // de corte abrupto no fim
  ganho.gain.setValueAtTime(0.15, ctx.currentTime);
  ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
  oscilador.connect(ganho);
  ganho.connect(ctx.destination);
  oscilador.start();
  oscilador.stop(ctx.currentTime + 0.05);
}
