import type { Metadata } from "next";
import Link from "next/link";
import { Sora } from "next/font/google";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { Logo, LogoIcon } from "@/components/Logo";
import WhatsAppButton from "@/components/WhatsAppButton";
import { WHATSAPP_NUMERO_FORMATADO, linkWhatsApp } from "@/lib/contato";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-home-sora",
});

export const metadata: Metadata = {
  title: "iFREE — Ecossistema de gestão e contratação de pessoas",
  description:
    "Freelancer e time CLT no mesmo painel: contratação, ponto, PIX automático e conformidade com a NR-1. A ferramenta ideal pro seu RH ou pra quem é dono do próprio negócio.",
};

const MENSAGEM_EMPRESA =
  "Olá, eu tenho uma empresa e gostaria de saber como funciona para colocar na minha empresa o iFREE.";

/** Home oficial do iFREE — promovida a partir de 2026-09-28 (era o
 * rascunho em /novo, agora removido/redirecionado pra cá). Reposiciona o
 * iFREE como ecossistema (freelancer + CLT + NR-1), não só "sistema de
 * extra pro restaurante" — essa versão anterior fica guardada em
 * /classica, sem link em lugar nenhum, só de referência. Sora carregado
 * só aqui (mesmo padrão de /planos, /pitch, /conecta) pra dar uma
 * identidade tipográfica própria. */

type Modulo = {
  emoji: string;
  titulo: string;
  desc: string;
};

const MODULOS: Modulo[] = [
  {
    emoji: "🧑‍🍳",
    titulo: "iFREE Conecta",
    desc: "Publique vaga, receba candidatos com reputação real (não só currículo) e converse só quando der match de verdade.",
  },
  {
    emoji: "⏱️",
    titulo: "Ponto CLT",
    desc: "Jornada, intervalo e banco de horas do seu time registrado — direto no mesmo totem do balcão ou da recepção.",
  },
  {
    emoji: "💳",
    titulo: "PIX automático",
    desc: "O Free assina o recibo na tela e recebe na hora, sem você abrir o banco pra fazer transferência manual.",
  },
  {
    emoji: "📄",
    titulo: "Documentos (GED)",
    desc: "Contrato, advertência, termo de ciência e EPI — gerados, assinados e guardados sem gaveta de papel.",
  },
  {
    emoji: "🛡️",
    titulo: "PGR — NR-1",
    desc: "Inventário de riscos, inclusive psicossociais, com participação do time e assinatura digital.",
  },
  {
    emoji: "📢",
    titulo: "Central de Ética",
    desc: "Canal de denúncia próprio, com acompanhamento e prazo — sem depender de planilha ou caixa de e-mail.",
  },
  {
    emoji: "📊",
    titulo: "Relatórios e financeiro",
    desc: "Quanto cada turno, cada pessoa e cada mês custaram — em tempo real, sem fechar planilha no fim do mês.",
  },
  {
    emoji: "👥",
    titulo: "Equipe e permissões",
    desc: "Cada pessoa do seu RH ou gerência vê só o que precisa — módulo por módulo, sem um login mestre pra tudo.",
  },
];

const NR1_PONTOS = [
  "A NR-1 passou a exigir que toda empresa avalie riscos psicossociais do ambiente de trabalho — não só risco físico ou químico.",
  "O iFREE já traz o PGR (Programa de Gerenciamento de Riscos) pronto pra isso: inventário assinado digitalmente, com a participação do próprio time.",
  "Sem planilha solta, sem consultoria avulsa toda vez que o auditor bate na porta — fica registrado no mesmo sistema onde você já gerencia as pessoas.",
];

const PARA_QUEM = [
  {
    emoji: "🗂️",
    titulo: "Pro seu RH",
    desc: "Um painel só pra contratar, documentar e acompanhar — em vez de planilha, WhatsApp e pastas espalhadas entre três sistemas diferentes.",
  },
  {
    emoji: "🔑",
    titulo: "Pra quem é dono",
    desc: "Empresa pequena não tem RH dedicado — o iFREE faz esse papel, com o controle inteiro na palma da sua mão, do celular.",
  },
];

export default async function Home() {
  const sessao = await getSessao();
  if (sessao?.empresaEfetivoId) redirect("/v2/dashboard");
  if (sessao?.isMaster) redirect("/master");

  return (
    <div className={`${sora.variable} flex flex-1 flex-col`} style={{ fontFamily: "var(--font-home-sora), var(--font-urbanist), sans-serif" }}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, #00C896 0%, transparent 38%), radial-gradient(circle at 88% 80%, #00C896 0%, transparent 42%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-32 flex flex-col items-center text-center gap-6 lg:gap-8">
          <span className="lg:hidden">
            <Logo size={64} claro />
          </span>
          <span className="hidden lg:inline-block">
            <Logo size={92} claro />
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-300">
            <LogoIcon size={15} />
            O maior ecossistema de gestão e contratação de pessoas
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white leading-[1.05]">
            Entrou. <span className="text-brand-400">Trabalhou.</span> Recebeu.
          </h1>
          <p className="text-navy-200 max-w-xl lg:max-w-3xl text-lg sm:text-xl lg:text-2xl">
            Um sistema que conecta todo mundo e organiza: é o match perfeito entre empresa e freelancer.
            Controlamos o turno e pagamos por hora — conectamos quem quer trabalhar com quem precisa de
            gente.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mt-2">
            <Link
              href="#empresa"
              className="rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              🏢 Sou empresa, quero saber mais
            </Link>
            <Link
              href="/portal/entrar"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors"
            >
              🧑‍🍳 Sou freelancer, quero trabalhar
            </Link>
          </div>
          <p className="text-navy-400 text-sm lg:text-base">
            7 dias grátis · Sem cartão de crédito · Configuração em minutos
          </p>
        </div>
      </section>

      {/* Duas metades, uma plataforma só */}
      <section className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20 lg:py-24 flex flex-col items-center text-center gap-5 lg:gap-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-navy-900">
            Duas metades. Uma plataforma só.
          </h2>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            iFREE é uma plataforma só, com duas metades que se completam: o <strong>iFREE</strong>, motor
            operacional que garante que todo turno seja batido, calculado e pago certo — e o{" "}
            <strong>iFREE Conecta</strong>, a rede que dá ao freelancer uma identidade, uma reputação e
            um jeito de ser encontrado. Uma empresa nunca precisou escolher entre controle e conexão.
            Agora não precisa mesmo.
          </p>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            É o match perfeito: o famoso combinado não sai caro, e cada lado tem a liberdade de escolher
            — quem busca uma fonte de renda e quem busca gente pra trabalhar. No iFREE, o freelancer
            ganha uma identidade dentro da plataforma, e é pela reputação que constrói que as
            oportunidades chegam até ele.
          </p>
        </div>
      </section>

      {/* Pra quem é o ecossistema — ponte rápida */}
      <section className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-10 lg:py-12 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
              🧑‍🍳
            </span>
            <div>
              <p className="font-bold text-navy-900 lg:text-lg">Trabalha por conta própria</p>
              <p className="text-sm lg:text-base text-stone-500 mt-1">
                Freelancer, autônomo, bico, extra — sem vínculo empregatício, escolhendo os turnos que
                topa e recebendo em PIX assim que termina.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-2xl">
              🏢
            </span>
            <div>
              <p className="font-bold text-navy-900 lg:text-lg">Contrata e gerencia pessoas</p>
              <p className="text-sm lg:text-base text-stone-500 mt-1">
                Procurando quem precisa? Anuncie a vaga, controle o ponto do time inteiro — extra e CLT —
                e fique em dia com as normas, tudo no mesmo lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sou empresa — módulos */}
      <section id="empresa" className="scroll-mt-16 bg-stone-50">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-10 lg:gap-14">
          <div className="text-center flex flex-col gap-2 lg:gap-3 items-center">
            <p className="text-brand-600 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Pra sua empresa
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-900 max-w-3xl">
              Tudo que seu RH precisa, na palma da mão
            </h2>
            <p className="text-stone-500 text-sm lg:text-base max-w-2xl lg:max-w-3xl mt-1">
              É a ferramenta ideal pro RH de uma empresa estruturada — ou pra você, dono de negócio
              pequeno, que ainda faz esse papel sozinho e quer parar de controlar gente por planilha.
            </p>
          </div>

          {/* Totem em destaque */}
          <div className="rounded-3xl border-2 border-brand-500 bg-white p-7 lg:p-10 shadow-lg shadow-brand-500/10 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
            <span className="flex h-16 w-16 lg:h-20 lg:w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-4xl lg:text-5xl mx-auto lg:mx-0">
              📋
            </span>
            <div className="flex flex-col gap-2 text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                O coração do sistema
              </p>
              <h3 className="text-2xl lg:text-3xl font-extrabold text-navy-900">
                Um totem. Dois mundos.
              </h3>
              <p className="text-stone-600 text-sm lg:text-base leading-relaxed max-w-2xl">
                O mesmo tablet no balcão ou na recepção bate o CPF do freelancer — com foto, assinatura e
                PIX liberado na hora — <strong>e</strong> registra o ponto oficial de quem é CLT: entrada,
                intervalo, saída. Sem comprar dois sistemas, sem treinar a equipe em duas telas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {MODULOS.map((m) => (
              <div
                key={m.titulo}
                className="rounded-2xl border border-stone-200 bg-white p-5 lg:p-6 shadow-sm flex flex-col gap-2"
              >
                <span className="text-2xl lg:text-3xl">{m.emoji}</span>
                <p className="font-bold text-navy-900 text-sm lg:text-base">{m.titulo}</p>
                <p className="text-xs lg:text-sm text-stone-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Link
              href="/planos"
              className="rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-base lg:text-lg font-bold px-7 py-4 transition-colors"
            >
              Ver planos e preços →
            </Link>
          </div>
        </div>
      </section>

      {/* NR-1 */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <LogoIcon
          size={340}
          className="pointer-events-none absolute -right-20 -bottom-20 opacity-[0.1] hidden sm:block"
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-4 lg:gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3.5 py-1 text-[11px] lg:text-xs font-bold uppercase tracking-wider text-brand-300">
              Novidade · Proteção que vira diferencial
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
              O único sistema de gestão de extras do mercado que <span className="text-brand-400">já nasce alinhado à NR-1</span>.
            </h2>
            <p className="text-navy-200 text-base lg:text-lg max-w-md">
              Enquanto o setor trata assédio, discriminação e risco psicossocial como &quot;problema de
              outro sistema&quot;, o iFREE já vem com um canal de ética embutido — pra proteger quem bate
              o turno, seja freelancer ou CLT, sem custar nada a mais e sem precisar contratar nenhuma
              ferramenta à parte.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:gap-5">
            {NR1_PONTOS.map((p) => (
              <div
                key={p}
                className="flex items-start gap-3 lg:gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 lg:p-6"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-navy-900 font-black text-sm mt-0.5">
                  ✓
                </span>
                <p className="text-navy-100 text-sm lg:text-base leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pra quem é (RH / dono) */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-10 lg:gap-14">
          <div className="text-center flex flex-col gap-2 lg:gap-3 items-center">
            <p className="text-brand-600 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Feito pra quem cuida das pessoas
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-900 max-w-2xl">
              Ideal pro seu RH. Ideal pra você, dono do negócio.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
            {PARA_QUEM.map((p) => (
              <div
                key={p.titulo}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-6 lg:p-8 flex flex-col gap-3"
              >
                <span className="text-3xl lg:text-4xl">{p.emoji}</span>
                <p className="font-extrabold text-navy-900 text-lg lg:text-xl">{p.titulo}</p>
                <p className="text-sm lg:text-base text-stone-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sou freelancer — pitch curto */}
      <section id="freelancer" className="scroll-mt-16 bg-stone-50 border-y border-stone-200">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col items-center text-center gap-6 lg:gap-8">
          <span className="flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-50 text-3xl">
            🧑‍🍳
          </span>
          <div className="flex flex-col gap-2 lg:gap-3 max-w-2xl">
            <p className="text-brand-700 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Pra você, freelancer
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-900">
              Trabalho avulso, sem vínculo, com dinheiro caindo na hora
            </h2>
            <p className="text-stone-600 text-base lg:text-lg">
              Um cadastro só vale em qualquer empresa do iFREE — com reputação que atravessa junto com
              você. Escolha o turno que topa, bata o CPF no totem, e receba o PIX assim que encerrar.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/portal/entrar"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 transition-colors shadow-lg shadow-brand-500/20"
            >
              Quero ser freelancer →
            </Link>
            <Link
              href="/freelancer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 transition-colors hover:bg-stone-50"
            >
              Como funciona? Veja o passo a passo
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl w-full px-4 py-16 sm:py-24 lg:py-28">
        <div className="rounded-3xl bg-navy-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center gap-5 lg:gap-6">
          <LogoIcon size={60} className="lg:hidden" />
          <LogoIcon size={84} className="hidden lg:block" />
          <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight max-w-lg lg:max-w-2xl">
            Um ecossistema. Todas as pessoas do seu negócio.
          </p>
          <p className="text-navy-300 max-w-md lg:max-w-lg lg:text-lg">
            Fala com a gente no WhatsApp — a gente te mostra o sistema funcionando antes de você decidir.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mt-2">
            <WhatsAppButton
              mensagem={MENSAGEM_EMPRESA}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              Cadastrar minha empresa
            </WhatsAppButton>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-8 lg:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="lg:hidden">
            <Logo size={24} />
          </span>
          <span className="hidden lg:inline-block">
            <Logo size={30} />
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm lg:text-base text-stone-500">
            <Link href="/planos" className="hover:text-brand-700 transition-colors">
              Planos
            </Link>
            <Link href="/conecta" className="hover:text-brand-700 transition-colors">
              iFREE Conecta
            </Link>
            <Link href="/portal/entrar" className="hover:text-brand-700 transition-colors">
              Já trabalhou por aqui? Acesse seu perfil
            </Link>
            <Link href="/termos" className="hover:text-brand-700 transition-colors">
              Termos de Uso
            </Link>
            <a
              href={linkWhatsApp(MENSAGEM_EMPRESA)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-700 transition-colors"
            >
              {WHATSAPP_NUMERO_FORMATADO}
            </a>
            <span>© {new Date().getFullYear()} iFREE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
