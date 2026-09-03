import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iFREE Conecta — a rede da liberdade",
  description: "Visão do produto: o portal que conecta quem trabalha e quem contrata trabalho físico e presencial.",
};

export default function ConectaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
