import "server-only";
import { Resend } from "resend";

const SITE_URL = "https://ifree.app.br";
const REMETENTE = "iFREE <contato@ifree.app.br>";
const ICONE_URL = `${SITE_URL}/brand/logo/png/icone-cor-256.png`;

/** Sem RESEND_API_KEY configurada (ex.: ambiente local sem o segredo),
 * o envio vira um no-op que só loga — mesmo espírito de "falha de envio
 * é resultado de negócio, não motivo pra derrubar quem chamou" já usado
 * em processarPagamentoTurno (src/lib/pagamentos/processar.ts). Quem
 * chama sempre recebe { sucesso: false } em vez de uma exceção. */
function cliente(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/** Escapa valores vindos de fora (nome digitado no cadastro, etc.) antes
 * de interpolar em HTML de e-mail — layoutEmail monta título/parágrafos
 * por concatenação direta de string, sem sanitização nenhuma. Só escapa
 * o VALOR interpolado; os parágrafos de enviarEmailNovoCadastro têm
 * `<strong>` literal de propósito ao redor da variável, que continua
 * intacto. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Layout base dos e-mails transacionais — tabela + estilo inline
 * (cliente de e-mail não confia em CSS externo nem em classe), fonte de
 * fallback do sistema em vez da Urbanist usada no resto da marca: web
 * font não é confiável em e-mail, mesmo raciocínio que o kit de marca já
 * aplica aos PDFs (Helvetica no lugar do Urbanist). Cores oficiais:
 * verde #00C896, navy #0D1B2A (ver ifree-kit-marca/manual). */
function layoutEmail({
  titulo,
  paragrafos,
  textoBotao,
  linkBotao,
}: {
  titulo: string;
  paragrafos: string[];
  textoBotao: string;
  linkBotao: string;
}): string {
  const corpoParagrafos = paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3D4952;">${p}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#F3F5F7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5F7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0D1B2A;padding:28px 32px;" align="left">
              <img src="${ICONE_URL}" width="36" height="30" alt="iFREE" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 16px;font-size:21px;font-weight:900;color:#14171A;letter-spacing:-.01em;">${titulo}</h1>
              ${corpoParagrafos}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:99px;background:#00C896;">
                    <a href="${linkBotao}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:800;color:#0D1B2A;text-decoration:none;">${textoBotao}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:#8A93A0;">Se o botão não funcionar, copie e cole este link no navegador:<br/><a href="${linkBotao}" style="color:#00875F;word-break:break-all;">${linkBotao}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#F3F5F7;border-top:1px solid #DCE1E7;">
              <p style="margin:0;font-size:11.5px;color:#8A93A0;">iFREE · Entrou. Trabalhou. Recebeu.<br/>Se você não pediu isso, pode ignorar este e-mail com segurança.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function enviarEmailVerificacao(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de verificação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/verificar-email/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Confirme seu e-mail`,
    paragrafos: [
      "Falta só um passo pra ativar sua conta no iFREE — confirmar que este e-mail é seu de verdade.",
      "O link abaixo vale por 24 horas.",
    ],
    textoBotao: "Confirmar meu e-mail",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Confirme seu e-mail — iFREE",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação:", err);
    return { sucesso: false };
  }
}

export async function enviarEmailRecuperacaoSenha(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de recuperação não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/redefinir-senha/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Vamos trocar sua senha`,
    paragrafos: [
      "Alguém (esperamos que você) pediu pra trocar a senha da sua conta no iFREE.",
      "Clique no botão abaixo pra escolher uma senha nova. O link vale por 1 hora.",
    ],
    textoBotao: "Criar nova senha",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Recupere sua senha — iFREE",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de recuperação de senha:", err);
    return { sucesso: false };
  }
}

/** Mesma ideia de enviarEmailVerificacao, mas pro Portal do freelancer
 * (iFREE Conecta) — Pessoa, não Usuario. Link separado
 * (/portal/verificar-email/[token]) porque é onde a senha É definida (o
 * formulário público de "configurar acesso" nunca grava senha direto). */
export async function enviarEmailVerificacaoPessoa(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de verificação (Portal) não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/portal/verificar-email/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Confirme seu e-mail`,
    paragrafos: [
      "Falta só um passo pra você acessar seu Portal no iFREE e ver seu histórico de turnos e sua reputação.",
      "O link abaixo leva você a criar sua senha — vale por 24 horas.",
    ],
    textoBotao: "Confirmar e criar senha",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Confirme seu e-mail — Portal iFREE",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação (Portal):", err);
    return { sucesso: false };
  }
}

/** Mesma ideia de enviarEmailRecuperacaoSenha, mas pro Portal do
 * freelancer (Pessoa, não Usuario). */
export async function enviarEmailRecuperacaoSenhaPessoa(
  destinatario: string,
  nome: string,
  token: string
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de recuperação (Portal) não enviado.");
    return { sucesso: false };
  }

  const link = `${SITE_URL}/portal/redefinir-senha/${token}`;
  const html = layoutEmail({
    titulo: `Oi, ${escaparHtml(nome.split(" ")[0])}! Vamos trocar sua senha`,
    paragrafos: [
      "Alguém (esperamos que você) pediu pra trocar a senha do seu Portal no iFREE.",
      "Clique no botão abaixo pra escolher uma senha nova. O link vale por 1 hora.",
    ],
    textoBotao: "Criar nova senha",
    linkBotao: link,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: "Recupere sua senha — Portal iFREE",
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar e-mail de recuperação de senha (Portal):", err);
    return { sucesso: false };
  }
}

/** Avisa o dono do sistema (MASTER_EMAIL) sempre que uma empresa nova se
 * cadastra — teste ou uso real, é o mesmo evento (criação de Empresa).
 * Nunca lança: falha nesse aviso não pode derrubar o cadastro de quem
 * está se cadastrando. */
export async function enviarEmailNovoCadastro(
  destinatarioMaster: string,
  dados: { nomeEmpresa: string; cnpj: string; nomeDono: string; emailDono: string }
): Promise<{ sucesso: boolean }> {
  const resend = cliente();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — aviso de novo cadastro não enviado.");
    return { sucesso: false };
  }

  const html = layoutEmail({
    titulo: "Nova empresa cadastrada no iFREE",
    paragrafos: [
      `<strong>${escaparHtml(dados.nomeEmpresa)}</strong> (CNPJ ${escaparHtml(dados.cnpj)}) acabou de se cadastrar.`,
      `Dono: ${escaparHtml(dados.nomeDono)} — ${escaparHtml(dados.emailDono)}.`,
      "Entrou automaticamente no período de teste grátis.",
    ],
    textoBotao: "Ver no painel master",
    linkBotao: `${SITE_URL}/master`,
  });

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatarioMaster,
      subject: `Novo cadastro — ${dados.nomeEmpresa}`,
      html,
    });
    return { sucesso: true };
  } catch (err) {
    console.error("Falha ao enviar aviso de novo cadastro:", err);
    return { sucesso: false };
  }
}
