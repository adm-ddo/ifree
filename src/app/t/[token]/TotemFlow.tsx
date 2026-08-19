"use client";

import { useEffect, useRef, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import { Logo } from "@/components/Logo";
import TotemKioskGuard from "@/components/TotemKioskGuard";
import {
  buscarPessoaPorDocumento,
  criarPessoa,
  iniciarTurno,
  concluirTurno,
  atualizarDadosPessoa,
} from "./actions";
import {
  apenasDigitos,
  formatarDocumentoAuto,
  detectarTipoChavePix,
  LABEL_TIPO_CHAVE_PIX,
} from "@/lib/documento";
import { tocarBipTeclado } from "@/lib/somTeclado";
import type { TipoChavePix } from "@/generated/prisma/enums";

type Funcao = { id: number; nome: string; valorHoraPadrao: number };

type TurnoAberto = {
  turnoId: number;
  funcaoNome: string;
  horaEntrada: string;
  valorHoraAplicado: number;
};

type DadosPessoa = {
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
};


const INSTRUCAO_FOTO =
  "Afaste-se um pouco da câmera pra aparecer se você já está com seu traje/EPI adequado para a função.";

type Step =
  | { name: "documento" }
  | { name: "cadastro"; documento: string }
  | ({ name: "foto"; pessoaId: number; pessoaNome: string } & DadosPessoa)
  | { name: "funcao"; pessoaId: number; pessoaNome: string; fotoDataUrl: string }
  | {
      name: "termos";
      pessoaId: number;
      pessoaNome: string;
      fotoDataUrl: string;
      funcaoId: number;
      funcaoNome: string;
    }
  | {
      name: "assinaturaContrato";
      pessoaId: number;
      pessoaNome: string;
      fotoDataUrl: string;
      funcaoId: number;
      funcaoNome: string;
    }
  | { name: "sucessoEntrada"; pessoaNome: string; funcaoNome: string }
  | ({ name: "fotoSaida"; pessoaId: number; pessoaNome: string; turno: TurnoAberto } & DadosPessoa)
  | ({
      name: "concluir";
      pessoaId: number;
      pessoaNome: string;
      turno: TurnoAberto;
      fotoDataUrl: string;
    } & DadosPessoa)
  | { name: "sucessoSaida"; pessoaNome: string; minutosArredondados: number; valorTotal: number }
  | ({ name: "editarDados"; pessoaId: number; pessoaNome: string; voltar: Step } & DadosPessoa)
  | { name: "erro"; mensagem: string };

const RESET_MS = 8000;

export default function TotemFlow({
  token,
  empresaNome,
  funcoes,
  termos,
}: {
  token: string;
  empresaNome: string;
  funcoes: Funcao[];
  termos: string[];
}) {
  const [step, setStep] = useState<Step>({ name: "documento" });

  // Telas de sucesso voltam sozinhas pro início — é um kiosk, não tem
  // ninguém pra clicar "concluir" depois que a pessoa já saiu de perto.
  useEffect(() => {
    if (step.name !== "sucessoEntrada" && step.name !== "sucessoSaida") return;
    const id = setTimeout(() => setStep({ name: "documento" }), RESET_MS);
    return () => clearTimeout(id);
  }, [step.name]);

  // Recarrega a página sozinha de tempos em tempos — só quando a tela está
  // ociosa (ninguém no meio de um check-in), pra nunca interromper um
  // turno sendo aberto/fechado. Isso limpa qualquer acúmulo de memória de
  // uma sessão de horas no navegador (câmera, canvas, etc.) antes que vire
  // motivo de trava — mitigação de defesa, não a causa raiz (que costuma
  // ser o próprio Android matando o navegador em segundo plano; ver
  // instruções de configuração do tablet passadas separadamente pro dono).
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    const INTERVALO_RECARGA_MS = 3 * 60 * 60 * 1000; // 3h
    const NOVA_TENTATIVA_MS = 30_000;
    let cancelado = false;
    let id: ReturnType<typeof setTimeout>;

    function agendar(delay: number) {
      id = setTimeout(() => {
        if (cancelado) return;
        if (stepRef.current.name === "documento") {
          window.location.reload();
        } else {
          agendar(NOVA_TENTATIVA_MS);
        }
      }, delay);
    }
    agendar(INTERVALO_RECARGA_MS);

    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, []);

  // A tela de CPF/CNPJ fica ancorada perto do topo (em vez de centralizada)
  // o tempo todo, não só quando o teclado abre — testamos animar essa troca
  // dinamicamente ao focar o campo, mas a mudança de layout no meio da
  // interação fazia o toque no botão "Continuar" errar o alvo (a posição
  // mudava debaixo do dedo). Deixando fixo desde o início evita esse risco
  // por completo: nada se move durante a digitação.
  const telaDocumento = step.name === "documento";

  return (
    <div
      className={`flex flex-1 flex-col items-center gap-8 text-center py-8 ${
        telaDocumento ? "justify-start pt-10 sm:pt-16" : "justify-center"
      }`}
    >
      <TotemKioskGuard />
      <div className="flex flex-col items-center gap-1">
        <Logo size={44} />
        <p className="text-lg text-stone-500">{empresaNome}</p>
      </div>

      {step.name === "documento" && (
        <TelaDocumento
          onResultado={(res, documento) => {
            if ("erro" in res) return setStep({ name: "erro", mensagem: res.erro });
            if (!res.encontrada) return setStep({ name: "cadastro", documento });
            const dadosPessoa: DadosPessoa = {
              telefone: res.telefone,
              endereco: res.endereco,
              numero: res.numero,
              complemento: res.complemento,
              chavePix: res.chavePix,
              tipoChavePix: res.tipoChavePix,
            };
            if (res.turnoAberto) {
              setStep({
                name: "fotoSaida",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                turno: res.turnoAberto,
                ...dadosPessoa,
              });
            } else {
              setStep({
                name: "foto",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                ...dadosPessoa,
              });
            }
          }}
          token={token}
        />
      )}

      {step.name === "cadastro" && (
        <TelaCadastro
          token={token}
          documentoInicial={step.documento}
          onCadastrado={(pessoaId, pessoaNome, dadosPessoa) =>
            setStep({ name: "foto", pessoaId, pessoaNome, ...dadosPessoa })
          }
          onCancelar={() => setStep({ name: "documento" })}
        />
      )}

      {step.name === "foto" && (
        <div className="flex flex-col gap-5 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Oi, {step.pessoaNome.split(" ")[0]}! Vamos tirar uma foto.
          </h1>
          <p className="text-lg text-stone-500">{INSTRUCAO_FOTO}</p>
          <CameraCapture
            onCapture={(dataUrl) =>
              setStep({
                name: "funcao",
                pessoaId: step.pessoaId,
                pessoaNome: step.pessoaNome,
                fotoDataUrl: dataUrl,
              })
            }
          />
          <BotaoEditarDados
            onClick={() =>
              setStep({
                name: "editarDados",
                pessoaId: step.pessoaId,
                pessoaNome: step.pessoaNome,
                telefone: step.telefone,
                endereco: step.endereco,
                numero: step.numero,
                complemento: step.complemento,
                chavePix: step.chavePix,
                tipoChavePix: step.tipoChavePix,
                voltar: step,
              })
            }
          />
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "funcao" && (
        <div className="flex flex-col gap-4 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Qual função você vai fazer hoje?
          </h1>
          {funcoes.length === 0 && (
            <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              Nenhuma função cadastrada. Peça pro responsável cadastrar em
              /funcoes antes de liberar o totem.
            </p>
          )}
          {funcoes.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                setStep({
                  name: "termos",
                  pessoaId: step.pessoaId,
                  pessoaNome: step.pessoaNome,
                  fotoDataUrl: step.fotoDataUrl,
                  funcaoId: f.id,
                  funcaoNome: f.nome,
                })
              }
              className="w-full rounded-xl border border-stone-300 bg-white hover:border-brand-400 hover:bg-brand-50 px-6 py-5 text-left transition-colors"
            >
              <p className="text-xl font-medium text-navy-900">{f.nome}</p>
              <p className="text-base text-stone-500">
                R$ {f.valorHoraPadrao.toFixed(2)}/hora
              </p>
            </button>
          ))}
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "termos" && (
        <TelaTermos
          funcaoNome={step.funcaoNome}
          termos={termos}
          onAceitar={() =>
            setStep({
              name: "assinaturaContrato",
              pessoaId: step.pessoaId,
              pessoaNome: step.pessoaNome,
              fotoDataUrl: step.fotoDataUrl,
              funcaoId: step.funcaoId,
              funcaoNome: step.funcaoNome,
            })
          }
          onCancelar={() => setStep({ name: "documento" })}
        />
      )}

      {step.name === "assinaturaContrato" && (
        <div className="flex flex-col gap-5 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Assine pra confirmar que você concorda com os termos
          </h1>
          <p className="text-lg text-stone-600">
            Função: <strong>{step.funcaoNome}</strong>
          </p>
          <SignaturePadInput
            confirmLabel="Assinar e começar o turno"
            onConfirm={async (assinaturaDataUrl) => {
              const res = await iniciarTurno(token, {
                pessoaId: step.pessoaId,
                funcaoId: step.funcaoId,
                fotoDataUrl: step.fotoDataUrl,
                assinaturaDataUrl,
              });
              if ("erro" in res) return setStep({ name: "erro", mensagem: res.erro });
              setStep({
                name: "sucessoEntrada",
                pessoaNome: step.pessoaNome,
                funcaoNome: step.funcaoNome,
              });
            }}
          />
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "sucessoEntrada" && (
        <div className="flex flex-col gap-3 items-center">
          <p className="text-6xl">✅</p>
          <h1 className="text-3xl font-semibold text-navy-900">
            Turno iniciado, {step.pessoaNome.split(" ")[0]}!
          </h1>
          <p className="text-xl text-stone-600">Função: {step.funcaoNome}</p>
          <p className="text-lg text-stone-500 mt-2">
            Bom trabalho! Volte aqui e digite seu CPF quando terminar.
          </p>
        </div>
      )}

      {step.name === "fotoSaida" && (
        <div className="flex flex-col gap-5 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Terminando, {step.pessoaNome.split(" ")[0]}? Vamos tirar mais uma foto.
          </h1>
          <p className="text-lg text-stone-500">{INSTRUCAO_FOTO}</p>
          <CameraCapture
            onCapture={(dataUrl) =>
              setStep({
                name: "concluir",
                pessoaId: step.pessoaId,
                pessoaNome: step.pessoaNome,
                turno: step.turno,
                fotoDataUrl: dataUrl,
                telefone: step.telefone,
                endereco: step.endereco,
                numero: step.numero,
                complemento: step.complemento,
                chavePix: step.chavePix,
                tipoChavePix: step.tipoChavePix,
              })
            }
          />
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "concluir" && (
        <TelaConcluir
          token={token}
          pessoaNome={step.pessoaNome}
          turno={step.turno}
          fotoDataUrl={step.fotoDataUrl}
          onConcluido={(minutosArredondados, valorTotal) =>
            setStep({
              name: "sucessoSaida",
              pessoaNome: step.pessoaNome,
              minutosArredondados,
              valorTotal,
            })
          }
          onErro={(mensagem) => setStep({ name: "erro", mensagem })}
          onCancelar={() => setStep({ name: "documento" })}
          onEditar={() =>
            setStep({
              name: "editarDados",
              pessoaId: step.pessoaId,
              pessoaNome: step.pessoaNome,
              telefone: step.telefone,
              endereco: step.endereco,
              numero: step.numero,
              complemento: step.complemento,
              chavePix: step.chavePix,
              tipoChavePix: step.tipoChavePix,
              voltar: step,
            })
          }
        />
      )}

      {step.name === "sucessoSaida" && (
        <div className="flex flex-col gap-3 items-center">
          <p className="text-6xl">🎉</p>
          <h1 className="text-3xl font-semibold text-navy-900">
            Até mais, {step.pessoaNome.split(" ")[0]}!
          </h1>
          <p className="text-xl text-stone-600">
            {Math.floor(step.minutosArredondados / 60)}h
            {String(step.minutosArredondados % 60).padStart(2, "0")}min trabalhadas
          </p>
          <p className="text-4xl font-semibold text-brand-700">
            R$ {step.valorTotal.toFixed(2)}
          </p>
          <p className="text-lg text-stone-500 mt-2">
            O pagamento via PIX será processado em instantes.
          </p>
        </div>
      )}

      {step.name === "editarDados" && (
        <TelaEditarDados
          token={token}
          pessoaId={step.pessoaId}
          pessoaNome={step.pessoaNome}
          dadosIniciais={{
            telefone: step.telefone,
            endereco: step.endereco,
            numero: step.numero,
            complemento: step.complemento,
            chavePix: step.chavePix,
            tipoChavePix: step.tipoChavePix,
          }}
          onSalvo={(dados) =>
            setStep(
              step.voltar.name === "foto" ||
                step.voltar.name === "fotoSaida" ||
                step.voltar.name === "concluir"
                ? { ...step.voltar, ...dados }
                : step.voltar
            )
          }
          onCancelar={() => setStep(step.voltar)}
        />
      )}

      {step.name === "erro" && (
        <div className="flex flex-col gap-4 items-center">
          <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {step.mensagem}
          </p>
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} label="Voltar ao início" />
        </div>
      )}
    </div>
  );
}

function BotaoCancelar({ onClick, label = "Cancelar" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-lg text-stone-500 hover:text-stone-700 underline"
    >
      {label}
    </button>
  );
}

function BotaoEditarDados({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-base text-stone-400 hover:text-stone-600 underline"
    >
      ✏️ Atualizar meus dados
    </button>
  );
}

function TelaDocumento({
  token,
  onResultado,
}: {
  token: string;
  onResultado: (
    res: Awaited<ReturnType<typeof buscarPessoaPorDocumento>>,
    documento: string
  ) => void;
}) {
  const [documento, setDocumento] = useState("");
  const [pending, setPending] = useState(false);
  const digitos = apenasDigitos(documento).length;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await buscarPessoaPorDocumento(token, documento);
    setPending(false);
    onResultado(res, documento);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6 items-center w-full max-w-lg">
      <h1 className="text-4xl font-semibold text-navy-900">Digite seu CPF ou CNPJ</h1>
      <input
        value={documento}
        onChange={(e) => {
          setDocumento(formatarDocumentoAuto(e.target.value));
          tocarBipTeclado();
        }}
        inputMode="numeric"
        placeholder="000.000.000-00"
        // sem autoFocus de propósito: no tablet o teclado só abre com toque
        // do usuário mesmo, e um campo já focado ao carregar a página nunca
        // dispara um novo evento de foco quando a pessoa toca nele — o que
        // impede o reforço de rolagem (TotemKioskGuard) de funcionar nessa
        // tela especificamente.
        maxLength={18}
        className="border-2 border-stone-300 rounded-xl px-6 py-6 text-4xl text-center tracking-wider focus:outline-none focus:ring-4 focus:ring-brand-500 w-full"
      />
      <button
        type="submit"
        disabled={pending || (digitos !== 11 && digitos !== 14)}
        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-2xl font-medium px-8 py-5 disabled:opacity-50 transition-colors w-full"
      >
        {pending ? "Buscando..." : "Continuar"}
      </button>
    </form>
  );
}

function TelaTermos({
  funcaoNome,
  termos,
  onAceitar,
  onCancelar,
}: {
  funcaoNome: string;
  termos: string[];
  onAceitar: () => void;
  onCancelar: () => void;
}) {
  const [aceito, setAceito] = useState(false);

  return (
    <div className="flex flex-col gap-5 items-center w-full max-w-xl">
      <h1 className="text-3xl font-semibold text-navy-900">
        Antes de começar, leia os termos
      </h1>
      <p className="text-lg text-stone-600">
        Função: <strong>{funcaoNome}</strong>
      </p>
      <div className="w-full max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 text-left">
        {termos.map((paragrafo, i) => (
          <p key={i} className="text-lg text-stone-600 mb-4 last:mb-0">
            {paragrafo}
          </p>
        ))}
      </div>
      <label className="flex items-start gap-3 text-left text-lg text-stone-700 w-full">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="mt-1 h-7 w-7 shrink-0 accent-brand-600"
        />
        Li e concordo com os termos acima.
      </label>
      <button
        type="button"
        disabled={!aceito}
        onClick={onAceitar}
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors"
      >
        Continuar para assinatura
      </button>
      <BotaoCancelar onClick={onCancelar} />
    </div>
  );
}

function CamposEndereco({
  endereco,
  setEndereco,
  numero,
  setNumero,
  complemento,
  setComplemento,
}: {
  endereco: string;
  setEndereco: (v: string) => void;
  numero: string;
  setNumero: (v: string) => void;
  complemento: string;
  setComplemento: (v: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Endereço (rua)</label>
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Rua, bairro, cidade"
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 text-left flex-1">
          <label className="text-base text-stone-500">Número</label>
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            inputMode="numeric"
            className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1 text-left flex-1">
          <label className="text-base text-stone-500">Complemento (opcional)</label>
          <input
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Apto, bloco..."
            className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </>
  );
}

function TelaCadastro({
  token,
  documentoInicial,
  onCadastrado,
  onCancelar,
}: {
  token: string;
  documentoInicial: string;
  onCadastrado: (pessoaId: number, pessoaNome: string, dados: DadosPessoa) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState(documentoInicial);
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>("CPF");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    const res = await criarPessoa(token, {
      nome,
      documento,
      telefone,
      endereco,
      numero,
      complemento,
      chavePix,
      tipoChavePix,
    });
    setPending(false);
    if ("erro" in res) return setErro(res.erro);
    onCadastrado(res.pessoaId, res.pessoaNome, {
      telefone,
      endereco,
      numero,
      complemento,
      chavePix,
      tipoChavePix,
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 items-stretch w-full max-w-lg">
      <h1 className="text-3xl font-semibold text-navy-900">
        Primeira vez aqui? Vamos te cadastrar.
      </h1>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Nome completo</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">CPF ou CNPJ</label>
        <input
          value={documento}
          onChange={(e) => setDocumento(formatarDocumentoAuto(e.target.value))}
          inputMode="numeric"
          maxLength={18}
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Telefone (WhatsApp)</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          inputMode="tel"
          placeholder="(11) 91234-5678"
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <CamposEndereco
        endereco={endereco}
        setEndereco={setEndereco}
        numero={numero}
        setNumero={setNumero}
        complemento={complemento}
        setComplemento={setComplemento}
      />

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Chave PIX (pra receber o pagamento)</label>
        <input
          value={chavePix}
          onChange={(e) => {
            const valor = e.target.value;
            setChavePix(valor);
            setTipoChavePix(detectarTipoChavePix(valor));
          }}
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {chavePix.trim() && (
          <p className="text-sm text-stone-400">
            Tipo detectado:{" "}
            <span className="font-medium text-stone-600">
              {LABEL_TIPO_CHAVE_PIX[tipoChavePix]}
            </span>
          </p>
        )}
      </div>

      {erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors mt-1"
      >
        {pending ? "Cadastrando..." : "Cadastrar e continuar"}
      </button>
      <BotaoCancelar onClick={onCancelar} />
    </form>
  );
}

function TelaConcluir({
  token,
  pessoaNome,
  turno,
  fotoDataUrl,
  onConcluido,
  onErro,
  onCancelar,
  onEditar,
}: {
  token: string;
  pessoaNome: string;
  turno: TurnoAberto;
  fotoDataUrl: string;
  onConcluido: (minutosArredondados: number, valorTotal: number) => void;
  onErro: (mensagem: string) => void;
  onCancelar: () => void;
  onEditar: () => void;
}) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMin = Math.floor((agora - new Date(turno.horaEntrada).getTime()) / 60000);

  return (
    <div className="flex flex-col gap-5 items-center w-full max-w-lg">
      <h1 className="text-3xl font-semibold text-navy-900">
        Oi de novo, {pessoaNome.split(" ")[0]}!
      </h1>
      <div className="rounded-xl border border-stone-200 bg-white p-5 w-full text-left">
        <p className="text-lg text-stone-600">
          Função: <strong>{turno.funcaoNome}</strong>
        </p>
        <p className="text-lg text-stone-600">
          Trabalhando há: <strong>{Math.floor(elapsedMin / 60)}h{String(elapsedMin % 60).padStart(2, "0")}min</strong>
        </p>
      </div>
      <p className="text-lg text-stone-600">Assine pra confirmar que terminou o serviço:</p>
      <SignaturePadInput
        confirmLabel="Assinar e encerrar turno"
        onConfirm={async (assinaturaDataUrl) => {
          const res = await concluirTurno(token, {
            turnoId: turno.turnoId,
            fotoDataUrl,
            assinaturaDataUrl,
          });
          if ("erro" in res) return onErro(res.erro);
          onConcluido(res.minutosArredondados, res.valorTotal);
        }}
      />
      <BotaoEditarDados onClick={onEditar} />
      <BotaoCancelar onClick={onCancelar} />
    </div>
  );
}

function TelaEditarDados({
  token,
  pessoaId,
  pessoaNome,
  dadosIniciais,
  onSalvo,
  onCancelar,
}: {
  token: string;
  pessoaId: number;
  pessoaNome: string;
  dadosIniciais: DadosPessoa;
  onSalvo: (dados: DadosPessoa) => void;
  onCancelar: () => void;
}) {
  const [telefone, setTelefone] = useState(dadosIniciais.telefone);
  const [endereco, setEndereco] = useState(dadosIniciais.endereco);
  const [numero, setNumero] = useState(dadosIniciais.numero);
  const [complemento, setComplemento] = useState(dadosIniciais.complemento);
  const [chavePix, setChavePix] = useState(dadosIniciais.chavePix);
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>(dadosIniciais.tipoChavePix);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    const res = await atualizarDadosPessoa(token, {
      pessoaId,
      telefone,
      endereco,
      numero,
      complemento,
      chavePix,
      tipoChavePix,
    });
    setPending(false);
    if ("erro" in res) return setErro(res.erro);
    onSalvo({ telefone, endereco, numero, complemento, chavePix, tipoChavePix });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 items-stretch w-full max-w-lg">
      <h1 className="text-3xl font-semibold text-navy-900">
        Atualizar dados de {pessoaNome.split(" ")[0]}
      </h1>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Telefone (WhatsApp)</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          inputMode="tel"
          autoFocus
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <CamposEndereco
        endereco={endereco}
        setEndereco={setEndereco}
        numero={numero}
        setNumero={setNumero}
        complemento={complemento}
        setComplemento={setComplemento}
      />

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Chave PIX (pra receber o pagamento)</label>
        <input
          value={chavePix}
          onChange={(e) => {
            const valor = e.target.value;
            setChavePix(valor);
            setTipoChavePix(detectarTipoChavePix(valor));
          }}
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {chavePix.trim() && (
          <p className="text-sm text-stone-400">
            Tipo detectado:{" "}
            <span className="font-medium text-stone-600">
              {LABEL_TIPO_CHAVE_PIX[tipoChavePix]}
            </span>
          </p>
        )}
      </div>

      {erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors mt-1"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      <BotaoCancelar onClick={onCancelar} />
    </form>
  );
}
