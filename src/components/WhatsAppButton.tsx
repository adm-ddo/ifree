import { linkWhatsApp } from "@/lib/contato";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.25.62 4.43 1.8 6.35L4 29l7.8-1.75a12.9 12.9 0 0 0 4.22.7h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.64 3 16.02 3Zm0 21.98h-.01a10 10 0 0 1-4.86-1.3l-.35-.2-4.63 1.04 1.06-4.55-.23-.37a9.85 9.85 0 0 1-1.53-5.28C5.47 9.46 10.24 4.7 16.02 4.7c4.93 0 8.93 3.99 8.93 8.93 0 4.93-4 8.93-8.93 8.93v.02Zm4.9-6.68c-.27-.13-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.13-.18.27-.7.87-.85 1.05-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.16-1.33-.8-.71-1.34-1.6-1.5-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.13-.6-1.44-.82-1.98-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.94.92-.94 2.24s.96 2.6 1.1 2.78c.13.18 1.9 2.9 4.6 4.06.64.28 1.14.44 1.53.57.64.2 1.23.17 1.69.1.52-.08 1.58-.65 1.8-1.27.22-.63.22-1.17.16-1.28-.07-.13-.24-.2-.51-.33Z" />
    </svg>
  );
}

export default function WhatsAppButton({
  mensagem,
  children,
  className,
}: {
  mensagem: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={linkWhatsApp(mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" />
      {children}
    </a>
  );
}
