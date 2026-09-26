import Link from "next/link";
import SeloAsaas from "@/components/SeloAsaas";

export const metadata = { title: "Política de Privacidade — iFREE" };

/** Política de Privacidade dedicada — pedido do Thiago em 2026-09-26,
 * depois de comparar com a de um concorrente (Freela Serviços): até aqui
 * o iFREE só tinha uma seção curta de "Privacidade e proteção de dados"
 * dentro de cada Termo (item 16/17 de [[termos/freelancer/page.tsx]] e
 * [[termos/empresa/page.tsx]]), sem documento próprio — igual pra empresa
 * e freelancer, já que a LGPD trata os dois como titulares e a maior
 * parte do tratamento (hospedagem, pagamento, e-mail) é a mesma
 * infraestrutura pros dois lados.
 *
 * IMPORTANTE: escrito com base no que o sistema REALMENTE faz hoje (não
 * copiado do concorrente) — o iFREE não tem analytics, pixel de
 * marketing, nem KYC/antifraude formal como o concorrente descreve; só
 * cookie de sessão (login) e o captcha do Cloudflare Turnstile. Os
 * prazos de guarda de dados (item 8) e o prazo de resposta a
 * solicitações (item 10) são PROPOSTAS razoáveis, não uma política que já
 * existia — o Thiago precisa confirmar se cabe operacionalmente antes de
 * tratar isso como compromisso firme. Rota pública, sem autenticação;
 * linkada a partir de /termos, /termos/empresa e /termos/freelancer (que
 * passam a apontar pra cá em vez de repetir o conteúdo). */
export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col gap-10">
        <div>
          <Link href="/termos" className="text-sm text-brand-700 hover:underline">
            ← Termos do iFREE
          </Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-2">Política de Privacidade</h1>
          <p className="text-sm text-stone-500 mt-1">
            Última atualização: setembro de 2026. Vale igualmente para quem contrata (empresa) e para quem
            presta serviço (freelancer) pelo iFREE — os Termos específicos de cada lado (
            <Link href="/termos/empresa" className="underline text-brand-700">
              empresa
            </Link>{" "}
            /{" "}
            <Link href="/termos/freelancer" className="underline text-brand-700">
              freelancer
            </Link>
            ) remetem pra este documento no que diz respeito a dados pessoais.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-1.5">
          <p className="text-sm font-medium text-navy-900">O que você precisa saber</p>
          <ul className="text-sm text-stone-700 list-disc pl-5 flex flex-col gap-1">
            <li>Coletamos só o necessário para conectar empresas e freelancers com segurança.</li>
            <li>Tratamos tudo com base na LGPD (Lei nº 13.709/2018).</li>
            <li>Não guardamos dado de cartão — o iFREE nem processa pagamento por cartão hoje, só PIX.</li>
            <li>Você pode acessar, corrigir, exportar ou pedir a exclusão dos seus dados quando quiser.</li>
            <li>Não usamos cookie de marketing, pixel de rastreamento nem vendemos dado nenhum.</li>
            <li>Em caso de incidente relevante, avisamos os titulares afetados e a ANPD, como a lei exige.</li>
          </ul>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">1. Quem somos e o que esta Política cobre</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE é o controlador dos dados pessoais tratados na Plataforma — o site, o Portal do freelancer
            (iFREE Conecta), o totem de check-in/check-out e os demais canais digitais operados por nós. Esta
            Política se aplica a empresas Contratantes (e seus representantes), freelancers cadastrados e
            visitantes que só navegam pelo site sem se cadastrar, cobrindo o tratamento relacionado a cadastro e
            autenticação, uso da Plataforma (turnos, vagas, mensagens, avaliações), pagamento via PIX, e suporte.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">2. Definições essenciais</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            <strong>Dado pessoal</strong> é qualquer informação que identifica ou pode identificar você.{" "}
            <strong>Dado sensível</strong> é uma categoria especial (ex.: saúde) que exige cuidado redobrado — no
            iFREE, isso aparece só na resposta opcional sobre necessidade especial (PCD) no cadastro do
            freelancer. <strong>Tratamento</strong> é qualquer operação com dado pessoal (coletar, usar,
            compartilhar, excluir). <strong>Controlador</strong> é quem decide a finalidade do tratamento (o
            iFREE); <strong>operador</strong> é quem trata dado em nome do controlador, seguindo instruções dele
            (ex.: a Asaas, processando o PIX). <strong>Titular</strong> é você, a pessoa a quem os dados se
            referem.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">3. Quem trata seus dados junto com o iFREE</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Diferente de plataformas maiores, o iFREE trabalha com um número pequeno e específico de operadores —
            cada um contratado pra uma função clara, nunca pra fins de publicidade:
          </p>
          <ul className="text-sm text-stone-700 list-disc pl-5 flex flex-col gap-1">
            <li>
              <strong>Asaas Gestão Financeira S.A.</strong> — processa o PIX automático, quando a empresa ativa
              essa opção. Instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil.
            </li>
            <li>
              <strong>Vercel</strong> e <strong>Prisma Postgres</strong> — hospedagem da aplicação, do banco de
              dados e do armazenamento privado de fotos e assinaturas digitais.
            </li>
            <li>
              <strong>Resend</strong> — envio dos e-mails transacionais (confirmação de cadastro, recuperação de
              senha, avisos de vaga).
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong> — verificação de que quem preenche um formulário público
              (cadastro, recuperação de senha) é uma pessoa de verdade, não um robô.
            </li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed">
            Não usamos ferramenta de analytics, pixel de rede social, CRM de marketing ou qualquer serviço de
            publicidade — se isso mudar um dia, esta Política será atualizada antes.
          </p>
          <SeloAsaas porte="pequeno" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">4. Quais dados coletamos</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            <strong>Dados que você mesmo informa:</strong> nome, CPF ou CNPJ, telefone, e-mail, endereço, data de
            nascimento e RG (quando aplicável), chave PIX, e — no caso do freelancer — foto de perfil, biografia,
            habilidades, vagas desejadas, gênero e resposta sobre necessidade especial (PCD), estes dois últimos
            sempre opcionais.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            <strong>Dados gerados pelo uso da Plataforma:</strong> foto e assinatura digital capturadas no
            check-in/check-out de cada turno, histórico de turnos e pontos registrados, mensagens trocadas entre
            empresa e freelancer, avaliações recebidas e dadas, e o contrato/recibo gerado a cada turno.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            <strong>Dados de pagamento:</strong> quando o PIX automático está ativo, o valor e o status de cada
            cobrança ficam registrados — o iFREE nunca vê nem guarda número de cartão (não processamos pagamento
            por cartão), nem tem acesso ao saldo ou extrato da conta de pagamento da empresa na Asaas além do que
            é necessário para mostrar o histórico dentro do próprio painel.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">5. Para que usamos seus dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            <strong>Execução do contrato</strong> — criar sua conta, registrar turnos, gerar contrato/recibo,
            processar o pagamento, mostrar vagas e candidatos, viabilizar o chat. <strong>Obrigação legal</strong>{" "}
            — manter comprovante fiscal e de pagamento pelo prazo exigido por lei.{" "}
            <strong>Legítimo interesse</strong> — segurança da conta, prevenção a fraude básica (ex.: um cadastro
            por CPF/CNPJ), melhoria da Plataforma. <strong>Consentimento</strong> — hoje não enviamos nenhuma
            comunicação de marketing; se isso um dia existir, será opt-in, com opção de recusar.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">6. Cookies e tecnologias semelhantes</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE usa só cookies essenciais — o token de sessão que mantém você logado(a) depois de entrar. Não
            usamos cookie de analytics, de rede social ou de publicidade, nem qualquer tecnologia de rastreamento
            entre sites. O único serviço de terceiro que roda no navegador é o Cloudflare Turnstile (item 3),
            usado somente nas telas de cadastro e recuperação de senha, pra distinguir pessoa de robô.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">7. Compartilhamento e transferência internacional</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Só compartilhamos dado pessoal com os operadores do item 3 (cada um só recebe o que precisa pra
            exercer sua função específica) e com autoridades, quando exigido por lei ou ordem judicial. Nunca
            vendemos ou alugamos dado pessoal de ninguém. Como a hospedagem (Vercel) e o banco de dados (Prisma
            Postgres) operam em infraestrutura global, seus dados podem ser processados em servidores fora do
            Brasil — nesses casos, exigimos padrão de segurança equivalente ao da LGPD.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">8. Por quanto tempo guardamos seus dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Dados de turnos, contratos e recibos ficam guardados pelo prazo de prescrição/fiscal aplicável — em
            regra, até 5 (cinco) anos, acompanhando a obrigação de guarda de documento fiscal e trabalhista.
            Mensagens e avaliações permanecem enquanto a conta estiver ativa, já que fazem parte do seu histórico
            de reputação na Plataforma. Se você pedir a exclusão da conta, removemos os dados que não precisamos
            manter por obrigação legal (ver item 10) em até 30 dias.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">9. Como protegemos seus dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Toda comunicação com a Plataforma é criptografada (HTTPS/TLS). Fotos e assinaturas digitais ficam num
            armazenamento privado, nunca públicas por link direto. O acesso ao painel é protegido por sessão
            autenticada com expiração, e cada empresa só enxerga os dados dos freelancers que já trabalharam ou
            se candidataram nela. Nenhum sistema é 100% inviolável — em caso de incidente relevante, seguimos o
            item 13 abaixo.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">10. Seus direitos como titular de dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Nos termos da LGPD, você pode pedir, a qualquer momento e pelo WhatsApp do iFREE:{" "}
            <strong>acesso</strong> aos dados que temos sobre você, <strong>correção</strong> de dado incorreto ou
            desatualizado, <strong>exclusão</strong> dos seus dados (ressalvado o que precisamos manter por
            obrigação legal, ver item 8), <strong>portabilidade</strong> dos seus dados em formato estruturado, e{" "}
            <strong>revisão humana</strong> de uma decisão automatizada que te afete (ver item 11). Respondemos
            toda solicitação em até 15 (quinze) dias úteis.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">11. Decisões automatizadas</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE usa regras automatizadas — não inteligência artificial — em dois pontos: o{" "}
            <strong>cálculo de match</strong> entre o perfil do freelancer e as habilidades procuradas numa vaga
            (com base em quantas habilidades em comum os dois têm), e a <strong>ordenação por reputação</strong>{" "}
            nas listas de freelancers/vagas. Nenhuma das duas decide sozinha se você é contratado(a) ou não — só
            organiza o que aparece pra cada lado ver primeiro. Você pode pedir revisão humana de qualquer efeito
            que considere indevido, pelo WhatsApp do iFREE.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">12. Prevenção a uso indevido</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Adotamos medidas simples e diretas pra reduzir fraude: um cadastro só por CPF/CNPJ, sessão de acesso
            com expiração, e revisão manual quando uma denúncia ou comportamento suspeito é reportado. O iFREE não
            realiza consulta automática a bases de crédito ou antecedentes — qualquer verificação de identidade
            mais formal, quando existir, será descrita aqui antes de entrar em uso.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">13. Incidentes de segurança</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Caso ocorra um incidente de segurança que possa gerar risco ou dano relevante aos titulares,
            notificaremos as pessoas afetadas e a Autoridade Nacional de Proteção de Dados (ANPD), conforme exige
            a LGPD, informando o que aconteceu, quais dados foram envolvidos e quais medidas estamos tomando.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">14. Alterações desta Política</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Podemos atualizar esta Política a qualquer momento para refletir mudanças na Plataforma ou na
            legislação aplicável — a data no topo desta página indica a última atualização. Mudanças relevantes
            serão avisadas pelo WhatsApp ou pelo próprio painel antes de valerem.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">15. Lei aplicável, foro e contato</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Esta Política é regida pela legislação brasileira, em especial a LGPD (Lei nº 13.709/2018). Dúvidas
            sobre privacidade ou para exercer os direitos do item 10? Fale com a gente pelo WhatsApp disponível no
            rodapé da página inicial.
          </p>
        </section>

        <p className="text-xs text-stone-400 border-t border-stone-200 pt-4">
          Este é um texto padrão em revisão contínua e não substitui aconselhamento jurídico formal.
        </p>
      </div>
    </div>
  );
}
