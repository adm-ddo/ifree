"use client";

import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  atualizarChaveAsaas,
  conectarContaAsaas,
  conectarContaAsaasExistente,
  desconectarContaAsaas,
  reconectarContaAsaas,
} from "./actions";
import CampoValorReais from "@/components/CampoValorReais";
import AutoRefresh from "@/components/AutoRefresh";
import SeloAsaas from "@/components/SeloAsaas";

const LABEL_STATUS: Record<string, string> = {
  PENDENTE_ATIVACAO: "Aguardando ativação",
  ATIVA: "Ativa",
  BLOQUEADA: "Bloqueada",
};

/// Tradução do status BRUTO que a própria Asaas devolve em GET
/// /myAccount (ver StatusAsaasLive em src/lib/pagamentos/
/// asaas-conta-status.ts) — preferido sobre LABEL_STATUS (nosso enum
/// resumido) quando disponível, pra mostrar pro dono o mesmo texto que
/// ele veria entrando direto no painel da Asaas.
const LABEL_STATUS_ASAAS: Record<string, string> = {
  PENDING: "Em análise",
  AWAITING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovada",
  REPROVED: "Reprovada",
};

/// Dados já cadastrados em /configuracoes (ver ConfiguracoesForm) — usados
/// só pra pré-preencher o formulário de conexão nova (botão "Puxar dados
/// do cadastro"), evitando digitar tudo de novo. Cada campo é opcional
/// porque a empresa pode não ter preenchido tudo lá ainda.
export type DadosEmpresaParaAsaas = {
  email: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
};

export default function ContaAsaasForm({
  contaAtual,
  statusLive,
  producao,
  dadosEmpresa,
}: {
  contaAtual: { status: string; criadoEm: Date; desconectadoEm: Date | null } | null;
  /// Consulta ao vivo na Asaas (ver verificarStatusAsaas) — null quando
  /// não há conta ou a consulta falhou nesta visita à página; nesse caso
  /// cai pro campo `status` salvo no banco (mais impreciso, mas melhor que
  /// nada).
  statusLive: { statusConta: string; pixLiberado: boolean } | null;
  producao: boolean;
  dadosEmpresa: DadosEmpresaParaAsaas;
}) {
  const [state, formAction, pending] = useActionState(conectarContaAsaas, undefined);
  const [stateExistente, formActionExistente, pendingExistente] = useActionState(
    conectarContaAsaasExistente,
    undefined
  );
  const [modoConexao, setModoConexao] = useState<"nova" | "existente">("nova");
  const [stateChave, formActionChave, pendingChave] = useActionState(atualizarChaveAsaas, undefined);
  const [mostrarAtualizarChave, setMostrarAtualizarChave] = useState(false);
  const [pendingAcao, startAcao] = useTransition();
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  if (contaAtual?.desconectadoEm) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3 max-w-lg">
        <div>
          <h2 className="font-semibold text-navy-900 text-sm">Conta de pagamento (Asaas)</h2>
          <p className="text-xs text-stone-500 mt-1">
            Pagamento automático desligado em{" "}
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
              contaAtual.desconectadoEm
            )}
            . A conta continua conectada — os extras voltam a ser pagos manualmente, igual antes da
            automação existir.
          </p>
        </div>
        {erroAcao && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroAcao}</p>
        )}
        <button
          type="button"
          disabled={pendingAcao}
          onClick={() => {
            setErroAcao(null);
            startAcao(async () => {
              const resultado = await reconectarContaAsaas();
              if (resultado?.erro) setErroAcao(resultado.erro);
            });
          }}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
        >
          {pendingAcao ? "Reativando..." : "🔌 Reativar pagamento automático"}
        </button>
      </div>
    );
  }

  if (contaAtual) {
    const aprovada = statusLive ? statusLive.statusConta === "APPROVED" : contaAtual.status === "ATIVA";
    const pixLiberado = statusLive?.pixLiberado ?? false;
    const etapaAtual = !aprovada ? 2 : !pixLiberado ? 3 : 4;
    return (
      <div className="flex flex-col gap-3">
        {/* Só atualiza sozinho enquanto falta algo — depois de tudo
         * liberado (etapa 4) não há mais nada pra essa tela detectar
         * sem intervenção do dono (depósito, desconectar). */}
        {etapaAtual < 4 && <AutoRefresh intervaloMs={5000} />}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-navy-900 text-sm">Conta de pagamento (Asaas)</h2>
            <SeloAsaas porte="pequeno" />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Status:{" "}
            <span className="font-medium">
              {aprovada
                ? "Aprovada"
                : statusLive
                  ? LABEL_STATUS_ASAAS[statusLive.statusConta] ?? statusLive.statusConta
                  : LABEL_STATUS[contaAtual.status] ?? contaAtual.status}
            </span>
            {aprovada && (
              <>
                {" "}
                · Pix:{" "}
                <span className="font-medium">{pixLiberado ? "Liberado" : "Aguardando verificação"}</span>
              </>
            )}
            {etapaAtual < 4 && <span className="text-stone-400"> · atualiza sozinho</span>}
          </p>
          <p
            className={`text-xs rounded-lg px-3 py-2 mt-2 ${
              producao
                ? "text-brand-700 bg-brand-50 border border-brand-200"
                : "text-amber-700 bg-amber-50 border border-amber-200"
            }`}
          >
            {producao
              ? "💳 Conta de produção — dinheiro de verdade."
              : "🧪 Rodando contra o ambiente de testes da Asaas (sandbox) — nenhum dinheiro real envolvido ainda."}
          </p>
          {erroAcao && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
              {erroAcao}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              disabled={pendingAcao}
              onClick={() => {
                if (
                  !confirm(
                    "Desativar o pagamento automático desta empresa? Os extras voltam a ser pagos manualmente — dá pra reativar quando quiser, sem perder a conexão."
                  )
                ) {
                  return;
                }
                setErroAcao(null);
                startAcao(async () => {
                  const resultado = await desconectarContaAsaas();
                  if (resultado?.erro) setErroAcao(resultado.erro);
                });
              }}
              className="text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              {pendingAcao ? "Desativando..." : "Desativar pagamento automático"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarAtualizarChave((v) => !v)}
              className="text-xs text-stone-500 hover:underline"
            >
              🔑 Atualizar chave de API
            </button>
          </div>
          {mostrarAtualizarChave && (
            <form action={formActionChave} className="flex flex-col gap-2 mt-3 border-t border-stone-100 pt-3">
              <p className="text-xs text-stone-500">
                Use isso se o pagamento automático falhar com erro de
                permissão (comum quando a chave foi gerada no painel
                próprio da Asaas sem marcar &ldquo;Transferência&rdquo;).
                Cole a chave corrigida — o CNPJ tem que bater com o desta
                empresa.
              </p>
              <input
                type="text"
                name="apiKey"
                required
                placeholder="$aact_..."
                className="border border-stone-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="password"
                name="senha"
                required
                placeholder="Confirme sua senha"
                className="border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {stateChave?.erro && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {stateChave.erro}
                </p>
              )}
              {stateChave?.sucesso && (
                <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                  Chave atualizada! Já pode tentar de novo os pagamentos que falharam em Pagamentos.
                </p>
              )}
              <button
                type="submit"
                disabled={pendingChave}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-2 disabled:opacity-50 transition-colors self-start px-4"
              >
                {pendingChave ? "Atualizando..." : "Atualizar chave"}
              </button>
            </form>
          )}
        </div>
        <GuiaAtivacaoPagamento etapaAtual={etapaAtual} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-lg">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setModoConexao("nova")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            modoConexao === "nova"
              ? "bg-brand-600 text-white"
              : "border border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Criar conta nova
        </button>
        <button
          type="button"
          onClick={() => setModoConexao("existente")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            modoConexao === "existente"
              ? "bg-brand-600 text-white"
              : "border border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Já tinha conta Asaas antes do iFREE
        </button>
      </div>
      {modoConexao === "nova" ? (
        <FormularioConexao
          formAction={formAction}
          pending={pending}
          state={state}
          producao={producao}
          dadosEmpresa={dadosEmpresa}
        />
      ) : (
        <FormularioConexaoExistente
          formAction={formActionExistente}
          pending={pendingExistente}
          state={stateExistente}
        />
      )}
    </div>
  );
}

/** Alternativa a FormularioConexao pra quando o CNPJ já tem conta na
 * Asaas (POST /accounts recusa criar uma segunda) — a pessoa gera a API
 * Key na própria conta dela e cola aqui, ver conectarContaAsaasExistente
 * em ./actions.ts. */
function FormularioConexaoExistente({
  formAction,
  pending,
  state,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: { erro?: string; sucesso?: boolean; aviso?: string } | undefined;
}) {
  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-navy-900 text-sm">Conectar conta Asaas existente</h2>
          <p className="text-xs text-stone-500 mt-1">
            Use isso só se essa empresa <strong>já tinha</strong> uma conta na Asaas
            <strong> antes</strong> de usar o iFREE (por já usar pra emitir boleto, nota, etc.) — nesse
            caso a Asaas não deixa criar uma conta nova pro mesmo CNPJ. Não é pra quem acabou de criar
            pela opção &ldquo;Criar conta nova&rdquo; — essa já fica conectada sozinha, sem precisar
            colar chave nenhuma aqui.
          </p>
        </div>
        <SeloAsaas porte="pequeno" />
      </div>

      <ol className="text-xs text-stone-600 flex flex-col gap-1 list-decimal list-inside">
        <li>
          Entre em{" "}
          <a
            href="https://www.asaas.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            asaas.com/login
          </a>{" "}
          com a conta desta empresa.
        </li>
        <li>Vá em Integrações → Chave de API.</li>
        <li>Gere (ou copie) a chave e cole abaixo.</li>
      </ol>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Chave de API da sua conta Asaas
        <input
          type="text"
          name="apiKey"
          required
          placeholder="$aact_..."
          className="border border-stone-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Confirme sua senha
        <input
          type="password"
          name="senha"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Conta conectada! Recarregue a página pra ver o status.
        </p>
      )}
      {state?.aviso && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ {state.aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Conectando..." : "Conectar"}
      </button>
    </form>
  );
}

/** Formulário de conexão (empresa ainda sem conta) — separado num
 * componente próprio só pra poder usar hooks (useState/useRef do
 * autopreenchimento de CEP) sem misturar com os outros branches de
 * ContaAsaasForm, que não precisam deles. */
function FormularioConexao({
  formAction,
  pending,
  state,
  producao,
  dadosEmpresa,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: { erro?: string; sucesso?: boolean; aviso?: string; email?: string } | undefined;
  producao: boolean;
  dadosEmpresa: DadosEmpresaParaAsaas;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const postalCodeRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const provinceRef = useRef<HTMLInputElement>(null);
  const addressNumberRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false);

  const temDadosParaPuxar = Object.values(dadosEmpresa).some(Boolean);

  function puxarDadosDoCadastro() {
    if (emailRef.current && dadosEmpresa.email) emailRef.current.value = dadosEmpresa.email;
    if (postalCodeRef.current && dadosEmpresa.cep) postalCodeRef.current.value = dadosEmpresa.cep;
    if (addressRef.current && dadosEmpresa.endereco) addressRef.current.value = dadosEmpresa.endereco;
    if (provinceRef.current && dadosEmpresa.bairro) provinceRef.current.value = dadosEmpresa.bairro;
    if (addressNumberRef.current && dadosEmpresa.numero) addressNumberRef.current.value = dadosEmpresa.numero;
    if (complementRef.current && dadosEmpresa.complemento) complementRef.current.value = dadosEmpresa.complemento;
  }

  async function autopreencherPorCep(valorDigitado: string) {
    const cep = valorDigitado.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    setCepNaoEncontrado(false);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        setCepNaoEncontrado(true);
        return;
      }
      // Só preenche o que ainda está vazio — não sobrescreve o que a
      // pessoa já digitou na mão antes de mexer no CEP.
      if (addressRef.current && !addressRef.current.value) addressRef.current.value = dados.logradouro ?? "";
      if (provinceRef.current && !provinceRef.current.value) provinceRef.current.value = dados.bairro ?? "";
    } catch {
      // Falha de rede na busca do CEP — a pessoa preenche endereço e
      // bairro na mão normalmente, sem bloquear o formulário por isso.
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-navy-900 text-sm">Conectar conta de pagamento (Asaas)</h2>
          <p className="text-xs text-stone-500 mt-1">
            Cria uma conta própria desta empresa na Asaas — é dela que sai o
            PIX pros extras quando a automação estiver ligada.
            {!producao && " Recurso em teste, rodando no ambiente de sandbox da Asaas."}
          </p>
        </div>
        <SeloAsaas porte="pequeno" />
      </div>

      {temDadosParaPuxar && (
        <button
          type="button"
          onClick={puxarDadosDoCadastro}
          className="text-xs text-brand-700 hover:underline self-start"
        >
          📋 Puxar dados do cadastro da empresa
        </button>
      )}

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        E-mail de contato
        <input
          ref={emailRef}
          type="email"
          name="email"
          required
          placeholder="financeiro@suaempresa.com"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Tipo de empresa
        <select
          name="companyType"
          required
          defaultValue=""
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          <option value="MEI">MEI</option>
          <option value="INDIVIDUAL">Firma individual</option>
          <option value="LIMITED">LTDA (sociedade limitada)</option>
          <option value="ASSOCIATION">Associação</option>
        </select>
      </label>

      <CampoValorReais name="incomeValue" label="Faturamento mensal estimado (R$)" placeholder="5.000,00" />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          CEP
          <input
            ref={postalCodeRef}
            type="text"
            name="postalCode"
            required
            placeholder="00000000"
            onBlur={(e) => autopreencherPorCep(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <div className="flex items-end pb-2 text-xs text-stone-500">
          {buscandoCep && "🔎 Buscando endereço..."}
          {cepNaoEncontrado && !buscandoCep && "CEP não encontrado — preencha à mão."}
        </div>
        <label className="flex flex-col gap-1 text-sm text-stone-700 col-span-2">
          Endereço
          <input
            ref={addressRef}
            type="text"
            name="address"
            required
            placeholder="Preenche sozinho a partir do CEP"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700 col-span-2">
          Bairro
          <input
            ref={provinceRef}
            type="text"
            name="province"
            required
            placeholder="Preenche sozinho a partir do CEP"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Número
          <input
            ref={addressNumberRef}
            type="text"
            name="addressNumber"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Complemento (opcional)
          <input
            ref={complementRef}
            type="text"
            name="complement"
            placeholder="Sala, bloco..."
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Confirme sua senha
        <input
          type="password"
          name="senha"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          ✅ Conta criada! Enviamos um e-mail pra{" "}
          <strong>{state.email ?? "o endereço informado"}</strong> com o link pra criar a senha na
          Asaas e completar o cadastro (documento + selfie). Não precisa fazer mais nada aqui — assim
          que a Asaas aprovar, o status muda sozinho nesta tela.
        </p>
      )}
      {state?.aviso && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ {state.aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Conectando..." : "Conectar"}
      </button>
    </form>
    <GuiaAtivacaoPagamento etapaAtual={1} />
    </div>
  );
}

/** Passo a passo objetivo de tudo que o dono da empresa precisa fazer pra
 * sair do zero até o pagamento automático funcionando — cobre inclusive a
 * etapa que não fica visível em lugar nenhum do app (verificação de
 * identidade pra liberar o Pix na Asaas, que exige logar direto no painel
 * deles). `etapaAtual` só destaca visualmente onde a empresa está, não
 * esconde os outros passos — a pessoa pode voltar aqui a qualquer momento
 * pra conferir o que falta. */
function GuiaAtivacaoPagamento({ etapaAtual }: { etapaAtual: 1 | 2 | 3 | 4 }) {
  const passos: { titulo: string; texto: ReactNode }[] = [
    {
      titulo: "Conecte a conta",
      texto: (
        <>
          Preencha os dados acima (e-mail, tipo de empresa, faturamento
          estimado e endereço completo) e clique em &ldquo;Conectar&rdquo;.
          Isso cria, dentro da Asaas, uma conta de pagamento exclusiva desta
          empresa — o dinheiro fica separado, o iFREE nunca chega a tocar
          nele.
        </>
      ),
    },
    {
      titulo: "Aguarde a aprovação",
      texto: (
        <>
          Normalmente é automática e leva só alguns minutos. Em alguns
          casos a Asaas faz uma análise manual, que pode levar até 1 dia
          útil. O status muda sozinho aqui em cima quando aprovar.
        </>
      ),
    },
    {
      titulo: "Libere o Pix (etapa separada, obrigatória)",
      texto: (
        <>
          Mesmo com a conta já aprovada, a Asaas exige uma verificação de
          identidade antes de liberar o Pix — normalmente{" "}
          <strong>documento de identificação + selfie</strong> e, se a
          empresa for LTDA, também o <strong>contrato social</strong>. Não
          são pedidos todos ao mesmo tempo — o painel deles pede um de cada
          vez, então confira de novo depois de enviar o primeiro, pra não
          achar que já terminou quando ainda falta mais um. Pra fazer isso:
          entre em{" "}
          <a
            href="https://www.asaas.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            asaas.com/login
          </a>
          , clique em &ldquo;Esqueci minha senha&rdquo;, use o e-mail que
          você cadastrou na conexão acima, crie uma senha nova, entre no
          painel e envie cada documento pedido.
        </>
      ),
    },
    {
      titulo: "Coloque crédito na conta",
      texto: (
        <>
          Depois de aprovado, vá em{" "}
          <Link href="/pagamentos" className="text-brand-700 hover:underline">
            Pagamentos
          </Link>{" "}
          e use o cartão de depósito pra gerar um Pix e carregar a conta —
          esse saldo é o que paga os extras automaticamente.
        </>
      ),
    },
    {
      titulo: "Pronto — confira quem é pago automático",
      texto: (
        <>
          Só freelancer marcado como <strong>recebimento diário</strong>{" "}
          entra na automação — assim que o turno é encerrado, o Pix sai
          sozinho. Quem é <strong>semanal</strong> continua aparecendo em{" "}
          <Link href="/pagamentos" className="text-brand-700 hover:underline">
            Pagamentos
          </Link>{" "}
          pra você marcar como pago na mão.
        </>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg">
      <h2 className="font-semibold text-navy-900 text-sm">📘 Como ativar o pagamento online</h2>
      <ol className="flex flex-col gap-3 mt-3">
        {passos.map((passo, i) => {
          const numero = i + 1;
          const feito = numero < etapaAtual;
          return (
            <li key={passo.titulo} className="flex gap-3">
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold shrink-0 ${
                  feito
                    ? "bg-brand-600 text-white"
                    : numero === etapaAtual
                      ? "bg-navy-800 text-white"
                      : "bg-stone-100 text-stone-500"
                }`}
              >
                {feito ? "✓" : numero}
              </span>
              <div>
                <p className="text-sm font-medium text-navy-900">{passo.titulo}</p>
                <p className="text-xs text-stone-600 mt-0.5">{passo.texto}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
