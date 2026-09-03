"use client";

import { useEffect } from "react";

/** Boundary de erro pro layout raiz em si (getSessao, a consulta de
 * pagamentos pendentes, etc.) — o único caso que error.tsx normal não
 * cobre, já que ele fica DENTRO do layout. Precisa montar <html>/<body>
 * próprios porque substitui o layout raiz inteiro quando disparado. Sem
 * isso, uma falha aqui derruba o site inteiro com a tela crua do Next. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado no layout raiz:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          gap: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#ffffff",
          color: "#1c1917",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#00C896",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0D1B2A",
            fontWeight: 900,
            fontSize: 20,
          }}
        >
          i
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#0D1B2A", margin: 0 }}>
          O iFREE ficou indisponível por um instante
        </h1>
        <p style={{ fontSize: 14, color: "#57534e", maxWidth: 360, margin: 0 }}>
          Foi uma falha momentânea de conexão, não um problema com seus
          dados. Tenta de novo em alguns segundos.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            borderRadius: 8,
            background: "#00A87D",
            color: "#ffffff",
            border: "none",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
        {error.digest && (
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 8 }}>Código: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
