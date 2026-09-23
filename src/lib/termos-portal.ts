/** Resumo em linguagem simples dos Termos de Uso do Portal do freelancer
 * (iFREE Conecta), usado na tela de aceite dentro do Portal
 * (/portal/termos) — texto ainda não revisado por advogado. Diferente de
 * Empresa.termosContrato (contrato de um turno específico, por empresa):
 * isso aqui é o termo da plataforma como um todo, aceito uma vez só (ver
 * Pessoa.termosAceitosEm). A versão completa e estilizada mora em
 * /termos/freelancer (src/app/termos/freelancer/page.tsx) — este resumo
 * cobre os mesmos pontos, mas condensado pra caber num scrollbox de
 * aceite; sempre que uma cláusula nova entrar lá (ex.: aviso de 30 dias
 * pra descontinuação, repúdio à discriminação/revista íntima), vale
 * refletir aqui também. */
export const TERMOS_PORTAL_PARAGRAFOS: readonly string[] = [
  "Ao usar o Portal do freelancer no iFREE, você concorda com o seguinte:",
  "O iFREE é uma plataforma de tecnologia que conecta freelancers (\"extras\") a empresas que precisam de mão de obra temporária. O iFREE não é parte da relação de trabalho entre você e as empresas onde atua — não é seu empregador, não define suas condições de trabalho e não garante turnos ou renda.",
  "Quando a empresa contratante utiliza o pagamento automático via PIX integrado à plataforma, o repasse é executado pela Asaas Gestão Financeira S.A., instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil, a partir da conta digital de titularidade da própria empresa — o iFREE não processa nem custodia esse dinheiro em nenhum momento.",
  "As informações que você preencher no seu perfil (dados pessoais, foto, biografia, habilidades, vagas desejadas) devem ser verdadeiras. Perfis com informações falsas podem ser suspensos.",
  "Sua reputação no Portal é formada por avaliações de empresas onde você já trabalhou, e é exibida de forma agregada (nota média, tags mais frequentes) — as empresas também recebem avaliações suas. Avaliações não podem ser removidas a pedido de uma das partes, só em caso de erro comprovado.",
  "O iFREE repudia qualquer forma de discriminação (gênero, orientação sexual, idade, aparência, etnia, religião ou convicção política). Em nenhuma hipótese você deve se submeter a revista íntima por parte de uma empresa — suspeitas de furto ou irregularidade devem ir para as autoridades competentes, nunca resolvidas dessa forma.",
  "Você pode gerar um currículo em PDF com os dados do seu perfil quando ele estiver pelo menos parcialmente completo. Esse documento é seu, pra usar como quiser, inclusive fora do iFREE.",
  "Você pode encerrar sua conta a qualquer momento entrando em contato pelo WhatsApp do iFREE. Caso o iFREE decida descontinuar a plataforma por completo, avisará com no mínimo 30 dias de antecedência.",
  "Este é um resumo em linguagem simples — a versão completa está em ifree.app.br/termos/freelancer.",
];
