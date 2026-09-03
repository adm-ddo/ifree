import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { Logo, LogoIcon } from "@/components/Logo";
import WhatsAppButton from "@/components/WhatsAppButton";
import { WHATSAPP_NUMERO_FORMATADO, linkWhatsApp } from "@/lib/contato";

const MENSAGEM_PADRAO = "Olá! Vi o iFREE e quero saber mais sobre como funciona.";

const PASSOS = [
  {
    numero: "1",
    titulo: "O extra bate o CPF no totem",
    desc: "Num tablet fixo no local — ou no celular da própria empresa, se ainda não tiver tablet. Cadastro na primeira vez, foto (que já comprova que ela está no lugar certo) e assinatura digital do contrato — tudo em menos de 1 minuto.",
  },
  {
    numero: "2",
    titulo: "O sistema calcula sozinho",
    desc: "Horas trabalhadas, intervalo, diária ou valor/hora — o iFREE soma tudo automaticamente, sem planilha e sem erro de conta.",
  },
  {
    numero: "3",
    titulo: "Pagamento no PIX, na hora",
    desc: "Ao encerrar o turno, o extra assina o recibo na tela e o PIX é disparado — você acompanha tudo pelo painel.",
  },
];

const FUNCIONALIDADES = [
  {
    emoji: "👥",
    titulo: "Gestão de profissionais",
    desc: "Cadastro simples e seguro com CPF ou CNPJ (MEI) — a pessoa se identifica sozinha no totem.",
  },
  {
    emoji: "⏱️",
    titulo: "Controle de horas",
    desc: "Cálculo automático das horas trabalhadas, em blocos de 5 minutos, ou diária fixa configurável.",
  },
  {
    emoji: "📄",
    titulo: "Contratos e recibos",
    desc: "Geração automática de contrato e recibo, assinados na tela pelo profissional.",
  },
  {
    emoji: "💳",
    titulo: "Pagamentos organizados",
    desc: "Acompanhe quem, quanto e quando pagar, com total controle do custo.",
  },
];

const DORES = [
  "Chega de planilha de Excel pra somar hora de extra.",
  "Chega de fiado de recibo em papel que some ou rasga.",
  "Chega de discussão sobre quantas horas a pessoa realmente trabalhou.",
  "Chega de extra desconfiando se o pagamento bateu certo.",
];

const LIBERDADE_PONTOS = [
  "Paga só o que foi trabalhado, em blocos de 5 minutos — nada de arredondar a hora pra cima ou pra baixo.",
  "Sem escala fixa e sem vínculo empregatício: cada turno é um combinado novo, o extra decide se topa.",
  "O extra vê na tela, antes de assinar o turno, exatamente quanto vai receber — sem letra miúda, sem desconfiança.",
];

const SEGMENTOS = [
  {
    emoji: "🍽️",
    titulo: "Bares, restaurantes e lanchonetes",
    desc: "Garçom, cozinha e barman extra em dias de pico, sexta e fim de semana.",
    destaque: true,
  },
  {
    emoji: "🎉",
    titulo: "Eventos e festas",
    desc: "Buffet, cerimonial, montagem e staff de apoio avulso.",
  },
  {
    emoji: "🏨",
    titulo: "Hotelaria e turismo",
    desc: "Camareira e recepção extra em alta temporada.",
  },
  {
    emoji: "🛍️",
    titulo: "Comércio e varejo",
    desc: "Repositor e promotor em datas de pico, tipo Black Friday e Natal.",
  },
  {
    emoji: "🧹",
    titulo: "Limpeza e conservação",
    desc: "Diaristas e equipes de zeladoria por dia ou por hora.",
  },
  {
    emoji: "💇",
    titulo: "Beleza e estética",
    desc: "Cabeleireiro, manicure e esteticista que trabalham avulso ou por comissão.",
  },
  {
    emoji: "🧱",
    titulo: "Construção e reformas",
    desc: "Pedreiro, ajudante e diarista de obra.",
  },
  {
    emoji: "🏢",
    titulo: "Escritórios e serviços em geral",
    desc: "Apoio administrativo e recepção temporária em picos de demanda.",
  },
];

const KIT_ITENS = [
  {
    emoji: "📱",
    titulo: "Tablet configurado",
    desc: "Chega pronto, com o totem de check-in já ligado na sua conta.",
  },
  {
    emoji: "🖼️",
    titulo: "Moldura personalizada",
    desc: "Acabamento profissional pro balcão, com a identidade do seu negócio.",
  },
  {
    emoji: "🛠️",
    titulo: "Suporte na largada",
    desc: "A gente te ajuda a configurar a primeira função e o primeiro pagamento.",
  },
];

export default async function Home() {
  const sessao = await getSessao();

  if (sessao?.empresaEfetivoId) redirect("/dashboard");
  if (sessao?.isMaster) redirect("/master");

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #00C896 0%, transparent 35%), radial-gradient(circle at 85% 75%, #00C896 0%, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-32 flex flex-col items-center text-center gap-6 lg:gap-8">
          <span className="lg:hidden">
            <Logo size={76} claro />
          </span>
          <span className="hidden lg:inline-block">
            <Logo size={108} claro />
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-300">
            <LogoIcon size={15} />
            Para restaurantes, bares e quem contrata extra
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white leading-[1.05]">
            Entrou. <span className="text-brand-400">Trabalhou.</span> Recebeu.
          </h1>
          <p className="text-navy-200 max-w-xl lg:max-w-2xl text-lg sm:text-xl lg:text-2xl">
            Seu extra é livre pra topar o turno que quiser — e só recebe
            pelo tempo que trabalhou de verdade. Sem planilha, sem
            desconfiança, sem dor de cabeça pra você.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mt-2">
            <Link
              href="/cadastro"
              className="rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              Cadastrar minha empresa grátis
            </Link>
            <WhatsAppButton
              mensagem={MENSAGEM_PADRAO}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors"
            >
              Falar no WhatsApp
            </WhatsAppButton>
          </div>
          <p className="text-navy-400 text-sm lg:text-base">
            Sem cartão de crédito · Configuração em minutos
          </p>
          <Link
            href="/login"
            className="text-navy-200 hover:text-white text-sm lg:text-base font-medium underline underline-offset-4 mt-1"
          >
            Já é cliente? Acessar o sistema →
          </Link>
        </div>
      </section>

      {/* Dores que resolve */}
      <section className="bg-navy-800">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-6 lg:py-8 flex flex-wrap items-center justify-center gap-x-8 lg:gap-x-10 gap-y-3">
          {DORES.map((d) => (
            <p key={d} className="flex items-center gap-2 text-navy-100 text-sm sm:text-base lg:text-lg">
              <span className="text-brand-400">✓</span> {d}
            </p>
          ))}
        </div>
      </section>

      {/* Vídeo de apresentação */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-8 lg:gap-10 items-center">
          <div className="text-center flex flex-col gap-2 lg:gap-3 items-center">
            <p className="text-brand-600 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Veja em 90 segundos
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy-900 max-w-2xl">
              Entenda o iFREE em menos de 2 minutos
            </h2>
          </div>
          <video
            className="w-full max-w-3xl rounded-2xl border border-stone-200 shadow-xl"
            src="/video/apresentacao-ifree.mp4"
            playsInline
            controls
            preload="metadata"
          >
            Seu navegador não suporta vídeo em HTML5.
          </video>
        </div>
      </section>

      {/* Liberdade pra quem trabalha */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <LogoIcon
          size={380}
          className="pointer-events-none absolute -right-16 -bottom-16 opacity-[0.1] hidden sm:block"
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-4 lg:gap-5">
            <p className="text-brand-400 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Liberdade tem hora certa
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
              Seu tempo é seu.
              <br />
              Sua hora é sua.
              <br />
              <span className="text-brand-400">Você decide quando trabalha.</span>
            </h2>
            <p className="text-navy-200 text-base lg:text-lg max-w-md">
              O iFREE não escala ninguém. Ele só garante que, quando o
              extra topar o turno, o pagamento vai bater exatamente com o
              que foi trabalhado — nem a mais, nem a menos.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:gap-5">
            {LIBERDADE_PONTOS.map((p) => (
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

      {/* Para quem é */}
      <section className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-10 lg:gap-14">
        <div className="text-center flex flex-col gap-2 lg:gap-3 items-center">
          <p className="text-brand-600 font-semibold text-sm lg:text-base tracking-wide uppercase">
            Para quem é o iFREE?
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy-900">
            Feito pro restaurante. Bom pra qualquer negócio com extra.
          </h2>
          <p className="text-stone-500 text-sm lg:text-base max-w-2xl lg:max-w-3xl mt-1">
            O iFREE nasceu no balcão de um restaurante, resolvendo a dor
            de cabeça de pagar certo o extra do fim de semana — hoje virou
            o sistema que restaurantes, bares e lanchonetes do Brasil
            inteiro usam pra parar de se preocupar com escala, planilha e
            pagamento de extra.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {SEGMENTOS.map((s) => (
            <div
              key={s.titulo}
              className={`relative rounded-2xl border p-5 lg:p-6 shadow-sm flex flex-col gap-2 ${
                s.destaque
                  ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
                  : "border-stone-200 bg-white"
              }`}
            >
              {s.destaque && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-brand-500 text-navy-900 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">
                  Onde tudo começou
                </span>
              )}
              <span className="text-2xl lg:text-3xl">{s.emoji}</span>
              <p className="font-semibold text-navy-900 text-sm lg:text-base">{s.titulo}</p>
              <p className="text-xs lg:text-sm text-stone-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-stone-500 text-sm lg:text-base">
          Não achou seu segmento?{" "}
          <a
            href={linkWhatsApp(
              "Olá! Meu negócio não é bem o que vi nos exemplos do site, mas quero entender se o iFREE serve pra mim."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 font-semibold hover:underline"
          >
            Fala com a gente no WhatsApp
          </a>
          .
        </p>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-10 lg:gap-14">
        <div className="text-center flex flex-col gap-2 lg:gap-3">
          <p className="text-brand-600 font-semibold text-sm lg:text-base tracking-wide uppercase">
            Como funciona
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy-900">
            Três passos, do início ao fim do turno
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {PASSOS.map((p) => (
            <div key={p.numero} className="flex flex-col gap-3 lg:gap-4 rounded-2xl border border-stone-200 bg-white p-6 lg:p-8 shadow-sm">
              <span className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-brand-500 text-white font-black text-lg lg:text-xl shrink-0">
                {p.numero}
              </span>
              <p className="font-bold text-navy-900 text-lg lg:text-xl">{p.titulo}</p>
              <p className="text-stone-500 text-sm lg:text-base leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-center gap-5 lg:gap-7">
          <span className="text-4xl lg:text-5xl shrink-0">📱</span>
          <div>
            <p className="font-bold text-navy-900 lg:text-lg">
              Comece sem comprar nada
            </p>
            <p className="text-stone-600 text-sm lg:text-base mt-1">
              O check-in funciona no navegador de qualquer celular da
              empresa — não precisa ser logo o tablet dedicado — então dá pra
              testar hoje mesmo com o celular que você já tem. Quando
              quiser um totem fixo com a cara do seu negócio,{" "}
              <a href="#kit" className="text-brand-700 font-semibold hover:underline">
                a gente monta o kit completo pra você
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Kit completo pro balcão */}
      <section id="kit" className="relative overflow-hidden bg-navy-900 scroll-mt-20">
        <LogoIcon
          size={380}
          className="pointer-events-none absolute -left-20 -top-20 opacity-[0.1] hidden sm:block"
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col gap-10 lg:gap-14">
          <div className="text-center flex flex-col gap-2 lg:gap-3 items-center">
            <p className="text-brand-400 font-semibold text-sm lg:text-base tracking-wide uppercase">
              Kit completo
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-2xl">
              Leve pronto pro balcão do seu restaurante
            </h2>
            <p className="text-navy-200 max-w-xl lg:max-w-2xl text-base lg:text-lg mt-1">
              Você não precisa configurar nada sozinho. A gente entrega o
              totem pronto — é só ligar na tomada e começar a bater ponto.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {KIT_ITENS.map((k) => (
              <div
                key={k.titulo}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:p-7 flex flex-col gap-2 text-center items-center"
              >
                <span className="text-3xl lg:text-4xl">{k.emoji}</span>
                <p className="font-bold text-white lg:text-lg">{k.titulo}</p>
                <p className="text-navy-200 text-sm lg:text-base leading-relaxed">{k.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <WhatsAppButton
              mensagem="Olá! Quero o kit completo do iFREE (tablet + moldura + sistema) pro meu restaurante."
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              Quero o kit completo no meu balcão
            </WhatsAppButton>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {FUNCIONALIDADES.map((f) => (
              <div
                key={f.titulo}
                className="rounded-2xl border border-stone-200 bg-white p-5 lg:p-7 shadow-sm flex gap-4 lg:gap-5 items-start"
              >
                <span className="flex h-11 w-11 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl lg:text-3xl">
                  {f.emoji}
                </span>
                <div>
                  <p className="font-semibold text-navy-900 lg:text-lg">{f.titulo}</p>
                  <p className="text-sm lg:text-base text-stone-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* iFREE Conecta */}
      <section className="relative overflow-hidden bg-navy-900">
        <LogoIcon
          size={380}
          className="pointer-events-none absolute -right-24 -bottom-24 opacity-[0.08] hidden sm:block"
        />
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-16 sm:py-24 lg:py-28 flex flex-col items-center text-center gap-6 lg:gap-8">
          <p className="text-brand-400 font-semibold text-sm lg:text-base tracking-wide uppercase">
            iFREE Conecta
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-2xl">
            Freelancers e empresas, no mesmo lugar
          </h2>
          <p className="text-navy-200 max-w-xl lg:max-w-2xl text-base lg:text-lg">
            Um cadastro só, reputação que atravessa empresas, vagas
            publicadas e um chat direto no app quando rola match. Sem
            perder um bom freelancer no WhatsApp de outra pessoa.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mt-2">
            <Link
              href="/portal/entrar"
              className="rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              🧑‍🍳 Sou freelancer
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 text-white hover:bg-white/10 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors"
            >
              🏢 Sou empresa
            </Link>
          </div>
          <Link
            href="/conecta"
            className="text-navy-300 hover:text-white text-sm lg:text-base underline underline-offset-4 mt-1"
          >
            Saiba mais sobre o Conecta →
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl w-full px-4 py-16 sm:py-24 lg:py-28">
        <div className="rounded-3xl bg-navy-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center gap-5 lg:gap-6">
          <LogoIcon size={60} className="lg:hidden" />
          <LogoIcon size={84} className="hidden lg:block" />
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight max-w-lg lg:max-w-2xl">
            Pronto pra dar liberdade ao seu extra — e controle pro seu bolso?
          </p>
          <p className="text-navy-300 max-w-md lg:max-w-lg lg:text-lg">
            Fala com a gente no WhatsApp — a gente te ajuda a configurar o
            totem e a primeira função em poucos minutos.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 mt-2">
            <WhatsAppButton
              mensagem={MENSAGEM_PADRAO}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors shadow-lg shadow-brand-500/20"
            >
              Falar no WhatsApp
            </WhatsAppButton>
            <Link
              href="/cadastro"
              className="rounded-xl border border-white/20 text-white hover:bg-white/10 text-base lg:text-lg font-bold px-7 py-4 lg:px-9 lg:py-5 transition-colors"
            >
              Cadastrar minha empresa
            </Link>
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
          <div className="flex items-center gap-5 text-sm lg:text-base text-stone-500">
            <Link
              href="/conecta"
              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800 transition-colors"
            >
              Descubra →
            </Link>
            <Link href="/portal/entrar" className="hover:text-brand-700 transition-colors">
              Já trabalhou por aqui? Acesse seu perfil
            </Link>
            <WhatsAppButton
              mensagem={MENSAGEM_PADRAO}
              className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors"
            >
              {WHATSAPP_NUMERO_FORMATADO}
            </WhatsAppButton>
            <span>© {new Date().getFullYear()} iFREE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
