import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { MANUAL_CSS, MANUAL_BODY_HTML } from "./manual-content";
import ManualScrollspy from "./ManualScrollspy";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-manual-display" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manual-body" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-manual-mono" });

export const metadata: Metadata = {
  title: "Manual iFREE",
  description: "Guia visual de todas as telas e fluxos do sistema iFREE, do totem ao painel administrativo.",
};

export default function ManualPage() {
  return (
    <div id="manual-root" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: MANUAL_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MANUAL_BODY_HTML }} />
      <ManualScrollspy />
    </div>
  );
}
