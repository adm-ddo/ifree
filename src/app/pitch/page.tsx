"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PitchPage() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("on");
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));

    const barra = document.getElementById("progresso-pitch");
    function atualizarBarra() {
      const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
      const pct = alturaTotal > 0 ? (window.scrollY / alturaTotal) * 100 : 0;
      if (barra) barra.style.width = pct + "%";
    }
    window.addEventListener("scroll", atualizarBarra, { passive: true });
    atualizarBarra();

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", atualizarBarra);
    };
  }, []);

  return (
    <>
      <style>{`
        .pitch{
          --navy-900:#0d1b2a; --navy-800:#14202f; --navy-700:#1b263b;
          --navy-200:#c6ceda; --navy-100:#e4e8ee;
          --brand-300:#5fddba; --brand-400:#2ecfa3; --brand-500:#00c896;
          --branco:#ffffff;
          font-family: var(--font-urbanist), 'Urbanist', system-ui, sans-serif;
          background:var(--navy-900); color:var(--branco); overflow-x:hidden;
        }
        .pitch *{ box-sizing:border-box; }
        html{ scroll-behavior:smooth; }

        .pitch .progresso{ position:fixed; top:0; left:0; height:3px; background:var(--brand-400); z-index:50; width:0%; }
        .pitch section{ position:relative; min-height:100vh; padding:110px 8vw; display:flex; flex-direction:column; justify-content:center; gap:28px; overflow:hidden; }
        .pitch .blob{ position:absolute; border-radius:50%; filter:blur(90px); opacity:.16; pointer-events:none; }
        .pitch .blob-a{ width:620px; height:620px; background:var(--brand-500); top:-200px; left:-200px; }
        .pitch .blob-b{ width:560px; height:560px; background:var(--brand-400); bottom:-220px; right:-180px; }
        .pitch .fundo-linha{ position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px); background-size:100% 64px; pointer-events:none; }
        .pitch .conteudo{ position:relative; z-index:2; max-width:1180px; margin:0 auto; width:100%; }
        .pitch .kicker{
          display:inline-flex; align-items:center; gap:9px; font-size:14px; font-weight:800; letter-spacing:.12em;
          text-transform:uppercase; color:var(--brand-300); background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.14); padding:8px 18px; border-radius:99px; width:fit-content;
        }
        .pitch h1{ font-weight:900; font-size:clamp(40px,6vw,84px); line-height:1.06; letter-spacing:-.02em; max-width:1050px; text-wrap:balance; margin:0; }
        .pitch h2{ font-weight:900; font-size:clamp(32px,4.6vw,58px); line-height:1.12; letter-spacing:-.015em; max-width:900px; text-wrap:balance; margin:0; }
        .pitch .destaque{ color:var(--brand-400); }
        .pitch p.lead{ font-size:clamp(18px,1.6vw,24px); font-weight:500; color:var(--navy-100); max-width:780px; line-height:1.6; margin:0; }
        .pitch p.lead + p.lead{ margin-top:18px; }
        .pitch .reveal{ opacity:0; transform:translateY(28px); transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
        .pitch .reveal.on{ opacity:1; transform:translateY(0); }
        .pitch .reveal.d1{ transition-delay:.08s; } .pitch .reveal.d2{ transition-delay:.18s; }
        .pitch .reveal.d3{ transition-delay:.28s; } .pitch .reveal.d4{ transition-delay:.38s; }
        .pitch .marca{ display:flex; align-items:center; gap:12px; }
        .pitch .marca svg{ width:44px; height:38px; }
        .pitch .marca span{ font-weight:900; font-size:24px; letter-spacing:-.02em; }
        .pitch .marca .i{ color:var(--brand-400); }

        .pitch .lista-dores{ display:flex; flex-direction:column; gap:16px; margin-top:6px; }
        .pitch .item-dor{ display:flex; gap:16px; align-items:flex-start; font-size:clamp(17px,1.6vw,21px); font-weight:600; color:var(--navy-100); max-width:820px; margin:0; }
        .pitch .item-dor .marca-x{ width:30px; height:30px; border-radius:50%; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#f87171; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; margin-top:2px; }

        .pitch .pilares{ display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:10px; }
        .pitch .pilar{ background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.14); border-radius:22px; padding:32px; display:flex; flex-direction:column; gap:14px; }
        .pitch .pilar.verde{ border-color:rgba(0,200,150,.4); background:rgba(0,200,150,.07); }
        .pitch .pilar .rotulo{ font-size:13px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand-300); }
        .pitch .pilar h3{ font-size:27px; font-weight:900; letter-spacing:-.01em; margin:0; }
        .pitch .pilar .subtitulo{ font-size:15px; color:var(--navy-200); margin:-8px 0 0; }
        .pitch .pilar ul{ list-style:none; display:flex; flex-direction:column; gap:11px; margin:0; padding:0; }
        .pitch .pilar li{ font-size:15.5px; color:var(--navy-100); display:flex; gap:10px; align-items:flex-start; line-height:1.5; }
        .pitch .pilar li::before{ content:"→"; color:var(--brand-400); font-weight:800; flex-shrink:0; }
        .pitch .ponte{ display:flex; align-items:center; justify-content:center; gap:14px; font-weight:800; color:var(--navy-200); font-size:15px; text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
        .pitch .ponte .linha{ height:1px; flex:1; max-width:120px; background:rgba(255,255,255,.2); }

        .pitch .passos{ display:flex; flex-direction:column; gap:0; margin-top:10px; max-width:760px; }
        .pitch .passo{ display:flex; gap:20px; padding:20px 0; border-bottom:1px solid rgba(255,255,255,.1); }
        .pitch .passo:last-child{ border-bottom:none; }
        .pitch .passo .num{ font-size:15px; font-weight:900; color:var(--navy-900); background:var(--brand-500); width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pitch .passo h4{ font-size:17px; font-weight:800; margin:0 0 4px; }
        .pitch .passo p{ font-size:15px; color:var(--navy-200); margin:0; line-height:1.55; }

        .pitch .comparativo{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px; }
        .pitch .comp-card{ border-radius:20px; padding:26px; border:1px solid rgba(255,255,255,.12); }
        .pitch .comp-card.fraco{ background:rgba(255,255,255,.03); opacity:.75; }
        .pitch .comp-card.forte{ background:rgba(0,200,150,.08); border-color:rgba(0,200,150,.4); }
        .pitch .comp-card .rotulo{ font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--navy-200); margin-bottom:8px; display:block; }
        .pitch .comp-card.forte .rotulo{ color:var(--brand-300); }
        .pitch .comp-card p{ font-size:15.5px; line-height:1.6; color:var(--navy-100); margin:0; }

        .pitch .protecao-grade{ display:grid; grid-template-columns:260px 1fr; gap:44px; align-items:center; margin-top:14px; }
        .pitch .protecao-selo{ position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; background:rgba(0,200,150,.07); border:1px solid rgba(0,200,150,.35); border-radius:28px; padding:34px 20px 28px; }
        .pitch .protecao-selo svg{ width:126px; height:126px; }
        .pitch .protecao-selo strong{ font-size:24px; font-weight:900; letter-spacing:.03em; margin-top:4px; }
        .pitch .protecao-selo span{ font-size:13px; color:var(--navy-200); text-align:center; max-width:180px; line-height:1.4; }
        .pitch .protecao-lista ul{ list-style:none; display:flex; flex-direction:column; gap:17px; margin:0; padding:0; }
        .pitch .protecao-lista li{ font-size:16.5px; font-weight:600; color:var(--navy-100); display:flex; gap:14px; align-items:flex-start; line-height:1.55; margin:0; max-width:640px; }
        .pitch .marca-check{ width:26px; height:26px; border-radius:50%; background:rgba(0,200,150,.16); border:1px solid rgba(0,200,150,.45); color:var(--brand-300); display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; margin-top:1px; }
        .pitch .protecao-rodape{ font-size:14.5px; font-weight:700; color:var(--brand-300); margin-top:4px; }
        @media (max-width:820px){
          .pitch .protecao-grade{ grid-template-columns:1fr; justify-items:center; text-align:center; }
          .pitch .protecao-lista li{ text-align:left; }
        }

        .pitch .grade-numeros{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:10px; max-width:920px; }
        .pitch .numero{ display:flex; flex-direction:column; gap:4px; background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.12); border-radius:18px; padding:26px 22px; }
        .pitch .numero strong{ font-size:clamp(30px,3.4vw,42px); font-weight:900; color:var(--brand-400); letter-spacing:-.01em; }
        .pitch .numero span{ font-size:14px; color:var(--navy-200); line-height:1.4; }

        .pitch .final h1{ text-align:center; margin:0 auto; }
        .pitch .final-wrap{ align-items:center; text-align:center; }
        .pitch .cta-final{ display:inline-flex; align-items:center; gap:10px; background:var(--brand-500); color:var(--navy-900); font-weight:900; font-size:20px; padding:16px 34px; border-radius:16px; margin-top:6px; transition:filter .15s; }
        .pitch .cta-final:hover{ filter:brightness(1.05); }
        .pitch .cta-grupo{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-top:6px; }
        .pitch .cta-secundaria{ display:inline-flex; align-items:center; gap:10px; background:transparent; border:1.5px solid rgba(255,255,255,.3); color:#fff; font-weight:800; font-size:18px; padding:14.5px 32px; border-radius:16px; transition:background .15s; }
        .pitch .cta-secundaria:hover{ background:rgba(255,255,255,.08); }
        .pitch footer{ text-align:center; padding:40px 8vw 60px; color:var(--navy-200); font-size:13px; }
        .pitch footer a{ color:var(--navy-200); }
        @media (max-width:820px){
          .pitch .pilares, .pitch .comparativo{ grid-template-columns:1fr; }
          .pitch .grade-numeros{ grid-template-columns:1fr; }
          .pitch section{ padding:90px 6vw; }
          .pitch .ponte{ display:none; }
        }
        @media (prefers-reduced-motion: reduce){
          .pitch .reveal{ opacity:1; transform:none; transition:none; }
        }
      `}</style>

      <div className="pitch">
        <div className="progresso" id="progresso-pitch" />

        {/* 1. HERO */}
        <section>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="fundo-linha" />
          <div className="conteudo">
            <div className="marca reveal">
              <svg viewBox="0 0 120 100">
                <path d="M 66 30 C 82 20 100 10 116 4 C 106 16 92 26 78 34 C 74 36 68 35 66 30 Z" fill="#009E77" />
                <path d="M 69 36 C 84 28 98 22 110 20 C 100 30 88 38 78 42 C 74 43 70 40 69 36 Z" fill="#00B285" />
                <path d="M 71 42 C 82 37 92 34 100 34 C 92 42 82 47 75 47 C 72 47 70 45 71 42 Z" fill="#00C896" />
                <circle cx="44" cy="50" r="32" fill="none" stroke="#00C896" strokeWidth="11" />
                <circle cx="44" cy="50" r="26.5" fill="#0D1B2A" />
                <rect x="41" y="25" width="6" height="13" rx="3" fill="#FFFFFF" />
                <rect x="41" y="62" width="6" height="13" rx="3" fill="#FFFFFF" />
                <rect x="19" y="47" width="13" height="6" rx="3" fill="#FFFFFF" />
                <rect x="56" y="47" width="13" height="6" rx="3" fill="#FFFFFF" />
                <path d="M 38 48 L 44 55 L 55 35" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="i">i</span>FREE
              </span>
            </div>
            <span className="kicker reveal d1">O ecossistema completo</span>
            <h1 className="reveal d2">
              Controlamos o turno e pagamos por hora. Conectamos quem quer trabalhar com quem
              precisa de gente.
            </h1>
            <p className="lead reveal d3">
              iFREE é uma plataforma só, com duas metades que se completam:{" "}
              <strong>iFREE</strong>, o motor operacional que garante que todo turno seja batido,
              calculado e pago certo — e <strong>iFREE Conecta</strong>, a rede que dá ao
              freelancer uma identidade, uma reputação e um jeito de ser encontrado. Uma empresa
              nunca precisou escolher entre controle e conexão. Agora não precisa mesmo.
            </p>
            <p className="lead reveal d4">
              É um sistema de controle de freelancer presencial, com pagamento por hora
              trabalhada — e é a rede que conecta quem precisa e prefere fazer freela com quem
              precisa de mão de obra. É o <span className="destaque">match perfeito</span>: o
              famoso <span className="destaque">combinado não sai caro</span>, a liberdade de
              escolha entre quem busca uma fonte de renda e quem busca gente pra trabalhar. No
              iFREE, o freelancer ganha uma identidade dentro da plataforma — e é pela reputação
              que constrói que as oportunidades chegam até ele.
            </p>
          </div>
        </section>

        {/* 2. O PROBLEMA */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="conteudo">
            <span className="kicker reveal">O problema é dos dois lados</span>
            <h2 className="reveal d1">
              Quem contrata sofre com o controle. Quem trabalha sofre com o recomeço.
            </h2>
            <div className="lista-dores">
              <p className="item-dor reveal d2">
                <span className="marca-x">✕</span>
                Planilha de Excel pra somar hora, papel de recibo que some, desconfiança dos dois
                lados sobre quanto realmente foi trabalhado.
              </p>
              <p className="item-dor reveal d2">
                <span className="marca-x">✕</span>
                Todo turno novo é um freelancer desconhecido — sem histórico, sem prova de quem já
                trabalhou bem antes, decidido só pelo boca a boca do WhatsApp.
              </p>
              <p className="item-dor reveal d3">
                <span className="marca-x">✕</span>
                O freelancer se cadastra do zero em cada empresa nova — a reputação que ele
                construiu num lugar não vale nada no próximo.
              </p>
              <p className="item-dor reveal d3">
                <span className="marca-x">✕</span>
                Plataformas de freelance existem — mas foram feitas pra trabalho remoto. Nenhuma
                comprova que a pessoa apareceu de verdade, no balcão, na hora combinada.
              </p>
            </div>
          </div>
        </section>

        {/* 3. OS DOIS PILARES */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">A solução</span>
            <h2 className="reveal d1">Duas metades. Um ecossistema só.</h2>
            <p className="lead reveal d2">
              Não são dois produtos — é a mesma base de dados, a mesma pessoa, vista de dois
              jeitos: operação do dia a dia, e rede de oportunidades.
            </p>
            <div className="pilares">
              <div className="pilar reveal d3">
                <span className="rotulo">O útil</span>
                <h3>iFREE</h3>
                <p className="subtitulo">O motor que já roda hoje, turno após turno.</p>
                <ul>
                  <li>Check-in por CPF no totem, com foto e assinatura</li>
                  <li>Cálculo automático de hora, pausa e valor — sem planilha</li>
                  <li>Pagamento via PIX assim que o turno fecha</li>
                  <li>Contrato e recibo em PDF, gerados sozinhos</li>
                  <li>Controle de ponto CLT pra quem também tem funcionário fixo</li>
                </ul>
              </div>
              <div className="pilar verde reveal d4">
                <span className="rotulo">O agradável</span>
                <h3>iFREE Conecta</h3>
                <p className="subtitulo">A rede que nasce dos dados que o iFREE já tem.</p>
                <ul>
                  <li>Perfil único do freelancer — habilidades, foto, currículo pronto</li>
                  <li>Reputação que atravessa empresas, não fica presa a uma só</li>
                  <li>Quadro de vagas: empresa publica, freelancer se candidata</li>
                  <li>Match automático por habilidade em comum</li>
                  <li>Chat dentro do app — nada de negociar turno por WhatsApp</li>
                </ul>
              </div>
            </div>
            <div className="ponte reveal d4">
              <span className="linha" />
              mesma Pessoa, mesmo cadastro
              <span className="linha" />
            </div>
          </div>
        </section>

        {/* 4. COMO FUNCIONA, DO INÍCIO AO FIM */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="conteudo">
            <span className="kicker reveal">Como funciona, ponta a ponta</span>
            <h2 className="reveal d1">Do primeiro turno até virar uma carreira.</h2>
            <div className="passos">
              <div className="passo reveal d1">
                <span className="num">1</span>
                <div>
                  <h4>Bate o turno</h4>
                  <p>CPF, foto e assinatura no totem. Sem planilha, sem &quot;confia em mim&quot;.</p>
                </div>
              </div>
              <div className="passo reveal d2">
                <span className="num">2</span>
                <div>
                  <h4>Recebe certo, na hora</h4>
                  <p>O sistema calcula o valor exato e manda o PIX assim que o turno fecha.</p>
                </div>
              </div>
              <div className="passo reveal d2">
                <span className="num">3</span>
                <div>
                  <h4>Constrói reputação</h4>
                  <p>Empresa e freelancer se avaliam mutuamente — a nota fica com a pessoa.</p>
                </div>
              </div>
              <div className="passo reveal d3">
                <span className="num">4</span>
                <div>
                  <h4>Monta o perfil no Conecta</h4>
                  <p>Habilidades, foto, biografia — o currículo se escreve sozinho com o histórico real.</p>
                </div>
              </div>
              <div className="passo reveal d3">
                <span className="num">5</span>
                <div>
                  <h4>Aparece nas vagas certas</h4>
                  <p>Empresas publicam vagas; quem tem a habilidade certa dá match automaticamente.</p>
                </div>
              </div>
              <div className="passo reveal d4">
                <span className="num">6</span>
                <div>
                  <h4>Combina tudo no chat</h4>
                  <p>Deu match, abre conversa dentro do app — e o ciclo começa de novo, num lugar novo.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DIFERENCIAL */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">Por que ninguém mais fez isso</span>
            <h2 className="reveal d1">O nicho físico exige uma prova que o digital nunca precisou construir.</h2>
            <div className="comparativo">
              <div className="comp-card fraco reveal d2">
                <span className="rotulo">Plataformas de freelance de hoje</span>
                <p>
                  Feitas pra trabalho remoto — texto, design, programação. Ninguém verifica
                  presença real, foto na hora, assinatura no local. Reputação é uma nota solta,
                  não um turno comprovado.
                </p>
              </div>
              <div className="comp-card forte reveal d3">
                <span className="rotulo">iFREE</span>
                <p>
                  Já nasceu resolvendo exatamente o que o físico exige: identidade verificada na
                  entrada, prova de que o trabalho aconteceu, pagamento rastreado — e agora,
                  reputação e conexão construídas em cima disso.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5.5 PROTEÇÃO NR-1 */}
        <section>
          <div className="blob blob-a" />
          <div className="conteudo">
            <span className="kicker reveal">Novidade · Proteção que vira diferencial</span>
            <h2 className="reveal d1">
              O único sistema de gestão de extras do mercado que já nasce alinhado à NR-1.
            </h2>
            <p className="lead reveal d2">
              Enquanto o setor trata assédio, discriminação e risco psicossocial como
              &quot;problema de outro sistema&quot;, o iFREE já vem com um canal de ética
              embutido — pra proteger quem bate o turno, seja freelancer ou CLT, sem custar nada
              a mais e sem precisar contratar nenhuma ferramenta à parte.
            </p>
            <div className="protecao-grade">
              <div className="protecao-selo reveal d3">
                <svg viewBox="0 0 120 120" fill="none">
                  <circle
                    cx="60"
                    cy="60"
                    r="55"
                    stroke="#2ecfa3"
                    strokeWidth="2"
                    strokeDasharray="3 5"
                    opacity="0.6"
                  />
                  <path
                    d="M60 22 L93 35 V62 C93 86 78 100 60 109 C42 100 27 86 27 62 V35 Z"
                    fill="#00C896"
                  />
                  <path
                    d="M60 22 L93 35 V62 C93 86 78 100 60 109 V22 Z"
                    fill="#00B285"
                  />
                  <path
                    d="M44 63 L56 76 L80 47"
                    stroke="#0D1B2A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <strong>NR-1</strong>
                <span>Canal de Ética integrado ao app, sem custo extra</span>
              </div>
              <div className="protecao-lista">
                <ul>
                  <li className="reveal d3">
                    <span className="marca-check">✓</span>
                    Denúncia anônima ou identificada — pelo totem, pelo Portal ou por um link
                    público, sem sair do fluxo de trabalho.
                  </li>
                  <li className="reveal d3">
                    <span className="marca-check">✓</span>
                    Protocolo e senha próprios: quem denuncia acompanha o andamento sozinho, sem
                    depender de e-mail ou WhatsApp.
                  </li>
                  <li className="reveal d4">
                    <span className="marca-check">✓</span>
                    Fluxo com 7 etapas rastreadas, log de auditoria completo e alerta de prazo —
                    pronto pra mostrar numa fiscalização.
                  </li>
                  <li className="reveal d4">
                    <span className="marca-check">✓</span>
                    Acesso restrito a quem a empresa escolher — confidencialidade de verdade, não
                    só uma promessa.
                  </li>
                </ul>
                <p className="protecao-rodape reveal d4">
                  Mesma plataforma, mesma pessoa — agora também mais protegida.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. DIMENSÃO */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="conteudo">
            <span className="kicker reveal">Tamanho da coisa</span>
            <h2 className="reveal d1">
              Todo negócio que já contrata extra é cliente em potencial. Todo brasileiro que já
              trabalhou &quot;por fora&quot; é usuário em potencial.
            </h2>
            <div className="grade-numeros">
              <div className="numero reveal d2">
                <strong>2 lados</strong>
                <span>de um mesmo mercado, resolvidos por uma única base de dados</span>
              </div>
              <div className="numero reveal d3">
                <strong>1 cadastro</strong>
                <span>o freelancer se cadastra uma vez, leva a reputação pra qualquer empresa</span>
              </div>
              <div className="numero reveal d4">
                <strong>0 planilha</strong>
                <span>zero WhatsApp de negociação, zero papel, zero &quot;confia em mim&quot;</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FINAL */}
        <section className="final" style={{ background: "var(--navy-800)" }}>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="conteudo final-wrap">
            <h1 className="reveal">Entrou. Trabalhou. Recebeu. Se conectou.</h1>
            <p className="lead reveal d2" style={{ margin: "0 auto" }}>
              iFREE não é só um sistema de ponto, e não é só uma rede de freelancers. É a
              infraestrutura da liberdade de quem trabalha — e da autonomia de quem contrata.
            </p>
            <div className="cta-grupo reveal d3">
              <Link href="/portal/entrar" className="cta-final">
                🧑‍🍳 Sou freelancer
              </Link>
              <Link href="/login" className="cta-secundaria">
                🏢 Sou empresa
              </Link>
            </div>
          </div>
        </section>

        <footer>
          iFREE — Entrou. Trabalhou. Recebeu.{" "}
          <Link href="/">ifree.app.br</Link> · <Link href="/conecta">Descubra o Conecta</Link>
        </footer>
      </div>
    </>
  );
}
