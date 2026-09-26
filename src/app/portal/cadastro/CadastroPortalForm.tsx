"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { criarCadastroPortal } from "./actions";
import { formatarCpf } from "@/lib/cpf";
import CaptchaWidget from "@/components/CaptchaWidget";
import CameraCapture from "@/components/CameraCapture";

type Indicador = { id: number; nome: string } | null;

/** Cadastro em duas etapas dentro do MESMO <form> (dados pessoais, depois
 * a foto) — os campos da 1ª etapa e o CaptchaWidget ficam sempre montados
 * (só escondidos via CSS na etapa da foto), nunca desmontados: um input
 * não controlado (ou o campo escondido que o Turnstile injeta sozinho no
 * DOM) some do FormData assim que sai da árvore React, e o envio real só
 * acontece lá na frente, depois da foto — desmontar qualquer campo no
 * meio do caminho perderia esse valor. A câmera é a única parte
 * condicionalmente montada de propósito: não faz sentido pedir permissão
 * de câmera antes da pessoa sequer chegar nessa etapa. */
type EnderecoAuto = { endereco: string; bairro: string; cidade: string };

export default function CadastroPortalForm({ indicador }: { indicador: Indicador }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(criarCadastroPortal, undefined);
  const [, startTransition] = useTransition();
  const [cpf, setCpf] = useState("");
  const [etapa, setEtapa] = useState<"dados" | "foto">("dados");
  const [foiIndicado, setFoiIndicado] = useState(false);
  const [sexo, setSexo] = useState<"MASCULINO" | "FEMININO" | "PREFIRO_NAO_DIZER" | "">("");
  // Diferente de sexo, não é obrigatório pra avançar (ver tentouAvancar
  // abaixo) — dado de saúde é categoria sensível pela LGPD, não faz
  // sentido travar o cadastro por causa disso. null = não respondeu.
  const [pcd, setPcd] = useState<boolean | null>(null);
  const [tentouAvancar, setTentouAvancar] = useState(false);
  const [cep, setCep] = useState("");
  const [enderecoAuto, setEnderecoAuto] = useState<EnderecoAuto>({ endereco: "", bairro: "", cidade: "" });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  // Mesmo padrão de MeusDadosForm.tsx — busca ViaCEP no blur e preenche
  // endereço/bairro/cidade automaticamente, deixando tudo editável depois.
  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }
      setEnderecoAuto({
        endereco: dados.logradouro || enderecoAuto.endereco,
        bairro: dados.bairro || enderecoAuto.bairro,
        cidade: dados.localidade || enderecoAuto.cidade,
      });
    } catch {
      setErroCep("Não foi possível consultar o CEP agora — preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  if (state?.sucesso) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md">
        <h1 className="text-xl font-semibold text-navy-900">Verifique seu e-mail</h1>
        <p className="text-sm text-stone-600">
          Mandamos um link de confirmação pro e-mail que você informou. Ele
          vale por 24 horas — clique nele pra criar sua senha e começar a
          usar o Portal.
        </p>
        <Link href="/portal/entrar" className="text-brand-700 underline text-sm">
          Voltar pro login
        </Link>
      </div>
    );
  }

  function avancarParaFoto(e: React.FormEvent) {
    e.preventDefault();
    if (!sexo) {
      setTentouAvancar(true);
      return;
    }
    setEtapa("foto");
  }

  function handleFotoCapturada(dataUrl: string) {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("fotoDataUrl", dataUrl);
    fd.set("sexo", sexo);
    if (pcd !== null) fd.set("pcd", pcd ? "sim" : "nao");
    if (indicador) fd.set("indicadoPorPessoaId", String(indicador.id));
    startTransition(() => formAction(fd));
  }

  return (
    <form
      ref={formRef}
      onSubmit={avancarParaFoto}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm w-full max-w-md"
    >
      <div className={etapa === "foto" ? "hidden" : "flex flex-col gap-3"}>
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Fazer novo cadastro</h1>
          <p className="text-sm text-stone-500 mt-1">
            Primeira vez por aqui? Preencha seus dados — depois é só
            confirmar o e-mail pra começar a usar o Portal.{" "}
            <Link href="/portal/entrar" className="text-brand-700 underline">
              Já tem cadastro? Entrar
            </Link>
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Nome completo
          <input
            name="nome"
            required
            autoFocus
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          CPF
          <input
            name="cpf"
            inputMode="numeric"
            required
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            placeholder="000.000.000-00"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Telefone (WhatsApp)
          <input
            name="telefone"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          CEP
          <input
            name="cep"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            onBlur={(e) => buscarCep(e.target.value)}
            required
            placeholder="00000-000"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {buscandoCep && <span className="text-xs text-stone-500">Buscando endereço...</span>}
          {erroCep && <span className="text-xs text-amber-600">{erroCep}</span>}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Endereço (rua)
            <input
              name="endereco"
              value={enderecoAuto.endereco}
              onChange={(e) => setEnderecoAuto((a) => ({ ...a, endereco: e.target.value }))}
              required
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Número
            <input
              name="numero"
              required
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Complemento (opcional)
            <input
              name="complemento"
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Bairro
            <input
              name="bairro"
              value={enderecoAuto.bairro}
              onChange={(e) => setEnderecoAuto((a) => ({ ...a, bairro: e.target.value }))}
              required
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Cidade
          <input
            name="cidade"
            value={enderecoAuto.cidade}
            onChange={(e) => setEnderecoAuto((a) => ({ ...a, cidade: e.target.value }))}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          E-mail
          <input
            name="email"
            type="email"
            required
            placeholder="voce@email.com"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-stone-700">
            Gênero <span className="text-stone-400 font-normal">(usado só pra personalizar seu avatar)</span>
          </span>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["MASCULINO", "Masculino"],
                ["FEMININO", "Feminino"],
                ["PREFIRO_NAO_DIZER", "Prefiro não dizer"],
              ] as const
            ).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setSexo(valor)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  sexo === valor
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tentouAvancar && !sexo && (
            <span className="text-xs text-red-600">Escolha uma opção pra continuar.</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-stone-700">
            Possui alguma necessidade especial? (PCD){" "}
            <span className="text-stone-400 font-normal">(opcional)</span>
          </span>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                [true, "Sim"],
                [false, "Não"],
              ] as const
            ).map(([valor, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setPcd(valor)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  pcd === valor
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {indicador ? (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            🎉 Você foi indicado(a) por <strong>{indicador.nome}</strong>!
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-stone-700">Foi indicado(a) por alguém a usar o iFREE?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFoiIndicado(true)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  foiIndicado
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setFoiIndicado(false)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  !foiIndicado
                    ? "bg-stone-800 border-stone-800 text-white"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                Não
              </button>
            </div>
            {foiIndicado && (
              <input
                name="indicadoPorNomeTexto"
                placeholder="Nome de quem te indicou"
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>
        )}

        <CaptchaWidget />

        {state?.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.erro}
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 mt-1 transition-colors"
        >
          Continuar
        </button>
      </div>

      {etapa === "foto" && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-navy-900">Agora, sua foto</h1>
            <p className="text-sm text-stone-500 mt-1">
              Obrigatória — é assim que as empresas reconhecem você. Tire
              agora pela câmera (não dá pra escolher uma foto já salva).
            </p>
          </div>

          <CameraCapture onCapture={handleFotoCapturada} />

          {state?.erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.erro}
            </p>
          )}
          {pending && <p className="text-sm text-stone-500 text-center">Enviando cadastro...</p>}

          <button
            type="button"
            onClick={() => setEtapa("dados")}
            disabled={pending}
            className="text-sm text-stone-600 hover:underline self-center disabled:opacity-50"
          >
            ← Voltar e revisar meus dados
          </button>
        </div>
      )}
    </form>
  );
}
