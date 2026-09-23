import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Padrão do Next é 1MB — baixo demais pra foto de documento assinado
    // tirada direto da câmera do celular (mesmo comprimida no client antes
    // de enviar, ver UploadAssinadoForm.tsx). Serve de margem de segurança;
    // a compressão no client é a defesa principal.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
