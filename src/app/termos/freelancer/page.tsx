import Link from "next/link";
import SeloAsaas from "@/components/SeloAsaas";

export const metadata = { title: "Termos de Uso — Freelancers — iFREE" };

/** Termos de Uso + Política de Privacidade voltados ao freelancer/"extra" —
 * outra metade da separação (ver [[termos/empresa/page.tsx]]). Texto ainda
 * não revisado por advogado. Versão completa e estilizada do que antes era
 * só o resumo curto de TERMOS_PORTAL_PARAGRAFOS (src/lib/termos-portal.ts,
 * que continua existindo como resumo pro aceite dentro do Portal, agora
 * linkando pra cá). Cláusulas novas depois de comparar com um concorrente
 * direto (Closeer): repúdio à discriminação + proteção contra revista
 * íntima (item 8, aproveitando a Central de Ética que o iFREE já tem — algo
 * que o concorrente não tem, só um e-mail de contato), aviso de 30 dias
 * pra descontinuação (item 15, espelhando o mesmo compromisso do lado da
 * empresa), responsabilidade tributária/sem repasse de turno (item 6/7),
 * propriedade intelectual da plataforma (item 10), fraude + garantia de
 * receber por turno já trabalhado (item 12) e não-renúncia (item 16).
 * Item 7 também cobre acidente de trabalho (sem vínculo empregatício, não
 * há os mecanismos de proteção que uma CLT teria — pedido explícito do
 * Thiago, junto da responsabilidade tributária/previdenciária). Item 11
 * tem uma versão ENXUTA da cessão de imagem da Closeer: diferente do
 * concorrente (cessão universal/perpétua/gratuita pra qualquer uso de
 * marketing), aqui só cobre aparição INCIDENTAL em conteúdo institucional
 * com dados reais de uso (não é o foco do conteúdo, mesma lógica de
 * alguém aparecer na cobertura de um evento transmitido), com direito de
 * pedir remoção — uso deliberado em destaque continua exigindo
 * consentimento específico. De propósito NÃO inclui: multa fixa de
 * confidencialidade, bloqueio automático por nota baixa (sem sistema de
 * "strikes"), nem responsabilidade por aparelho/conexão próprios no totem
 * — diferente do concorrente, o freelancer NUNCA usa o próprio celular
 * pra bater o ponto aqui, só tablet ou celular da própria empresa
 * Contratante (ver item 3).
 *
 * Duas clausulas novas depois de comparar com outro concorrente (Freela
 * Servicos, 2026-09-26): item 4 (check-in/check-out como prova da
 * execucao - o concorrente tem um capitulo inteiro so sobre isso, e faz
 * sentido pro iFREE formalizar ja que o totem e o coracao do produto) e
 * item 9 (uso continuado da plataforma pras proximas contratacoes, ideia
 * de "anti-desintermediacao" do concorrente - aqui em tom mais leve pro
 * freelancer, sem ameaca de suspensao: diferente da empresa, ele nao paga
 * nada pro iFREE, entao nao tem o mesmo incentivo de burlar a plataforma;
 * a versao com consequencia de verdade fica do lado da empresa, ver
 * [[termos/empresa/page.tsx]] item 7). Rota pública,
 * sem autenticação; linkada a partir de /portal/termos e do índice em
 * /termos. */
export default function TermosFreelancerPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col gap-10">
        <div>
          <Link href="/termos" className="text-sm text-brand-700 hover:underline">
            ← Termos do iFREE
          </Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-2">
            Termos de Uso e Política de Privacidade — Freelancers
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Última atualização: setembro de 2026. Documento voltado a quem presta serviço como freelancer
            (&ldquo;extra&rdquo;) — se você é uma empresa, veja os{" "}
            <Link href="/termos/empresa" className="underline text-brand-700">
              Termos de Uso para Empresas
            </Link>
            .
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">1. Objeto</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE é uma plataforma de tecnologia que conecta você, freelancer (&ldquo;extra&rdquo;), a empresas
            que precisam de mão de obra eventual, organizando o registro de entrada e saída de cada turno e o
            pagamento correspondente. O iFREE atua exclusivamente como intermediário tecnológico: não é parte da
            relação de trabalho entre você e as empresas onde atua, não é seu empregador, não define suas
            condições de trabalho, valores praticados ou escalas, e não garante a existência de turnos,
            oportunidades ou renda.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">2. Cadastro</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O cadastro no iFREE é permitido apenas a maiores de 18 anos, com um cadastro por CPF na plataforma.
            Você é responsável pela veracidade dos dados informados no cadastro (dados pessoais, foto, biografia,
            habilidades, chave PIX) e pela atualização deles sempre que mudarem — perfis com informações falsas,
            ou contas usadas de forma fraudulenta ou em desacordo com estes Termos, podem ser suspensos ou
            encerrados pelo iFREE.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">3. Como funciona o turno (totem e contrato)</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O registro de entrada e saída de cada turno é feito pelo &ldquo;totem&rdquo; do iFREE — no tablet ou
            celular da própria empresa Contratante, nunca no seu aparelho pessoal — com foto e assinatura digital
            sua no início e no fim do serviço. A cada turno, é gerado automaticamente um contrato de prestação de
            serviço eventual específico daquele turno (com a função, o valor/hora e as condições daquela empresa)
            e, ao final, um recibo de pagamento — ambos assinados digitalmente por você no próprio totem. Esse
            contrato específico do turno é o que vale para as condições daquele serviço em particular; este
            documento aqui é o termo da plataforma como um todo.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">4. Check-in, check-out e valor como prova</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Os registros de check-in e check-out feitos no totem a cada turno — horário de entrada e saída, foto
            e assinatura digital — não servem só para calcular o pagamento: eles também funcionam como prova de
            que o serviço foi de fato prestado e de quanto tempo durou, podendo ser usados por você, pela empresa
            Contratante ou pelo iFREE numa eventual disputa sobre um turno específico (por exemplo, divergência
            sobre o horário real de saída). Por isso é importante bater o próprio ponto, no momento exato de
            chegada e saída, sem pedir para outra pessoa fazer isso por você (ver item 7).
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">5. iFREE Conecta</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O <strong>iFREE Conecta</strong> é o seu portal dentro da plataforma: um perfil público com dados de
            contato, habilidades e disponibilidade, um histórico de avaliações recebidas das empresas onde já
            atuou, e um mural de vagas abertas por empresas que usam o iFREE. É por meio dele que novas empresas
            descobrem seu perfil e você constrói uma reputação que te acompanha entre diferentes contratantes na
            plataforma.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            As avaliações exibidas no iFREE Conecta são recíprocas (empresa avalia freelancer e vice-versa) e
            exibidas de forma agregada — não podem ser removidas a pedido de uma das partes, salvo em caso de
            erro comprovado.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">6. Pagamento</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Quando a empresa contratante utiliza o pagamento automático via PIX integrado à plataforma, o
            repasse é executado diretamente pela <strong>Asaas Gestão Financeira S.A.</strong>, instituição de
            pagamento autorizada a funcionar pelo Banco Central do Brasil, a partir da conta digital de
            titularidade da própria empresa — o iFREE não processa nem custodia esse dinheiro em nenhum momento.
            O valor é calculado com base no tempo efetivamente trabalhado, arredondado para o bloco de 5 (cinco)
            minutos mais próximo, e pago via PIX na chave que você cadastrar, em até 24 (vinte e quatro) horas
            após o término do serviço.
          </p>
          <SeloAsaas />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">7. Suas responsabilidades como prestador(a) autônomo(a)</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Você é responsável por manter conduta profissional adequada durante a prestação do serviço, e por
            providenciar, por conta própria, os trajes e equipamentos de proteção individual (EPI) necessários à
            atividade, salvo acordo em contrário com a empresa Contratante. Cabe a você verificar as informações
            da vaga antes de firmar um turno, manter comunicação clara e respeitosa, e proteger suas próprias
            credenciais de acesso à plataforma.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            O turno que você aceitar deve ser cumprido por você mesmo(a) — não é permitido enviar outra pessoa
            para atuar em seu lugar sem o conhecimento e a autorização prévia da empresa Contratante. Você
            também responde por danos que causar, por dolo ou culpa, ao patrimônio da empresa ou de terceiros
            durante a prestação do serviço.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">8. Natureza autônoma da prestação de serviço</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Sua prestação de serviço por meio do iFREE tem natureza eventual e autônoma, sem subordinação,
            exclusividade ou horário fixo obrigatório. Você é livre para atuar simultaneamente para quantas
            empresas quiser, inclusive fora do iFREE, e para recusar qualquer turno oferecido, sem que isso afete
            seu cadastro na plataforma.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Justamente por atuar como autônomo(a), você é o(a) único(a) responsável por declarar e recolher os
            próprios tributos e contribuições — Imposto de Renda e INSS como contribuinte individual, por
            exemplo. Nem o iFREE nem a empresa Contratante retêm, declaram ou recolhem nada em seu nome, nem têm
            qualquer responsabilidade tributária, trabalhista ou previdenciária sobre você: o valor pago via PIX
            é o valor bruto combinado para aquele turno.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Pelo mesmo motivo, também não existem os mecanismos de proteção em caso de acidente que uma empresa
            oferece a um funcionário CLT (como a comunicação obrigatória à Previdência ou o seguro custeado pelo
            empregador). Durante o turno, a responsabilidade pelos próprios cuidados de segurança é sua — vale
            avaliar, por conta própria, a contratação de um seguro pessoal ou a contribuição ao INSS como
            contribuinte individual, que pode dar direito a benefícios da Previdência em caso de incapacidade.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">9. Uso da plataforma para as próximas contratações</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Depois que você e uma empresa Contratante se conhecem por meio do iFREE, o ideal é que os próximos
            turnos entre vocês continuem sendo organizados pela plataforma — é isso que mantém o registro de
            entrada/saída como prova (item 4), o pagamento automático via PIX e o seu histórico de avaliações
            atualizado. Combinações recorrentes e deliberadas para tirar essa relação da plataforma não trazem
            benefício nenhum pra você (usar o iFREE nunca tem custo pro freelancer) e enfraquecem justamente as
            proteções que este documento te dá — mas a decisão de onde e como trabalhar continua sendo sempre sua.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">
            10. Ambiente de trabalho seguro e repúdio à discriminação
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE repudia qualquer forma de discriminação por gênero, orientação sexual, idade, aparência,
            etnia, religião ou convicção política, seja na divulgação de vagas, seja no tratamento recebido em um
            turno. Em nenhuma hipótese você deve se submeter a revista íntima ou a qualquer forma de busca no seu
            corpo por parte da empresa Contratante ou de terceiros — suspeitas de furto, extravio ou qualquer
            outra irregularidade devem ser encaminhadas às autoridades competentes, nunca resolvidas dessa forma.
            Qualquer situação assim pode ser denunciada pela Central de Ética da própria empresa (quando
            disponível) ou diretamente ao iFREE pelo WhatsApp.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">11. Confidencialidade</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Informações técnicas, administrativas ou comerciais às quais você tenha acesso em razão de um turno —
            inclusive dados de clientes ou processos internos da empresa Contratante — devem ser tratadas como
            confidenciais e usadas apenas para os fins da prestação daquele serviço.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">12. Propriedade intelectual da plataforma</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            A marca iFREE, o software, o layout e os demais elementos da plataforma são de propriedade do iFREE
            ou de seus licenciantes, sendo vedada a reprodução, engenharia reversa ou uso fora do que é
            necessário para a utilização normal do serviço.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">13. Seu currículo, seus dados e uso de imagem</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Você pode gerar um currículo em PDF com os dados do seu perfil quando ele estiver pelo menos
            parcialmente completo. Esse documento é seu, para usar como quiser, inclusive fora do iFREE.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE não usa seu nome, foto ou imagem em destaque para fins de divulgação ou marketing sem
            consentimento específico e caso a caso. Isso não inclui aparições incidentais: o iFREE pode produzir
            conteúdo institucional ou demonstrativo (vídeos, prints de tela, publicações em redes sociais)
            mostrando o uso real da plataforma pra explicar como ela funciona, e nesse contexto seu nome ou sua
            imagem podem aparecer de forma incidental, sem ser o foco do conteúdo — do mesmo jeito que alguém
            presente num evento transmitido ao vivo pode aparecer na cobertura, sem ser o assunto dela. Se
            preferir não aparecer num conteúdo específico, pode pedir a remoção pelo WhatsApp do iFREE.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">14. Fraude e retenção de pagamentos</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O iFREE tem tolerância zero a fraudes — uso indevido da plataforma, informações falsas, turnos
            registrados sem prestação real do serviço, entre outros. Contas envolvidas em fraude comprovada
            podem ser suspensas sem aviso prévio, e o iFREE pode reter ou deduzir valores diretamente ligados à
            fraude. Fora desses casos, a desativação da sua conta em uma empresa — seja por sua própria
            iniciativa, seja pela empresa — não afeta seu direito de receber pelos turnos já trabalhados e
            registrados até ali.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">15. Encerramento de conta</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Você pode encerrar sua conta a qualquer momento entrando em contato pelo WhatsApp do iFREE. O iFREE
            pode suspender ou encerrar o acesso de uma conta em caso de descumprimento destes Termos, uso
            fraudulento da plataforma, ou por determinação legal ou de autoridade competente.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">16. Privacidade e proteção de dados</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Tratamos os dados pessoais necessários para operar a plataforma (nome, CPF, telefone, endereço, chave
            PIX, foto e assinatura digital, entre outros) com base na execução do contrato entre você e a empresa
            Contratante, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018). O iFREE
            não vende nem aluga seus dados pessoais — compartilhamos informações apenas quando necessário para
            viabilizar o pagamento (com a Asaas), operar a infraestrutura técnica da plataforma, ou cumprir
            obrigações legais. Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer
            momento, pelo WhatsApp do iFREE, ressalvado o que precisar ser mantido por obrigação legal (ex.:
            comprovantes de pagamento).
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">
            17. Interrupções, alterações e descontinuação da plataforma
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            O acesso à plataforma pode ser interrompido, suspenso ou ficar temporariamente indisponível, sem
            aviso prévio, em razão de manutenção, falhas técnicas ou fatores fora do controle do iFREE. Caso o
            iFREE decida descontinuar definitivamente a plataforma, avisará com no mínimo{" "}
            <strong>30 (trinta) dias de antecedência</strong>, pelo WhatsApp ou pelo próprio Portal, para que você
            possa se organizar.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">18. Disposições gerais</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Este documento representa a vontade final das partes quanto ao uso da plataforma como um todo. Em
            caso de conflito com o contrato de um turno específico gerado na plataforma, prevalece o contrato
            daquele turno quanto às condições daquele serviço em particular. Caso qualquer disposição seja
            considerada inválida ou inexequível, as demais permanecem em pleno vigor. O fato de o iFREE não
            exigir o cumprimento imediato de alguma cláusula destes Termos não significa renúncia ao direito de
            exigi-la depois. Estes Termos podem ser atualizados a qualquer momento para refletir mudanças na
            plataforma ou na legislação aplicável — a data no topo desta página indica a última atualização.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">19. Legislação aplicável e foro</h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Estes Termos são regidos pelas leis brasileiras. Eventuais controvérsias serão submetidas ao foro do
            seu domicílio, salvo disposição legal em contrário, priorizando sempre que possível a resolução por
            conciliação ou mediação.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-navy-900">20. Contato</h2>
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
