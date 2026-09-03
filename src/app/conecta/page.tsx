"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ConectaPage() {
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

    const barra = document.getElementById("progresso");
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
        .conecta{
          --navy-900:#0d1b2a; --navy-800:#14202f; --navy-700:#1b263b;
          --navy-200:#c6ceda; --navy-100:#e4e8ee;
          --brand-300:#5fddba; --brand-400:#2ecfa3; --brand-500:#00c896;
          --branco:#ffffff;
          font-family: var(--font-urbanist), 'Urbanist', system-ui, sans-serif;
          background:var(--navy-900); color:var(--branco); overflow-x:hidden;
        }
        .conecta *{ box-sizing:border-box; }
        html{ scroll-behavior:smooth; }

        .conecta .progresso{ position:fixed; top:0; left:0; height:3px; background:var(--brand-400); z-index:50; width:0%; }
        .conecta section{ position:relative; min-height:100vh; padding:110px 8vw; display:flex; flex-direction:column; justify-content:center; gap:28px; overflow:hidden; }
        .conecta .blob{ position:absolute; border-radius:50%; filter:blur(90px); opacity:.16; pointer-events:none; }
        .conecta .blob-a{ width:620px; height:620px; background:var(--brand-500); top:-200px; left:-200px; }
        .conecta .blob-b{ width:560px; height:560px; background:var(--brand-400); bottom:-220px; right:-180px; }
        .conecta .fundo-linha{ position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px); background-size:100% 64px; pointer-events:none; }
        .conecta .conteudo{ position:relative; z-index:2; max-width:1180px; margin:0 auto; width:100%; }
        .conecta .kicker{
          display:inline-flex; align-items:center; gap:9px; font-size:14px; font-weight:800; letter-spacing:.12em;
          text-transform:uppercase; color:var(--brand-300); background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.14); padding:8px 18px; border-radius:99px; width:fit-content;
        }
        .conecta h1{ font-weight:900; font-size:clamp(40px,6vw,84px); line-height:1.06; letter-spacing:-.02em; max-width:1000px; text-wrap:balance; margin:0; }
        .conecta h2{ font-weight:900; font-size:clamp(32px,4.6vw,58px); line-height:1.12; letter-spacing:-.015em; max-width:900px; text-wrap:balance; margin:0; }
        .conecta .destaque{ color:var(--brand-400); }
        .conecta p.lead{ font-size:clamp(18px,1.6vw,24px); font-weight:500; color:var(--navy-100); max-width:760px; line-height:1.6; margin:0; }
        .conecta .reveal{ opacity:0; transform:translateY(28px); transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
        .conecta .reveal.on{ opacity:1; transform:translateY(0); }
        .conecta .reveal.d1{ transition-delay:.08s; } .conecta .reveal.d2{ transition-delay:.18s; }
        .conecta .reveal.d3{ transition-delay:.28s; } .conecta .reveal.d4{ transition-delay:.38s; }
        .conecta .marca{ display:flex; align-items:center; gap:12px; }
        .conecta .marca svg{ width:44px; height:38px; }
        .conecta .marca span{ font-weight:900; font-size:24px; letter-spacing:-.02em; }
        .conecta .marca .i{ color:var(--brand-400); }
        .conecta .grade3{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:8px; }
        .conecta .card{ background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.12); border-radius:20px; padding:26px; display:flex; flex-direction:column; gap:10px; }
        .conecta .card .emoji{ font-size:30px; }
        .conecta .card h3{ font-size:19px; font-weight:800; margin:0; }
        .conecta .card p{ font-size:15px; color:var(--navy-200); line-height:1.55; margin:0; }
        .conecta .lista-dores{ display:flex; flex-direction:column; gap:16px; margin-top:6px; }
        .conecta .item-dor{ display:flex; gap:16px; align-items:flex-start; font-size:clamp(17px,1.6vw,21px); font-weight:600; color:var(--navy-100); max-width:820px; margin:0; }
        .conecta .item-dor .marca-x{ width:30px; height:30px; border-radius:50%; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#f87171; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; margin-top:2px; }
        .conecta .duas-colunas{ display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:10px; }
        .conecta .coluna{ background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.14); border-radius:22px; padding:30px; display:flex; flex-direction:column; gap:14px; }
        .conecta .coluna.verde{ border-color:rgba(0,200,150,.4); background:rgba(0,200,150,.07); }
        .conecta .coluna .rotulo{ font-size:13px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand-300); }
        .conecta .coluna h3{ font-size:26px; font-weight:900; letter-spacing:-.01em; margin:0; }
        .conecta .coluna ul{ list-style:none; display:flex; flex-direction:column; gap:10px; margin:0; padding:0; }
        .conecta .coluna li{ font-size:15.5px; color:var(--navy-100); display:flex; gap:10px; align-items:flex-start; line-height:1.5; }
        .conecta .coluna li::before{ content:"→"; color:var(--brand-400); font-weight:800; flex-shrink:0; }
        .conecta .mock-avaliacao{ background:var(--branco); color:var(--navy-900); border-radius:22px; padding:28px 30px; max-width:460px; box-shadow:0 30px 70px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:14px; }
        .conecta .mock-avaliacao .topo{ display:flex; justify-content:space-between; align-items:center; }
        .conecta .mock-avaliacao .topo strong{ font-size:16px; }
        .conecta .estrelas{ font-size:22px; letter-spacing:2px; color:#f5b400; }
        .conecta .tags-rapidas{ display:flex; flex-wrap:wrap; gap:8px; }
        .conecta .tag-rapida{ background:#e6fbf5; color:#00906d; border:1px solid #96ebd1; font-size:13px; font-weight:700; padding:7px 13px; border-radius:99px; }
        .conecta .comparativo{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px; }
        .conecta .comp-card{ border-radius:20px; padding:26px; border:1px solid rgba(255,255,255,.12); }
        .conecta .comp-card.fraco{ background:rgba(255,255,255,.03); opacity:.75; }
        .conecta .comp-card.forte{ background:rgba(0,200,150,.08); border-color:rgba(0,200,150,.4); }
        .conecta .comp-card .rotulo{ font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--navy-200); margin-bottom:8px; display:block; }
        .conecta .comp-card.forte .rotulo{ color:var(--brand-300); }
        .conecta .comp-card p{ font-size:15.5px; line-height:1.6; color:var(--navy-100); margin:0; }
        .conecta .grade-segmentos{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; max-width:920px; margin-top:8px; }
        .conecta .seg{ display:flex; flex-direction:column; align-items:center; gap:6px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:18px 8px; text-align:center; }
        .conecta .seg .emoji{ font-size:30px; }
        .conecta .seg .nome{ font-size:13.5px; font-weight:700; color:var(--navy-100); }
        .conecta .final h1{ text-align:center; margin:0 auto; }
        .conecta .final-wrap{ align-items:center; text-align:center; }
        .conecta .cta-final{ display:inline-flex; align-items:center; gap:10px; background:var(--brand-500); color:var(--navy-900); font-weight:900; font-size:20px; padding:16px 34px; border-radius:16px; margin-top:6px; }
        .conecta .cta-grupo{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-top:6px; }
        .conecta .cta-secundaria{ display:inline-flex; align-items:center; gap:10px; background:transparent; border:1.5px solid rgba(255,255,255,.3); color:#fff; font-weight:800; font-size:18px; padding:14.5px 32px; border-radius:16px; transition:background .15s; }
        .conecta .cta-secundaria:hover{ background:rgba(255,255,255,.08); }
        .conecta .cta-final:hover{ filter:brightness(1.05); }
        .conecta footer{ text-align:center; padding:40px 8vw 60px; color:var(--navy-200); font-size:13px; }
        @media (max-width:820px){
          .conecta .grade3, .conecta .duas-colunas, .conecta .comparativo{ grid-template-columns:1fr; }
          .conecta .grade-segmentos{ grid-template-columns:repeat(2,1fr); }
          .conecta section{ padding:90px 6vw; }
        }
        @media (prefers-reduced-motion: reduce){
          .conecta .reveal{ opacity:1; transform:none; transition:none; }
        }
      `}</style>

      <div className="conecta">
        <div className="progresso" id="progresso" />

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
            <span className="kicker reveal d1">A próxima frente</span>
            <h1 className="reveal d2">Ninguém deveria recomeçar do zero toda vez que troca de trabalho.</h1>
            <p className="lead reveal d3">
              Hoje, cada extra se cadastra de novo em cada empresa nova. Cada empresa procura gente do zero a cada
              vaga que abre. O iFREE já resolve o meio disso — a hora de bater ponto, calcular a hora, pagar certo.
              Agora vamos resolver o começo: <strong>como as pessoas certas se encontram.</strong>
            </p>
          </div>
        </section>

        {/* 2. O PULO DO GATO */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="blob blob-b" />
          <div className="conteudo">
            <span
              className="kicker reveal"
              style={{ color: "var(--branco)", background: "var(--brand-500)", borderColor: "var(--brand-500)" }}
            >
              O pulo do gato
            </span>
            <h2 className="reveal d1">
              Todo mundo já brigou pelo trabalho <span className="destaque">digital</span>. Quase ninguém resolveu o
              trabalho <span className="destaque">físico</span>.
            </h2>
            <p className="lead reveal d2">
              Design, texto, programação, tradução — isso já tem gente grande disputando há anos. Garçom, montador,
              diarista, promotor, ajudante de obra — gente que precisa aparecer de verdade, num lugar físico, na hora
              marcada — isso ninguém construiu direito ainda. Não é o mesmo mercado. É um mercado inteiro sem dono.
            </p>
            <p className="lead reveal d3">
              <strong style={{ color: "var(--branco)" }}>Esse é o nicho do iFREE.</strong> Presencial. Físico.
              Verificado. É o que já sabemos fazer todo santo dia.
            </p>
          </div>
        </section>

        {/* 3. HOJE / PROVA */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">Hoje, em produção</span>
            <h2 className="reveal d1">
              O iFREE já é o registro mais confiável que existe sobre como as pessoas trabalham de verdade.
            </h2>
            <div className="grade3">
              <div className="card reveal d1">
                <span className="emoji">📸</span>
                <h3>Identidade verificada</h3>
                <p>CPF, foto e assinatura digital a cada turno — não é um perfil que alguém preencheu uma vez e esqueceu.</p>
              </div>
              <div className="card reveal d2">
                <span className="emoji">⏱️</span>
                <h3>Histórico real de trabalho</h3>
                <p>Cada turno, cada hora, cada função — com prova de que aconteceu, no lugar certo, na hora certa.</p>
              </div>
              <div className="card reveal d3">
                <span className="emoji">💸</span>
                <h3>Pagamento rastreado</h3>
                <p>PIX de verdade, recibo de verdade. Não é currículo — é comprovante de que o trabalho foi feito e pago.</p>
              </div>
            </div>
            <p className="lead reveal d4" style={{ marginTop: 6 }}>
              Isso não é uma ideia nova pra construir do zero. É dado que o iFREE já gera todo santo dia, em
              restaurantes, eventos e obras espalhados pelo Brasil.
            </p>
          </div>
        </section>

        {/* 4. O PROBLEMA */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="blob blob-a" />
          <div className="conteudo">
            <span className="kicker reveal">O que ainda falta</span>
            <h2 className="reveal d1">O extra troca de emprego, mas nunca leva o histórico junto.</h2>
            <div className="lista-dores">
              <p className="item-dor reveal d1">
                <span className="marca-x">✕</span> Cada empresa nova é cadastro novo, foto nova, papelada nova —
                mesmo pra quem já provou que é bom em outro lugar.
              </p>
              <p className="item-dor reveal d2">
                <span className="marca-x">✕</span> A reputação de um bom profissional não sai do boca a boca de
                grupo de WhatsApp.
              </p>
              <p className="item-dor reveal d3">
                <span className="marca-x">✕</span> Quem precisa de gente pra sexta à noite não tem como saber quem,
                perto dali, já provou que dá conta.
              </p>
            </div>
          </div>
        </section>

        {/* 5. A VIRADA */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">A sacada</span>
            <h2 className="reveal d1">
              O iFREE já trata cada pessoa como <span className="destaque">um cadastro único</span> — nunca um
              cadastro por empresa.
            </h2>
            <p className="lead reveal d2">
              Isso não é uma reforma no sistema. É a extensão natural de uma decisão que já foi tomada desde o
              primeiro dia: a mesma pessoa pode trabalhar em várias empresas diferentes sem duplicar quem ela é. Dar
              a ela um perfil que pertence à própria pessoa — não a cada empresa onde passou — é o próximo passo
              óbvio, não uma reconstrução.
            </p>
          </div>
        </section>

        {/* 6. O PORTAL */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="blob blob-b" />
          <div className="conteudo">
            <span className="kicker reveal">iFREE Conecta</span>
            <h2 className="reveal d1">Um portal, dois lados, uma rede só.</h2>
            <div className="duas-colunas">
              <div className="coluna verde reveal d2">
                <span className="rotulo">Pra quem trabalha</span>
                <h3>O extra</h3>
                <ul>
                  <li>Perfil completo uma vez só: documentos, fotos, habilidades e disponibilidade.</li>
                  <li>Vê vagas abertas perto dele, por tipo de função.</li>
                  <li>Se candidata com um toque — sem repetir cadastro nenhum.</li>
                  <li>Constrói reputação que atravessa empresas.</li>
                </ul>
              </div>
              <div className="coluna reveal d3">
                <span className="rotulo">Pra quem contrata</span>
                <h3>A empresa</h3>
                <ul>
                  <li>Publica a vaga aberta pro turno de sexta.</li>
                  <li>Busca por habilidade, função e histórico real.</li>
                  <li>Vê nota e comentários de outras empresas antes de chamar.</li>
                  <li>Escolhe com informação — não no escuro.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7. REPUTAÇÃO */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">Confiança de verdade</span>
            <h2 className="reveal d1">Toda vez que o turno termina, os dois lados se avaliam.</h2>
            <p className="lead reveal d2" style={{ marginBottom: 6 }}>
              Sem formulário longo — um toque e pronto:
            </p>
            <div className="mock-avaliacao reveal d3">
              <div className="topo">
                <strong>Como foi o turno de hoje?</strong>
                <span className="estrelas">★★★★★</span>
              </div>
              <div className="tags-rapidas">
                <span className="tag-rapida">😊 Gostei do trabalho</span>
                <span className="tag-rapida">🔥 Hoje foi movimentado</span>
                <span className="tag-rapida">👍 Bom lugar pra trabalhar</span>
              </div>
            </div>
            <p className="lead reveal d4">
              A empresa avalia o extra do mesmo jeito. Nota e comentário, dos dois lados, virando reputação que fica
              com a pessoa — não com o WhatsApp de ninguém.
            </p>
          </div>
        </section>

        {/* 8. DIFERENCIAL */}
        <section style={{ background: "var(--navy-800)" }}>
          <div className="conteudo">
            <span className="kicker reveal">Na prática</span>
            <h2 className="reveal d1">O nicho físico exige uma prova que o digital nunca precisou construir.</h2>
            <div className="comparativo">
              <div className="comp-card fraco reveal d2">
                <span className="rotulo">Plataformas de freelance de hoje</span>
                <p>
                  Feitas pra trabalho remoto — texto, design, programação. Ninguém verifica presença real, foto na
                  hora, assinatura no local. Reputação é uma nota, não um turno comprovado.
                </p>
              </div>
              <div className="comp-card forte reveal d3">
                <span className="rotulo">iFREE</span>
                <p>
                  Já nasceu resolvendo exatamente o que o físico exige: identidade verificada na entrada, prova de
                  que o trabalho aconteceu, pagamento rastreado — e agora, reputação construída em cima disso.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. DIMENSÃO */}
        <section>
          <div className="conteudo">
            <span className="kicker reveal">Tamanho da coisa</span>
            <h2 className="reveal d1">
              Todo negócio que já contrata extra hoje é cliente em potencial. Todo brasileiro que já trabalhou &quot;por
              fora&quot; é usuário em potencial.
            </h2>
            <div className="grade-segmentos">
              <div className="seg reveal d1"><span className="emoji">🍽️</span><span className="nome">Bares e restaurantes</span></div>
              <div className="seg reveal d1"><span className="emoji">🎉</span><span className="nome">Eventos e festas</span></div>
              <div className="seg reveal d2"><span className="emoji">🏨</span><span className="nome">Hotelaria</span></div>
              <div className="seg reveal d2"><span className="emoji">🛍️</span><span className="nome">Comércio</span></div>
              <div className="seg reveal d3"><span className="emoji">🧹</span><span className="nome">Limpeza</span></div>
              <div className="seg reveal d3"><span className="emoji">💇</span><span className="nome">Beleza</span></div>
              <div className="seg reveal d4"><span className="emoji">🧱</span><span className="nome">Construção</span></div>
              <div className="seg reveal d4"><span className="emoji">🏢</span><span className="nome">Escritórios</span></div>
            </div>
          </div>
        </section>

        {/* 10. FINAL */}
        <section className="final" style={{ background: "var(--navy-800)" }}>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="conteudo final-wrap">
            <h1 className="reveal">Escolheu. Entrou. Trabalhou. Recebeu.</h1>
            <p className="lead reveal d2" style={{ margin: "0 auto" }}>
              iFREE não é só um sistema de ponto. É a infraestrutura da liberdade de quem trabalha — e da autonomia
              de quem contrata.
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

        <footer>iFREE Conecta — visão do produto.</footer>
      </div>
    </>
  );
}
