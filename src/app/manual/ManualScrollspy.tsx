"use client";

import { useEffect } from "react";

/** Destaca o item ativo nos dois menus (desktop e mobile) do manual conforme
 * a seção visível na tela. Precisa ser um componente à parte porque o resto
 * da página é injetado via dangerouslySetInnerHTML — scripts dentro desse
 * HTML não seriam executados pelo navegador. */
export default function ManualScrollspy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("#manualTocDesktop a"));
    const mobileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("#manualTocMobile a"));
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href") || ""))
      .filter((el): el is Element => !!el);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
          mobileLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return null;
}
