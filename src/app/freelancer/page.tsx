import type { Metadata } from "next";
import Link from "next/link";
import { Logo, LogoIcon } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Como funciona pra você, freelancer — iFREE Conecta",
  description:
    "Guia completo do iFREE Conecta pra freelancer: como se candidatar a vagas, falar com empresas, confirmar um Free marcado, bater o ponto no totem e receber pelo PIX — passo a passo, com telas reais.",
};

type Passo = {
  numero: string;
  titulo: string;
  texto: string;
  imagem?: string;
  imagemAlt?: string;
};

const PASSOS: Passo[] = [
  {
    numero: "1",
    titulo: "Seu perfil vale em qualquer empresa do iFREE",
    texto:
      "Você faz o cadastro uma vez só — nome, telefone, chave PIX, foto, bio e as habilidades que você tem. Esse mesmo perfil é o que qualquer empresa vai ver, não importa onde você trabalhe. O interruptor verde \"Disponível para novas oportunidades\" é o que decide se as empresas conseguem te encontrar: ligado, você aparece nas buscas e recebe convites; desligado, você some das buscas (continua podendo ver e usar tudo, só não aparece pra quem está procurando).",
    imagem: "/ajuda-freelancer/perfil-inicio.png",
    imagemAlt: "Tela inicial do Portal mostrando perfil, Free marcado aguardando confirmação e o interruptor de disponibilidade",
  },
  {
    numero: "2",
    titulo: "Encontre vagas e candidate-se com um toque",
    texto:
      "Em \"Vagas\" você vê os anúncios publicados por empresas — função, valor por hora, turno e endereço, com o tempo estimado até lá. Achou uma que te interessa? É só clicar em \"Quero trabalhar\". Não tem formulário nem currículo pra preencher de novo: a empresa já vê seu perfil e sua reputação na hora.",
    imagem: "/ajuda-freelancer/candidatar-se.png",
    imagemAlt: "Card de uma vaga com botão \"Quero trabalhar\"",
  },
  {
    numero: "3",
    titulo: "Às vezes é a empresa que chama você primeiro",
    texto:
      "Se seu perfil combina com uma vaga, a empresa pode te mandar um convite direto — aparece em \"Convites pra você\", separado do quadro geral. Isso não é a empresa te chamando pra já ir trabalhar: é só um sinal de que ela tem interesse. Quem decide se dá o próximo passo é você, clicando em \"Chamar a empresa pra conversar\".",
    imagem: "/ajuda-freelancer/convites-frees-marcados.png",
    imagemAlt: "Seção de convites de empresas e card de Free marcado aguardando confirmação",
  },
  {
    numero: "4",
    titulo: "Quando combina dos dois lados, abre uma conversa",
    texto:
      "Candidatura aceita ou convite respondido: se o seu perfil combina de verdade com o que a empresa procura, um chat abre automaticamente entre vocês dois. É ali que vocês combinam dia, horário e qualquer detalhe — sem precisar trocar número de telefone com quem você ainda não conhece.",
    imagem: "/ajuda-freelancer/conversa.png",
    imagemAlt: "Janela de conversa entre a freelancer e a empresa combinando o turno",
  },
  {
    numero: "5",
    titulo: "Confirme o Free marcado — isso é um combinado de verdade",
    texto:
      "Quando vocês combinam um dia e turno específico, ele aparece pra você como \"Free marcado\", esperando sua confirmação. Antes de confirmar, dá uma olhada: se aquela empresa já desmarcou muitas vezes, você vê isso ali mesmo. Depois de confirmar, é um compromisso — se você não aparecer, conta como falta e pesa na sua reputação com todas as empresas, não só com essa. Mudou de ideia? Dá pra desmarcar, mas isso também fica registrado.",
    imagem: "/ajuda-freelancer/convites-frees-marcados.png",
    imagemAlt: "Card de Free marcado com os botões Confirmar e Não vou poder ir",
  },
  {
    numero: "6",
    titulo: "No dia, bata seu CPF no totem da empresa",
    texto:
      "Chegou o dia combinado: no local, tem um tablet fixo (o totem) com a tela do iFREE. Você digita seu CPF, tira uma foto rápida e assina o contrato daquele turno na tela — tudo em menos de um minuto. Isso registra sua entrada de verdade, com hora certa. Na saída, você repete o processo: mais uma foto e assinatura, e o sistema já calcula sozinho quantas horas você trabalhou.",
    imagem: "/ajuda-freelancer/totem-cpf.png",
    imagemAlt: "Tela do totem pedindo CPF ou CNPJ pra iniciar o check-in",
  },
  {
    numero: "7",
    titulo: "O PIX cai assim que você bate a saída",
    texto:
      "Sem esperar fim de semana, sem esperar o \"fechamento do mês\": o valor é calculado na hora (horas trabalhadas × valor combinado, ou a diária fixa, dependendo do combinado com a empresa) e o PIX é disparado pra chave que você já tem cadastrada no perfil. Você recebe um recibo assinado digitalmente também.",
    imagem: "/ajuda-freelancer/turnos-pagos.png",
    imagemAlt: "Histórico de turnos mostrando um turno com status Pago",
  },
  {
    numero: "8",
    titulo: "Sua reputação viaja com você",
    texto:
      "Depois de cada turno, a empresa pode te avaliar — nota de 1 a 5 e selos tipo \"Pontual\", \"Simpática\", \"Rápida no atendimento\". Essa nota e esses selos aparecem no seu perfil pra QUALQUER empresa que olhar depois, junto com quantas vezes você faltou ou desmarcou um Free já confirmado. É o que substitui o currículo: quem trabalha direito, constrói uma reputação que abre mais oportunidades.",
    imagem: "/ajuda-freelancer/reputacao.png",
    imagemAlt: "Card de reputação com nota 5.0 e selos recebidos",
  },
  {
    numero: "9",
    titulo: "Acompanhe tudo que você já se candidatou",
    texto:
      "Em \"Minhas candidaturas\" fica o histórico de cada vaga que você se candidatou, com o status atualizado: aguardando resposta, aceita ou não foi dessa vez. Se já tiver dado match, o link \"Conversar\" leva direto pro chat com aquela empresa.",
    imagem: "/ajuda-freelancer/minhas-candidaturas.png",
    imagemAlt: "Lista de candidaturas enviadas com o status de cada uma",
  },
];

type Pergunta = { pergunta: string; resposta: string };

const FAQ: Pergunta[] = [
  {
    pergunta: "Usar o iFREE Conecta custa alguma coisa pra mim?",
    resposta: "Não. É grátis pro freelancer, sempre. Quem paga pra usar o sistema é a empresa.",
  },
  {
    pergunta: "Eu viro funcionário (CLT) de alguma empresa?",
    resposta:
      "Não. Você continua trabalhando como autônomo/freelancer, turno por turno, sem vínculo empregatício com nenhuma empresa. Você decide se topa cada turno.",
  },
  {
    pergunta: "Preciso ficar disponível o tempo todo?",
    resposta:
      "Não. Você liga e desliga o interruptor \"Disponível para novas oportunidades\" quando quiser — desligado, ninguém te encontra pra convite ou vaga nova.",
  },
  {
    pergunta: "Meu cadastro serve só pra uma empresa?",
    resposta:
      "Não, é global: o mesmo perfil, currículo e reputação valem em qualquer empresa que usa o iFREE — você não recadastra nada quando muda de lugar.",
  },
  {
    pergunta: "O que acontece se eu confirmar um Free e não aparecer?",
    resposta:
      "Conta como falta, e falta pesa na sua reputação — toda empresa que olhar seu perfil depois vê isso. Se não vai poder ir, desmarque com antecedência: ainda fica registrado, mas é bem diferente de simplesmente não aparecer.",
  },
  {
    pergunta: "E se a empresa que combinou comigo desmarcar?",
    resposta:
      "Isso também fica registrado — sua tela mostra quantas vezes aquela empresa específica já desmarcou antes, pra você decidir com informação se quer confirmar um Free novo com ela.",
  },
  {
    pergunta: "Como e quando eu recebo o pagamento?",
    resposta: "Direto no PIX, na sua chave cadastrada, assim que você bate a saída no totem ao final do turno.",
  },
  {
    pergunta: "Posso pausar ou excluir minha conta?",
    resposta:
      "Sim, os dois — direto na sua tela inicial do Portal. Pausar é reversível (você some das buscas até reativar); excluir é definitivo pelo Portal, mas seu histórico de turnos e pagamentos continua guardado.",
  },
];

export default function ComoFuncionaFreelancerPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
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
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:py-20 flex flex-col items-center text-center gap-5">
          <Logo size={56} claro />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-300">
            <LogoIcon size={15} />
            Guia completo pra quem trabalha
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Como funciona o iFREE Conecta pra você
          </h1>
          <p className="text-navy-200 max-w-xl text-base sm:text-lg">
            Um passo a passo com as telas de verdade — sem termo técnico, sem letra miúda. No fim
            desta página você sabe exatamente pra que serve, pra quem é, e como usar cada parte.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <Link
              href="/portal/entrar"
              className="rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base font-bold px-6 py-3.5 transition-colors shadow-lg shadow-brand-500/20"
            >
              🧑‍🍳 Entrar ou me cadastrar →
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-base font-bold px-6 py-3.5 transition-colors"
            >
              Ver o passo a passo ↓
            </a>
          </div>
        </div>
      </section>

      {/* Pra quem é / o que é */}
      <section className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-14 flex flex-col gap-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">
            Pra que serve o iFREE Conecta?
          </h2>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            É a parte do iFREE feita pra quem faz trabalho avulso — freelancer, diarista, extra,
            autônomo — sem vínculo empregatício com ninguém. Um cadastro só te conecta com{" "}
            <strong>qualquer empresa</strong> que usa o iFREE: você vê as vagas publicadas,
            conversa direto com quem está contratando, combina o turno, bate o ponto no dia certo
            e recebe o pagamento no PIX assim que termina.
          </p>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            Pra quem é: pra você que já faz (ou quer começar a fazer) bico/freela em restaurante,
            bar, evento, comércio, limpeza, obra ou qualquer trabalho que se organiza por turno.
            Você escolhe quando quer trabalhar — o iFREE não te escala, só garante que o combinado
            aconteça e que o pagamento saia certo.
          </p>
        </div>
      </section>

      {/* Passo a passo */}
      <section id="como-funciona" className="scroll-mt-6 bg-stone-50">
        <div className="mx-auto max-w-3xl px-4 py-14 flex flex-col gap-3">
          <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase text-center">
            Passo a passo
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900 text-center mb-8">
            Do cadastro ao dinheiro na conta
          </h2>

          <div className="flex flex-col gap-14">
            {PASSOS.map((p) => (
              <div key={p.numero} className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white font-black text-base">
                    {p.numero}
                  </span>
                  <div className="flex flex-col gap-2 pt-1">
                    <h3 className="text-lg sm:text-xl font-bold text-navy-900">{p.titulo}</h3>
                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">{p.texto}</p>
                  </div>
                </div>
                {p.imagem && (
                  <div className="ml-0 sm:ml-13 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagem}
                      alt={p.imagemAlt}
                      className="w-full max-w-[280px] rounded-2xl border border-stone-200 shadow-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-14 flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <p className="text-brand-600 font-semibold text-sm tracking-wide uppercase">
              Dúvidas comuns
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">
              Ainda ficou alguma pergunta?
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details
                key={f.pergunta}
                className="group rounded-2xl border border-stone-200 bg-white p-5 open:shadow-sm"
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-bold text-navy-900 text-sm sm:text-base">
                  {f.pergunta}
                  <span className="text-brand-600 shrink-0 group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed mt-3">
                  {f.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-3xl w-full px-4 py-14">
        <div className="rounded-3xl bg-navy-900 text-white p-8 sm:p-12 flex flex-col items-center text-center gap-5">
          <LogoIcon size={56} />
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight max-w-md">
            Seu cadastro é grátis e vale em qualquer empresa do iFREE.
          </p>
          <Link
            href="/portal/entrar"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-navy-900 text-base font-bold px-7 py-4 transition-colors shadow-lg shadow-brand-500/20"
          >
            🧑‍🍳 Entrar ou me cadastrar →
          </Link>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={24} />
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-stone-500">
            <Link href="/" className="hover:text-brand-700 transition-colors">
              iFREE
            </Link>
            <Link href="/termos/freelancer" className="hover:text-brand-700 transition-colors">
              Termos de Uso
            </Link>
            <span>© {new Date().getFullYear()} iFREE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
