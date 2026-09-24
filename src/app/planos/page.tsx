import type { Metadata } from "next";
import Link from "next/link";
import { Sora, JetBrains_Mono } from "next/font/google";
import WhatsAppButton from "@/components/WhatsAppButton";
import { WHATSAPP_NUMERO_FORMATADO } from "@/lib/contato";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-planos-sora",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-planos-mono",
});

export const metadata: Metadata = {
  title: "Planos — iFREE",
  description:
    "Sistema completo pra gestão de extras e CLT, com PIX automático — um plano só, preço pelo tamanho do seu time.",
};

const MENSAGEM_PLANOS = "Vi a página de planos do iFREE e quero saber mais.";

/** Página comercial de planos — link a partir do rodapé da landing
 * (src/app/page.tsx). Estilo isolado num <style> escopado por
 * .planos-page (mesmo espírito das seções soltas em src/app/pitch/page.tsx
 * e src/app/conecta/page.tsx, que também usam <style> inline pra layout
 * que foge do que dá pra fazer só com utilitário do Tailwind) — sem tema
 * escuro de propósito, o resto do site não tem dark mode. */
export default function PlanosPage() {
  return (
    <div className={`planos-page ${sora.variable} ${jetbrainsMono.variable}`}>
      <style>{`
        .planos-page {
          --paper: #faf8f5;
          --paper-raised: #ffffff;
          --paper-sunken: #f2efe9;
          --line: #e6e1d8;
          --text: #14202f;
          --text-muted: #5b6472;
          --text-faint: #8b8f97;
          --accent: #00ad82;
          --accent-strong: #00906d;
          --accent-wash: #e6fbf5;
          --accent-wash-line: #c8f5e7;
          --navy: #0d1b2a;
          --navy-raised: #16293d;
          --navy-line: #2f4160;
          --navy-text: #f2f4f7;
          --navy-text-muted: #9fabc0;
          --shadow: 0 1px 2px rgba(13,27,42,0.04), 0 8px 24px -12px rgba(13,27,42,0.12);
          background: var(--paper);
          color: var(--text);
          font-family: var(--font-planos-sora), system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .planos-page * { box-sizing: border-box; }
        .planos-page h1, .planos-page h2, .planos-page h3 { text-wrap: balance; margin: 0; }
        .planos-page p { margin: 0; }
        .planos-page .mono { font-family: var(--font-planos-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums; }
        .planos-page a { color: inherit; }
        .planos-page .wrap { max-width: 1080px; margin: 0 auto; padding-inline: 24px; }

        .planos-page .back { display: inline-block; padding: 16px 24px; font-size: 13.5px; color: var(--navy-text-muted); }
        .planos-page .back:hover { color: var(--navy-text); }

        .planos-page .hero { background: var(--navy); color: var(--navy-text); padding-block: 24px 72px; border-bottom: 1px solid var(--navy-line); }
        .planos-page .hero-inner { max-width: 1080px; margin: 0 auto; padding-inline: 24px; }
        .planos-page .eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--accent);
          background: rgba(30,224,170,0.1);
          border: 1px solid rgba(30,224,170,0.28);
          padding: 6px 12px; border-radius: 999px;
        }
        .planos-page .hero h1 { font-size: clamp(1.9rem, 3.8vw, 2.7rem); font-weight: 800; line-height: 1.16; margin-top: 18px; max-width: 30ch; }
        .planos-page .hero h1 em { font-style: normal; color: var(--accent); }
        .planos-page .hero p.lede { margin-top: 16px; font-size: 17px; line-height: 1.55; color: var(--navy-text-muted); max-width: 52ch; }
        .planos-page .hero-stats {
          margin-top: 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1px;
          background: var(--navy-line); border: 1px solid var(--navy-line); border-radius: 14px; overflow: hidden;
        }
        .planos-page .hero-stat { background: var(--navy-raised); padding: 16px 18px; }
        .planos-page .hero-stat .n { font-family: var(--font-planos-mono), monospace; font-weight: 600; font-size: 15px; color: var(--accent); }
        .planos-page .hero-stat .l { font-size: 12.5px; color: var(--navy-text-muted); margin-top: 3px; }

        .planos-page section.block { padding-block: 56px; }
        .planos-page .section-head { max-width: 62ch; margin-bottom: 32px; }
        .planos-page .section-head .kicker { font-size: 12.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-strong); }
        .planos-page .section-head h2 { font-size: clamp(1.5rem, 2.6vw, 1.9rem); font-weight: 700; margin-top: 8px; }
        .planos-page .section-head p { margin-top: 10px; color: var(--text-muted); font-size: 15.5px; line-height: 1.6; }

        .planos-page .plans { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 900px) { .planos-page .plans { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .planos-page .plans { grid-template-columns: 1fr; } }

        .planos-page .plan {
          background: var(--paper-raised); border: 1px solid var(--line); border-radius: 18px;
          padding: 26px 24px 24px; display: flex; flex-direction: column; gap: 18px; box-shadow: var(--shadow); position: relative;
        }
        .planos-page .plan-name { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
        .planos-page .plan-range { font-size: 14.5px; color: var(--text); margin-top: 2px; }
        .planos-page .plan-price { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
        .planos-page .plan-price .currency { font-family: var(--font-planos-mono), monospace; font-size: 16px; color: var(--text-muted); font-weight: 600; }
        .planos-page .plan-price .value { font-family: var(--font-planos-mono), monospace; font-size: 1.8rem; font-weight: 700; letter-spacing: -0.01em; }
        .planos-page .plan-price .period { font-size: 14px; color: var(--text-faint); }

        .planos-page .module-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .planos-page .module-item { border: 1px solid var(--line); background: var(--paper-sunken); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; font-weight: 600; }
        .planos-page .module-item span { display: block; font-weight: 400; font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        .planos-page .extras { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
        @media (max-width: 860px) { .planos-page .extras { grid-template-columns: 1fr; } }
        .planos-page .panel { background: var(--paper-raised); border: 1px solid var(--line); border-radius: 18px; padding: 24px; box-shadow: var(--shadow); }
        .planos-page .panel h3 { font-size: 1.05rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .planos-page .panel .tag {
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--accent-strong); background: var(--accent-wash); border: 1px solid var(--accent-wash-line);
          padding: 3px 8px; border-radius: 999px;
        }
        .planos-page .panel p { margin-top: 10px; color: var(--text-muted); font-size: 14.5px; line-height: 1.6; }

        .planos-page .fee-figure { display: flex; align-items: baseline; gap: 10px; margin-top: 14px; }
        .planos-page .fee-figure .pct-group { display: flex; align-items: baseline; gap: 8px; }
        .planos-page .fee-figure .riscado { font-family: var(--font-planos-mono), monospace; font-size: 1.15rem; font-weight: 600; color: var(--text-faint); text-decoration: line-through; text-decoration-color: var(--text-faint); }
        .planos-page .fee-figure .pct { font-family: var(--font-planos-mono), monospace; font-size: 2.4rem; font-weight: 700; color: var(--accent-strong); line-height: 1; }
        .planos-page .fee-figure .desc { font-size: 13.5px; color: var(--text-muted); max-width: 22ch; line-height: 1.45; }
        .planos-page .promo-tag {
          display: inline-block; margin-top: 10px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.03em;
          color: var(--accent-strong); background: var(--accent-wash); border: 1px solid var(--accent-wash-line);
          padding: 3px 9px; border-radius: 999px;
        }
        .planos-page .example { margin-top: 16px; border-top: 1px dashed var(--line); padding-top: 14px; font-size: 13.5px; color: var(--text-muted); line-height: 1.6; }
        .planos-page .example .mono { color: var(--text); font-weight: 600; }

        .planos-page .btn-secondary {
          display: inline-flex; align-items: center; gap: 7px; background: var(--paper-sunken); border: 1px solid var(--line);
          color: var(--text); font-weight: 600; font-size: 13.5px; padding: 9px 14px; border-radius: 10px; text-decoration: none;
        }
        .planos-page .specs-line { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px 10px; font-family: var(--font-planos-mono), monospace; font-size: 12px; color: var(--text-muted); }
        .planos-page .specs-line span { background: var(--paper-sunken); border: 1px solid var(--line); border-radius: 6px; padding: 3px 7px; }

        .planos-page .cta { background: var(--navy); color: var(--navy-text); padding-block: 48px; margin-top: 8px; }
        .planos-page .cta-inner { max-width: 1080px; margin: 0 auto; padding-inline: 24px; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .planos-page .cta h2 { font-size: 1.5rem; font-weight: 700; }
        .planos-page .cta p { margin-top: 6px; color: var(--navy-text-muted); font-size: 14.5px; }
        .planos-page .btn {
          display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: var(--navy);
          font-weight: 700; font-size: 15px; padding: 13px 22px; border-radius: 12px; text-decoration: none;
          white-space: nowrap; box-shadow: 0 8px 20px -8px rgba(30,224,170,0.5);
        }
        .planos-page .foot-note { max-width: 1080px; margin: 0 auto; padding: 20px 24px 40px; font-size: 12.5px; color: var(--text-faint); line-height: 1.6; }
      `}</style>

      <Link href="/" className="back">← Voltar pro iFREE</Link>

      <div className="hero">
        <div className="hero-inner">
          <span className="eyebrow">● iFREE para quem contrata extra</span>
          <h1>
            <em>Otimize seu tempo.</em> O iFREE cuida da gestão de pessoas do seu negócio.
          </h1>
          <p className="lede">
            Controla a escala, gera o termo de trabalho autônomo, cobra a assinatura no recibo de
            pagamento e paga via PIX — tudo 100% automático. Enquanto você cuida do resto do negócio,
            o iFREE cuida de quem trabalha com você.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="n">CPF → PIX</div>
              <div className="l">do check-in ao pagamento, sem toque manual</div>
            </div>
            <div className="hero-stat">
              <div className="n">Valor na hora</div>
              <div className="l">o extra vê quanto vai receber assim que bate a saída</div>
            </div>
            <div className="hero-stat">
              <div className="n">14 dias</div>
              <div className="l">grátis pra testar, sem cartão</div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <section className="block" id="planos">
          <div className="section-head">
            <div className="kicker">Plano único, sistema completo</div>
            <h2>Um plano só — o que muda é o tamanho do seu time</h2>
            <p>
              Sistema completo, liberado sem limitações desde o primeiro dia — um único ecossistema
              híbrido, atendendo extra e CLT juntos, no controle da sua empresa na palma da mão. Você
              no comando, sem precisar abrir câmera nem perguntar pra ninguém quem está trabalhando e
              que horas chegou. O preço muda só pelo tamanho do time: quantas pessoas{" "}
              <strong>trabalharam pelo menos 1 turno/ponto no mês</strong>, extra e CLT somados — não
              importa quanta gente você tem cadastrada no total.
            </p>
          </div>

          <div className="module-grid" style={{ marginTop: 0, marginBottom: 24 }}>
            <div className="module-item">
              Escala + PIX<span>check-in por CPF, PIX automático pro extra</span>
            </div>
            <div className="module-item">
              Ponto CLT<span>jornada, intervalo, banco de horas</span>
            </div>
            <div className="module-item">
              Documentos<span>contratos, advertência, termo de ciência</span>
            </div>
            <div className="module-item">
              PGR<span>inventário de riscos assinado</span>
            </div>
            <div className="module-item">
              Central de Ética<span>canal de denúncia com acompanhamento</span>
            </div>
            <div className="module-item">
              iFREE Conecta<span>vagas, candidatos e chat</span>
            </div>
          </div>

          <div className="plans">
            <div className="plan">
              <div className="plan-name">Até 20</div>
              <div className="plan-range">pessoas ativas/mês</div>
              <div className="plan-price">
                <span className="currency">R$</span>
                <span className="value">129,90</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <div className="plan">
              <div className="plan-name">Até 30</div>
              <div className="plan-range">pessoas ativas/mês</div>
              <div className="plan-price">
                <span className="currency">R$</span>
                <span className="value">159,90</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <div className="plan">
              <div className="plan-name">Até 50</div>
              <div className="plan-range">pessoas ativas/mês</div>
              <div className="plan-price">
                <span className="currency">R$</span>
                <span className="value">199,90</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <div className="plan">
              <div className="plan-name">Ilimitado</div>
              <div className="plan-range">qualquer tamanho de time</div>
              <div className="plan-price">
                <span className="currency">R$</span>
                <span className="value">299,90</span>
                <span className="period">/mês</span>
              </div>
            </div>
          </div>
        </section>

        <section className="block" style={{ paddingTop: 0 }}>
          <div className="extras">
            <div className="panel">
              <h3>
                PIX automático <span className="tag">taxa</span>
              </h3>
              <div className="fee-figure">
                <span className="pct-group">
                  <span className="riscado">3,99%</span>
                  <span className="pct">1,99%</span>
                </span>
                <span className="desc">no 1º ano — sobre o valor pago via PIX automático pela plataforma</span>
              </div>
              <span className="promo-tag">🎉 Promocional de lançamento</span>
              <p>
                Igual maquininha de cartão: sem movimentação, sem taxa. Você deposita o crédito, a
                gente distribui certinho pra cada pessoa no fechamento do turno/ponto. Depois do 1º
                ano, a taxa passa a ser 3,99% (o padrão da plataforma).
              </p>
              <div className="example">
                Exemplo: negócio no plano até 20, pagando <span className="mono">R$ 4.200,00</span> em
                turnos no mês → <span className="mono">R$ 129,90</span> + 1,99% de R$ 4.200 (
                <span className="mono">R$ 83,58</span>) = <span className="mono">R$ 213,48</span> no
                total.
              </div>
            </div>

            <div className="panel">
              <h3>
                Tablet pro totem <span className="tag">recomendado</span>
              </h3>
              <p>
                <strong>Positivo Vision Tab 10&quot;</strong> — é o único modelo que a gente indica pro
                totem: processador, câmera e resposta de toque dão conta do dia a dia sem travar. Não
                indicamos outras marcas/modelos — no uso real, costumam vir com processamento e câmera
                fracos demais pro totem.
              </p>
              <div className="specs-line">
                <span>10 polegadas</span>
                <span>4GB RAM</span>
                <span>128GB</span>
                <span>Octa-core</span>
                <span>13MP + selfie 5MP</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <a
                  className="btn-secondary"
                  href="https://www.google.com/search?q=Positivo+Vision+Tab+10+4GB+128GB"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔍 Buscar e comprar no Google
                </a>
              </div>
              <p style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
                Compre onde e como preferir. Prefere não comprar por fora? A gente fornece esse mesmo
                modelo financiado em até 12x sem juros, embutido na mensalidade — sem entrada, sem
                contrato à parte.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="cta">
        <div className="cta-inner">
          <div>
            <h2>14 dias grátis, sem cartão de crédito</h2>
            <p>Cadastra sua empresa, liga o totem e testa com o time de verdade.</p>
          </div>
          <WhatsAppButton mensagem={MENSAGEM_PLANOS} className="btn">
            Falar com a gente →
          </WhatsAppButton>
        </div>
      </div>
      <p className="foot-note">
        Valores em reais, cobrança mensal. &quot;Pessoa ativa&quot; = extra ou funcionário CLT com pelo
        menos 1 turno/ponto fechado na competência, somados juntos — quem sai da folha um mês não pesa
        na conta. Taxa de PIX automático: 1,99% no primeiro ano (promocional), 3,99% depois — incide só
        sobre o valor efetivamente pago via PIX automático pela plataforma, pagamento feito por fora não
        entra na conta. Fale com a gente pelo WhatsApp {WHATSAPP_NUMERO_FORMATADO}. iFREE ©{" "}
        {new Date().getFullYear()}.
      </p>
    </div>
  );
}
