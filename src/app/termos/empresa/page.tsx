import Link from "next/link";
import SeloAsaas from "@/components/SeloAsaas";

export const metadata = { title: "Termos de Uso — Empresas — iFREE" };

/** Termos de Uso + Política de Privacidade voltados à empresa Contratante —
 * metade da separação pedida pelo Thiago (ver [[termos/freelancer/page.tsx]]
 * pra outra metade). Texto ainda não revisado por advogado (mesmo aviso já
 * usado nos outros termos do produto). Reescrito depois de comparar com o
 * termo de um concorrente direto (Closeer) — cada cláusula nova aqui (teto
 * de responsabilidade no item 10, aviso de 30 dias pra descontinuação no
 * item 13, hierarquia de documentos no item 16) reflete algo que faz
 * sentido pro iFREE de verdade, não cópia. De propósito, o iFREE Conecta
 * (item 4) é tratado como módulo complementar, não como o produto
 * principal — o núcleo do iFREE hoje é o controle de turno e a
 * automatização do pagamento por hora, não a intermediação/descoberta de
 * freelancers (isso é mais o foco de um concorrente como a Closeer). Rota
 * pública, sem autenticação; linkada a partir do checkbox de aceite em
 * NovaEmpresaForm.tsx e do índice em /termos. */
export default function TermosEmpresaPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col gap-10">
        <div>
          <Link href="/termos" className="text-sm text-brand-700 hover:underline">
            ← Termos do iFREE
          </Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-2">
            Termos de Uso e Política de Privacidade — Empresas
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Última atualização: setembro de 2026. Documento voltado à empresa Contratante — se você é
            freelancer, veja os{" "}
            <Link href="/termos/freelancer" className="underline text-brand-700">
              Termos de Uso para Freelancers
            </Link>
            .
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">1. Objeto</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE é uma plataforma de tecnologia que ajuda a empresa Contratante a organizar a escala de
            trabalho com freelancers (&ldquo;extras&rdquo;), registrar entrada e saída de cada turno, calcular o
            valor devido e automatizar o pagamento correspondente. O núcleo do produto é o controle de turno e o
            pagamento por hora — a intermediação e a descoberta de novos freelancers (item 4, iFREE Conecta) é um
            recurso complementar, não um pré-requisito para usar a plataforma.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE atua exclusivamente como intermediário tecnológico. Não é parte da relação de trabalho entre
            a empresa e o freelancer, não é empregador de ninguém, não define condições de trabalho, valores
            praticados ou escalas, e não garante a existência de turnos, oportunidades ou renda a nenhum
            freelancer. A Contratante é a única responsável pelas informações sobre suas atividades
            disponibilizadas na plataforma e pela condução da prestação de serviço em seu estabelecimento.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">2. Como funciona o registro do turno (totem)</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O registro de entrada e saída de cada turno é feito pelo &ldquo;totem&rdquo; do iFREE — uma página
            web acessada por um link exclusivo da empresa, com foto e assinatura digital do freelancer no início
            e no fim do serviço. Esse totem não exige nenhum equipamento proprietário: a empresa pode deixar um
            tablet ou celular fixo instalado no local de trabalho para uso compartilhado por toda a equipe, ou
            simplesmente usar o próprio celular sempre que precisar, sem custo adicional de hardware. A escolha
            entre as duas formas é livre e pode mudar a qualquer momento, sem afetar o funcionamento do restante
            da plataforma.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            A cada turno registrado, é gerado automaticamente um contrato de prestação de serviço eventual e, ao
            final, um recibo de pagamento — ambos assinados digitalmente pelo freelancer no próprio totem, no
            momento da entrada e da saída, respectivamente. O acesso de cada empresa à plataforma é feito por
            login pessoal e intransferível, sendo a empresa responsável por tudo o que ocorrer por meio das
            contas vinculadas a ela (inclusive de logins secundários criados em Equipe).
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">3. Cadastro</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O cadastro da empresa exige CNPJ regularmente registrado nos órgãos competentes. É admitido apenas
            um cadastro por CNPJ na plataforma. A empresa é responsável pela veracidade dos dados informados no
            cadastro e pela atualização deles sempre que mudarem — cadastros com informações falsas, ou contas
            usadas de forma fraudulenta ou em desacordo com estes Termos, podem ser suspensos ou encerrados pelo
            iFREE.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">4. iFREE Conecta (módulo complementar)</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O <strong>iFREE Conecta</strong> é um módulo complementar da plataforma que permite à empresa
            divulgar vagas abertas e descobrir freelancers com base no histórico de avaliações recebidas em
            outras empresas que usam o iFREE. É um recurso opcional — usar apenas o controle de turno e
            pagamento, sem nunca abrir uma vaga pelo Conecta, é uma forma normal e completa de usar o iFREE.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            As avaliações trocadas entre empresa e freelancer no iFREE Conecta são recíprocas e não podem ser
            removidas a pedido de uma das partes, salvo em caso de erro comprovado.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">5. Eventualidade da prestação de serviço</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Os serviços intermediados pelo iFREE têm natureza eventual e autônoma, sem subordinação,
            exclusividade ou horário fixo obrigatório — características essenciais para que a relação não seja
            considerada vínculo empregatício perante a legislação trabalhista brasileira. É responsabilidade da
            empresa Contratante zelar por essa eventualidade na prática, evitando a contratação recorrente e
            habitual do mesmo freelancer em padrão que se assemelhe a uma jornada de trabalho fixa — o uso
            recorrente e a subordinação de fato podem gerar risco de reconhecimento de vínculo empregatício, com
            responsabilidade trabalhista e previdenciária integral da empresa Contratante, sem que o iFREE
            responda por isso. O iFREE recomenda que cada empresa avalie com seu próprio departamento jurídico ou
            contábil os limites de recorrência adequados ao seu caso.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">6. Responsabilidades da empresa Contratante</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Cabe à empresa Contratante oferecer um ambiente de trabalho seguro, fornecer as informações corretas
            sobre a vaga e o valor/hora antes do início do turno, e tratar cada freelancer com respeito, sem
            discriminação de gênero, orientação sexual, idade, aparência, etnia, religião ou convicção política.
            A empresa é responsável por verificar a qualificação do freelancer antes de firmar um turno e por
            qualquer divergência sobre a qualidade do serviço prestado, diretamente com o freelancer envolvido.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">7. Pagamento</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Quando a empresa ativa o pagamento automático via PIX dentro da plataforma, esse dinheiro nunca passa
            pelo iFREE: a transferência é executada diretamente pela <strong>Asaas Gestão Financeira S.A.</strong>,
            instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil, a partir de uma conta
            digital de titularidade da própria empresa Contratante, previamente carregada por ela via PIX. O
            iFREE atua apenas como plataforma de tecnologia que intermedeia essa integração — em nenhum momento
            temos acesso, custódia ou controle sobre esse dinheiro, e não retemos comissão fixa sobre cada
            transação.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Empresas que optam por pagar manualmente (fora da automação) seguem o meio de pagamento que
            escolherem, sem nenhuma instituição de pagamento envolvida por parte do iFREE.
          </p>
          <SeloAsaas />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">8. Planos, mensalidade e taxas</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O uso do iFREE pela empresa Contratante está sujeito a uma assinatura mensal cujo valor é{" "}
            <strong>acordado individualmente com cada cliente</strong> — não existe uma tabela pública única de
            preços, e o valor pode variar de empresa para empresa conforme porte, volume de uso ou condição
            comercial negociada. O mesmo vale, quando aplicável, para eventual percentual retido pelo iFREE sobre
            os depósitos feitos pela própria empresa em sua conta de pagamento (item 7 acima), que também é
            definido individualmente e pode ser zero para parte dos clientes. O valor e as condições vigentes
            para cada empresa ficam sempre visíveis dentro do próprio painel do iFREE, na área de Assinatura.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">9. Propriedade intelectual</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            A marca iFREE, o software, o layout, os textos e demais elementos da plataforma são de propriedade do
            iFREE ou de seus licenciantes, sendo vedada a reprodução, engenharia reversa ou uso fora do que é
            necessário para a utilização normal do serviço.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">10. Limitação de responsabilidade</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE se esforça para manter a plataforma disponível e funcionando corretamente, mas não garante
            operação ininterrupta ou livre de falhas, nem se responsabiliza por prejuízos decorrentes de
            problemas de conexão ou equipamento do próprio Usuário. O iFREE não se responsabiliza por conflitos,
            danos ou prejuízos decorrentes da relação entre a empresa e os freelancers, nem pela qualidade do
            serviço prestado por um freelancer — essa responsabilidade é exclusiva de quem contrata e de quem
            presta o serviço, entre si.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Sem prejuízo do disposto acima, a responsabilidade total do iFREE perante a empresa Contratante, por
            qualquer reclamação relacionada ao uso da plataforma, fica limitada ao valor efetivamente pago pela
            empresa ao iFREE a título de assinatura nos 12 (doze) meses anteriores ao fato que originou a
            reclamação.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">11. Confidencialidade</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Informações técnicas, administrativas ou comerciais às quais a empresa tenha acesso em razão do uso
            da plataforma — inclusive dados de freelancers ou de outras empresas — devem ser tratadas como
            confidenciais e usadas apenas para os fins da prestação do serviço em questão, sem prejuízo das
            demais medidas cabíveis em caso de uso indevido.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">12. Compartilhamento de dados com terceiros</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE não vende nem aluga dados pessoais dos Usuários. Compartilhamos informações apenas quando
            necessário para: (a) viabilizar o pagamento via PIX, com a Asaas Gestão Financeira S.A.; (b) operar a
            infraestrutura técnica da plataforma, com provedores de hospedagem e serviços de nuvem; e (c) cumprir
            obrigações legais ou ordens de autoridades competentes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">
            13. Interrupções, alterações e descontinuação da plataforma
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O acesso à plataforma pode ser interrompido, suspenso ou ficar temporariamente indisponível, sem
            aviso prévio, em razão de manutenção, falhas técnicas ou fatores fora do controle do iFREE. O iFREE
            pode alterar ou suspender funcionalidades específicas da plataforma a qualquer momento, buscando
            sempre comunicar mudanças relevantes às empresas com antecedência razoável quando possível.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Caso o iFREE decida descontinuar definitivamente a plataforma (encerrar o serviço por completo, não
            apenas uma funcionalidade específica), avisará todas as empresas Contratantes com no mínimo{" "}
            <strong>30 (trinta) dias de antecedência</strong>, por e-mail ou pelo próprio painel, para que possam
            exportar seus dados e se organizar para a transição. Esse aviso prévio não se aplica às interrupções
            temporárias tratadas no parágrafo anterior.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">14. Suspensão e encerramento</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            A empresa pode encerrar sua conta a qualquer momento entrando em contato pelo WhatsApp do iFREE. O
            iFREE pode suspender ou encerrar o acesso de uma conta em caso de descumprimento destes Termos, uso
            fraudulento da plataforma, ou por determinação legal ou de autoridade competente. Estes Termos
            vigoram, para cada empresa, desde o primeiro acesso à plataforma até a desativação do respectivo
            cadastro.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">15. Privacidade e proteção de dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Tratamos os dados pessoais necessários para operar a plataforma (nome, CPF/CNPJ, telefone, endereço,
            chave PIX, foto e assinatura digital, entre outros) com base na execução do contrato entre a empresa
            e os freelancers que atuam nela, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº
            13.709/2018). Qualquer pessoa pode solicitar acesso, correção ou exclusão dos próprios dados a
            qualquer momento, pelo WhatsApp do iFREE, ressalvado o que precisar ser mantido por obrigação legal
            (ex.: comprovantes de pagamento).
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">16. Disposições gerais</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Este documento representa a vontade final das partes quanto ao uso da plataforma. Em caso de conflito
            entre este documento e o contrato de um turno específico gerado na plataforma, prevalece o contrato
            daquele turno quanto às condições daquele serviço em particular; para todos os demais aspectos do uso
            da plataforma, prevalece este Termo. Caso qualquer disposição seja considerada inválida ou
            inexequível, as demais permanecem em pleno vigor. Estes Termos podem ser atualizados a qualquer
            momento para refletir mudanças na plataforma ou na legislação aplicável — a data no topo desta página
            indica a última atualização, e o uso continuado do iFREE após uma alteração publicada implica
            concordância com o novo texto.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">17. Legislação aplicável e foro</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Estes Termos são regidos pelas leis brasileiras. Eventuais controvérsias serão submetidas ao foro do
            domicílio da empresa Contratante, salvo disposição legal em contrário, priorizando sempre que
            possível a resolução por conciliação ou mediação.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">18. Contato</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Dúvidas sobre estes termos ou sobre seus dados? Fale com a gente pelo WhatsApp disponível no rodapé
            da página inicial.
          </p>
        </section>

        <p className="text-xs text-stone-400 border-t border-stone-200 pt-4">
          Este é um texto padrão em revisão contínua e não substitui aconselhamento jurídico formal.
        </p>
      </div>
    </div>
  );
}
