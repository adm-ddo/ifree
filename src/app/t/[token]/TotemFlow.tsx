"use client";

import { useEffect, useRef, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import SignaturePadInput from "@/components/SignaturePadInput";
import { Logo } from "@/components/Logo";
import TotemKioskGuard from "@/components/TotemKioskGuard";
import TotemDenunciaOverlay from "./TotemDenunciaOverlay";
import {
  buscarPessoaPorDocumento,
  criarPessoa,
  iniciarTurno,
  concluirTurno,
  atualizarDadosPessoa,
  confirmarIdentidadeConecta,
  baterPontoClt,
  avaliarEmpresaPeloExtra,
  type RegistroAbertoClt,
} from "./actions";
import {
  apenasDigitos,
  formatarDocumentoAuto,
  detectarTipoChavePix,
  LABEL_TIPO_CHAVE_PIX,
} from "@/lib/documento";
import { acoesPossiveisPonto, LABEL_ACAO_PONTO, type AcaoPonto } from "@/lib/ponto";
import { tocarBipTeclado } from "@/lib/somTeclado";
import { formatarHora } from "@/lib/data";
import { TAGS_EXTRA_AVALIA_EMPRESA } from "@/lib/avaliacao";
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
  | {
      name: "confirmarIdentidade";
      pessoaId: number;
      pessoaNome: string;
      segundoFator: "DATA_NASCIMENTO" | "EMAIL";
    }
  | ({
      name: "foto";
      pessoaId: number;
      pessoaNome: string;
      ultimaFuncaoId: number | null;
      perfilIncompleto?: boolean;
    } & DadosPessoa)
  | ({
      name: "avisoConflito";
      pessoaId: number;
      pessoaNome: string;
      ultimaFuncaoId: number | null;
      desdeQuando: string;
      perfilIncompleto?: boolean;
    } & DadosPessoa)
  | {
      name: "funcao";
      pessoaId: number;
      pessoaNome: string;
      fotoDataUrl: string;
      ultimaFuncaoId: number | null;
    }
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
  | {
      name: "avaliarEmpresa";
      pessoaNome: string;
      turnoId: number;
      minutosArredondados: number;
      valorTotal: number;
    }
  | { name: "sucessoSaida"; pessoaNome: string; minutosArredondados: number; valorTotal: number }
  | ({
      name: "editarDados";
      pessoaId: number;
      pessoaNome: string;
      voltar: Step;
      perfilIncompleto?: boolean;
    } & DadosPessoa)
  | {
      name: "cltEscolha";
      pessoaId: number;
      pessoaNome: string;
      registroAberto: RegistroAbertoClt;
      acoes: AcaoPonto[];
    }
  | ({
      name: "cltOuExtra";
      pessoaId: number;
      pessoaNome: string;
      registroAberto: RegistroAbertoClt | null;
      intervaloHabilitado: boolean;
      ultimaFuncaoId: number | null;
    } & DadosPessoa)
  | {
      name: "cltFoto";
      pessoaId: number;
      pessoaNome: string;
      acao: AcaoPonto;
    }
  | { name: "cltSucesso"; pessoaNome: string; acao: AcaoPonto }
  | { name: "erro"; mensagem: string }
  | { name: "denuncia" };

const RESET_MS = 8000;

export default function TotemFlow({
  token,
  empresaNome,
  funcoes,
  termos,
  tokenDenuncia,
}: {
  token: string;
  empresaNome: string;
  funcoes: Funcao[];
  termos: string[];
  tokenDenuncia: string;
}) {
  const [step, setStep] = useState<Step>({ name: "documento" });

  // Telas de sucesso voltam sozinhas pro início — é um kiosk, não tem
  // ninguém pra clicar "concluir" depois que a pessoa já saiu de perto.
  useEffect(() => {
    if (step.name !== "sucessoEntrada" && step.name !== "sucessoSaida" && step.name !== "cltSucesso") return;
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

  // Compartilhado entre o ramo CLT normal e o botão "Bater ponto CLT" da
  // tela cltOuExtra — decide se pula direto pra cltFoto (só uma ação
  // possível) ou passa pela cltEscolha (2+ ações, ex.: intervalo).
  function irParaClt(
    pessoaId: number,
    pessoaNome: string,
    registroAberto: RegistroAbertoClt | null,
    intervaloHabilitado: boolean
  ) {
    const acoes = acoesPossiveisPonto(registroAberto, intervaloHabilitado);
    if (acoes.length === 1) {
      setStep({ name: "cltFoto", pessoaId, pessoaNome, acao: acoes[0] });
      return;
    }
    // registroAberto nunca é null quando há mais de uma ação possível —
    // acoesPossiveisPonto só devolve 2+ ações no ramo que já pressupõe um
    // registro aberto.
    setStep({ name: "cltEscolha", pessoaId, pessoaNome, registroAberto: registroAberto!, acoes });
  }

  return (
    <div
      className={`flex flex-1 flex-col items-center gap-8 text-center py-8 ${
        telaDocumento ? "justify-start pt-10 sm:pt-16" : "justify-center"
      }`}
    >
      <TotemKioskGuard />
      {step.name !== "denuncia" && (
        <button
          type="button"
          onClick={() => setStep({ name: "denuncia" })}
          className="fixed top-3 left-3 z-20 rounded-full bg-navy-900/80 text-white text-xs px-3 py-2 shadow-lg"
        >
          📢 Denúncia
        </button>
      )}
      <div className="flex flex-col items-center gap-1">
        <Logo size={44} />
        <p className="text-lg text-stone-500">{empresaNome}</p>
      </div>

      {step.name === "denuncia" && (
        <TotemDenunciaOverlay tokenDenuncia={tokenDenuncia} aoVoltar={() => setStep({ name: "documento" })} />
      )}

      {step.name === "documento" && (
        <TelaDocumento
          onResultado={(res, documento) => {
            if ("erro" in res) return setStep({ name: "erro", mensagem: res.erro });
            if (!res.encontrada) return setStep({ name: "cadastro", documento });
            if (res.tipo === "CLT") {
              return irParaClt(res.pessoaId, res.pessoaNome, res.registroAberto, res.intervaloHabilitado);
            }
            if (res.tipo === "CLT_OU_EXTRA") {
              return setStep({
                name: "cltOuExtra",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                registroAberto: res.registroAberto,
                intervaloHabilitado: res.intervaloHabilitado,
                ultimaFuncaoId: res.ultimaFuncaoId,
                telefone: res.telefone,
                endereco: res.endereco,
                numero: res.numero,
                complemento: res.complemento,
                chavePix: res.chavePix,
                tipoChavePix: res.tipoChavePix,
              });
            }
            if (res.tipo === "PRECISA_CONFIRMAR_IDENTIDADE") {
              return setStep({
                name: "confirmarIdentidade",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                segundoFator: res.segundoFator,
              });
            }
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
            } else if (res.conflitoOutroLocal) {
              setStep({
                name: "avisoConflito",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                ultimaFuncaoId: res.ultimaFuncaoId,
                desdeQuando: res.conflitoOutroLocal.desde,
                perfilIncompleto: res.perfilIncompleto,
                ...dadosPessoa,
              });
            } else {
              setStep({
                name: "foto",
                pessoaId: res.pessoaId,
                pessoaNome: res.pessoaNome,
                perfilIncompleto: res.perfilIncompleto,
                ultimaFuncaoId: res.ultimaFuncaoId,
                ...dadosPessoa,
              });
            }
          }}
          token={token}
        />
      )}

      {step.name === "confirmarIdentidade" && (
        <TelaConfirmarIdentidade
          token={token}
          pessoaId={step.pessoaId}
          pessoaNome={step.pessoaNome}
          segundoFator={step.segundoFator}
          onConfirmado={(dados) => {
            if (dados.conflitoOutroLocal) {
              setStep({
                name: "avisoConflito",
                pessoaId: dados.pessoaId,
                pessoaNome: dados.pessoaNome,
                ultimaFuncaoId: dados.ultimaFuncaoId,
                desdeQuando: dados.conflitoOutroLocal.desde,
                perfilIncompleto: dados.perfilIncompleto,
                telefone: dados.telefone,
                endereco: dados.endereco,
                numero: dados.numero,
                complemento: dados.complemento,
                chavePix: dados.chavePix,
                tipoChavePix: dados.tipoChavePix,
              });
            } else {
              setStep({
                name: "foto",
                pessoaId: dados.pessoaId,
                pessoaNome: dados.pessoaNome,
                ultimaFuncaoId: dados.ultimaFuncaoId,
                perfilIncompleto: dados.perfilIncompleto,
                telefone: dados.telefone,
                endereco: dados.endereco,
                numero: dados.numero,
                complemento: dados.complemento,
                chavePix: dados.chavePix,
                tipoChavePix: dados.tipoChavePix,
              });
            }
          }}
          onCancelar={() => setStep({ name: "documento" })}
        />
      )}

      {step.name === "cadastro" && (
        <TelaCadastro
          token={token}
          documentoInicial={step.documento}
          onCadastrado={(pessoaId, pessoaNome, dadosPessoa) =>
            setStep({ name: "foto", pessoaId, pessoaNome, ultimaFuncaoId: null, ...dadosPessoa })
          }
          onCancelar={() => setStep({ name: "documento" })}
        />
      )}

      {step.name === "avisoConflito" && (
        <div className="flex flex-col gap-5 items-center w-full max-w-lg">
          <p className="text-5xl">⚠️</p>
          <h1 className="text-3xl font-semibold text-navy-900">
            Atenção, {step.pessoaNome.split(" ")[0]}!
          </h1>
          <p className="text-lg text-stone-600">
            Você ainda está com um turno em aberto desde{" "}
            <strong>{formatarHora(new Date(step.desdeQuando))}</strong> em outro
            lugar. Não é possível abrir um turno novo aqui antes de fechar esse — fale com o responsável de lá
            pra encerrar o turno em aberto.
          </p>
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} label="Voltar ao início" />
        </div>
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
                ultimaFuncaoId: step.ultimaFuncaoId,
              })
            }
          />
          <BotaoEditarDados
            perfilIncompleto={step.perfilIncompleto}
            onClick={() =>
              setStep({
                name: "editarDados",
                pessoaId: step.pessoaId,
                pessoaNome: step.pessoaNome,
                perfilIncompleto: step.perfilIncompleto,
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
        <TelaFuncao
          funcoes={funcoes}
          ultimaFuncaoId={step.ultimaFuncaoId}
          onEscolher={(f) =>
            setStep({
              name: "termos",
              pessoaId: step.pessoaId,
              pessoaNome: step.pessoaNome,
              fotoDataUrl: step.fotoDataUrl,
              funcaoId: f.id,
              funcaoNome: f.nome,
            })
          }
          onCancelar={() => setStep({ name: "documento" })}
        />
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
              name: "avaliarEmpresa",
              pessoaNome: step.pessoaNome,
              turnoId: step.turno.turnoId,
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

      {step.name === "avaliarEmpresa" && (
        <TelaAvaliarEmpresa
          pessoaNome={step.pessoaNome}
          onFinalizar={(nota, tags) => {
            if (nota !== null) {
              avaliarEmpresaPeloExtra(step.turnoId, nota, tags).catch(() => {});
            }
            setStep({
              name: "sucessoSaida",
              pessoaNome: step.pessoaNome,
              minutosArredondados: step.minutosArredondados,
              valorTotal: step.valorTotal,
            });
          }}
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
          perfilIncompleto={step.perfilIncompleto ?? false}
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

      {step.name === "cltOuExtra" && (
        <div className="flex flex-col gap-4 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Oi, {step.pessoaNome.split(" ")[0]}! O que você vai fazer agora?
          </h1>
          <button
            onClick={() =>
              irParaClt(step.pessoaId, step.pessoaNome, step.registroAberto, step.intervaloHabilitado)
            }
            className="w-full rounded-xl border border-stone-300 bg-white hover:border-brand-400 hover:bg-brand-50 px-6 py-5 text-xl font-medium text-navy-900 transition-colors"
          >
            🕒 Bater ponto normal
          </button>
          <button
            onClick={() =>
              setStep({
                name: "foto",
                pessoaId: step.pessoaId,
                pessoaNome: step.pessoaNome,
                ultimaFuncaoId: step.ultimaFuncaoId,
                telefone: step.telefone,
                endereco: step.endereco,
                numero: step.numero,
                complemento: step.complemento,
                chavePix: step.chavePix,
                tipoChavePix: step.tipoChavePix,
              })
            }
            className="w-full rounded-xl border border-stone-300 bg-white hover:border-brand-400 hover:bg-brand-50 px-6 py-5 text-xl font-medium text-navy-900 transition-colors"
          >
            💰 Fazer um extra pago hoje
          </button>
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "cltEscolha" && (
        <div className="flex flex-col gap-4 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            Oi, {step.pessoaNome.split(" ")[0]}! O que você quer fazer?
          </h1>
          {step.acoes.map((acao) => (
            <button
              key={acao}
              onClick={() =>
                setStep({ name: "cltFoto", pessoaId: step.pessoaId, pessoaNome: step.pessoaNome, acao })
              }
              className="w-full rounded-xl border border-stone-300 bg-white hover:border-brand-400 hover:bg-brand-50 px-6 py-5 text-xl font-medium text-navy-900 transition-colors"
            >
              {LABEL_ACAO_PONTO[acao]}
            </button>
          ))}
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "cltFoto" && (
        <div className="flex flex-col gap-5 items-center w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-navy-900">
            {LABEL_ACAO_PONTO[step.acao]}, {step.pessoaNome.split(" ")[0]}? Vamos tirar uma foto.
          </h1>
          <p className="text-lg text-stone-500">{INSTRUCAO_FOTO}</p>
          <CameraCapture
            onCapture={async (dataUrl) => {
              const res = await baterPontoClt(token, {
                pessoaId: step.pessoaId,
                fotoDataUrl: dataUrl,
                acao: step.acao,
              });
              if ("erro" in res) return setStep({ name: "erro", mensagem: res.erro });
              setStep({ name: "cltSucesso", pessoaNome: step.pessoaNome, acao: res.acao });
            }}
          />
          <BotaoCancelar onClick={() => setStep({ name: "documento" })} />
        </div>
      )}

      {step.name === "cltSucesso" && (
        <div className="flex flex-col gap-3 items-center">
          <p className="text-6xl">✅</p>
          <h1 className="text-3xl font-semibold text-navy-900">
            {LABEL_ACAO_PONTO[step.acao]} registrada, {step.pessoaNome.split(" ")[0]}!
          </h1>
          <p className="text-lg text-stone-500 mt-2">
            {step.acao === "SAIDA_FINAL"
              ? "Até a próxima!"
              : "Bom trabalho! Volte aqui na próxima marcação."}
          </p>
        </div>
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

function BotaoEditarDados({ onClick, perfilIncompleto }: { onClick: () => void; perfilIncompleto?: boolean }) {
  if (perfilIncompleto) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-base text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
      >
        ⚠️ Complete seu cadastro (e-mail ou nascimento)
      </button>
    );
  }
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

/** Se a pessoa já trabalhou nesta empresa antes, sugere de cara a última
 * função que ela exerceu — ela só vê a lista completa se quiser trocar.
 * `mostrarTodas` começa `false` só quando existe sugestão válida; sem
 * sugestão (pessoa nova, ou a função de antes foi desativada), pula direto
 * pra lista, sem tela a mais no meio do caminho. */
function TelaFuncao({
  funcoes,
  ultimaFuncaoId,
  onEscolher,
  onCancelar,
}: {
  funcoes: Funcao[];
  ultimaFuncaoId: number | null;
  onEscolher: (funcao: Funcao) => void;
  onCancelar: () => void;
}) {
  const funcaoSugerida = funcoes.find((f) => f.id === ultimaFuncaoId) ?? null;
  const [mostrarTodas, setMostrarTodas] = useState(!funcaoSugerida);

  if (funcaoSugerida && !mostrarTodas) {
    return (
      <div className="flex flex-col gap-4 items-center w-full max-w-lg">
        <h1 className="text-3xl font-semibold text-navy-900">
          Vai trabalhar como sempre?
        </h1>
        <button
          onClick={() => onEscolher(funcaoSugerida)}
          className="w-full rounded-xl border-2 border-brand-400 bg-brand-50 hover:bg-brand-100 px-6 py-6 text-left transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-1">
            Sua função de sempre
          </p>
          <p className="text-2xl font-medium text-navy-900">{funcaoSugerida.nome}</p>
          <p className="text-base text-stone-500">
            R$ {funcaoSugerida.valorHoraPadrao.toFixed(2)}/hora
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMostrarTodas(true)}
          className="text-lg text-stone-500 hover:text-stone-700 underline"
        >
          Hoje é outra função
        </button>
        <BotaoCancelar onClick={onCancelar} />
      </div>
    );
  }

  return (
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
          onClick={() => onEscolher(f)}
          className="w-full rounded-xl border border-stone-300 bg-white hover:border-brand-400 hover:bg-brand-50 px-6 py-5 text-left transition-colors"
        >
          <p className="text-xl font-medium text-navy-900">{f.nome}</p>
          <p className="text-base text-stone-500">
            R$ {f.valorHoraPadrao.toFixed(2)}/hora
          </p>
        </button>
      ))}
      <BotaoCancelar onClick={onCancelar} />
    </div>
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
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
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
      email: email.trim() || undefined,
      dataNascimento: dataNascimento.trim() || undefined,
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

      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm text-stone-500 text-left">
          E-mail ou data de nascimento (opcional, só um dos dois já ajuda) — evita que seu cadastro fique
          bloqueado se você um dia trabalhar em outra empresa pelo iFREE.
        </p>
        <div className="flex flex-col gap-1 text-left">
          <label className="text-base text-stone-500">E-mail (opcional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="seuemail@exemplo.com"
            className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <label className="text-base text-stone-500">Data de nascimento (opcional)</label>
          <input
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            type="date"
            className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
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

/** Avalia a empresa onde o turno acabou de acontecer — nota 1-5 + tags
 * rápidas, opcional (o kiosk nunca pode travar quem não quer avaliar).
 * `onFinalizar(null, [])` quando a pessoa pula; sempre segue pra
 * sucessoSaida em seguida, com ou sem avaliação enviada. */
function TelaAvaliarEmpresa({
  pessoaNome,
  onFinalizar,
}: {
  pessoaNome: string;
  onFinalizar: (nota: number | null, tags: string[]) => void;
}) {
  const [nota, setNota] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  function alternarTag(tag: string) {
    setTags((atuais) => (atuais.includes(tag) ? atuais.filter((t) => t !== tag) : [...atuais, tag]));
  }

  return (
    <div className="flex flex-col gap-6 items-center w-full max-w-lg">
      <h1 className="text-3xl font-semibold text-navy-900">
        {pessoaNome.split(" ")[0]}, como foi o turno de hoje?
      </h1>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            className="text-5xl leading-none transition-transform active:scale-90"
          >
            <span className={n <= nota ? "text-amber-400" : "text-stone-300"}>★</span>
          </button>
        ))}
      </div>
      {nota > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {TAGS_EXTRA_AVALIA_EMPRESA.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => alternarTag(tag.label)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                tags.includes(tag.label)
                  ? tag.sentimento === "BOA"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : tag.sentimento === "MEDIA"
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-red-400 bg-red-50 text-red-700"
                  : "border-stone-300 text-stone-600 hover:border-stone-400"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 w-full">
        <button
          type="button"
          disabled={nota === 0}
          onClick={() => onFinalizar(nota, tags)}
          className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xl font-medium py-4 disabled:opacity-40 transition-colors"
        >
          Enviar avaliação
        </button>
        <button
          type="button"
          onClick={() => onFinalizar(null, [])}
          className="text-base text-stone-500 hover:text-stone-700 underline py-1"
        >
          Pular
        </button>
      </div>
    </div>
  );
}

/** Pede confirmação da chave PIX + um segundo fator (data de nascimento,
 * ou e-mail se a pessoa nunca preencheu data de nascimento) antes de
 * liberar os dados dela numa empresa onde nunca trabalhou — ver
 * confirmarIdentidadeConecta e o comentário em ResultadoBusca (actions.ts)
 * pro motivo. Não mostra nem sugere os valores certos, só recebe o que a
 * pessoa digitar. Errar 3 vezes bloqueia o acesso nesta empresa (mensagem
 * de erro final avisa isso). */
function TelaConfirmarIdentidade({
  token,
  pessoaId,
  pessoaNome,
  segundoFator,
  onConfirmado,
  onCancelar,
}: {
  token: string;
  pessoaId: number;
  pessoaNome: string;
  segundoFator: "DATA_NASCIMENTO" | "EMAIL";
  onConfirmado: (
    dados: Extract<Awaited<ReturnType<typeof confirmarIdentidadeConecta>>, { sucesso: true }>
  ) => void;
  onCancelar: () => void;
}) {
  const [chavePix, setChavePix] = useState("");
  const [segundoFatorValor, setSegundoFatorValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    const res = await confirmarIdentidadeConecta(token, pessoaId, chavePix, segundoFatorValor);
    setPending(false);
    if ("erro" in res) return setErro(res.erro);
    onConfirmado(res);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 items-stretch w-full max-w-lg">
      <h1 className="text-3xl font-semibold text-navy-900">
        Já conhecemos você, {pessoaNome.split(" ")[0]}!
      </h1>
      <p className="text-base text-stone-500 -mt-2">
        Como é sua primeira vez nesta empresa, confirme 2 dados do seu cadastro no iFREE Conecta pra continuar.
      </p>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">Sua chave PIX cadastrada</label>
        <input
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          autoFocus
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-base text-stone-500">
          {segundoFator === "DATA_NASCIMENTO" ? "Sua data de nascimento" : "Seu e-mail cadastrado"}
        </label>
        <input
          value={segundoFatorValor}
          onChange={(e) => setSegundoFatorValor(e.target.value)}
          type={segundoFator === "DATA_NASCIMENTO" ? "date" : "email"}
          className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {erro && (
        <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</p>
      )}

      <button
        type="submit"
        disabled={pending || !chavePix.trim() || !segundoFatorValor.trim()}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xl font-medium py-4 disabled:opacity-50 transition-colors mt-1"
      >
        {pending ? "Confirmando..." : "Confirmar"}
      </button>
      <BotaoCancelar onClick={onCancelar} />
    </form>
  );
}

function TelaEditarDados({
  token,
  pessoaId,
  pessoaNome,
  perfilIncompleto,
  dadosIniciais,
  onSalvo,
  onCancelar,
}: {
  token: string;
  pessoaId: number;
  pessoaNome: string;
  perfilIncompleto: boolean;
  dadosIniciais: DadosPessoa;
  onSalvo: (dados: DadosPessoa) => void;
  onCancelar: () => void;
}) {
  const [telefone, setTelefone] = useState(dadosIniciais.telefone);
  const [endereco, setEndereco] = useState(dadosIniciais.endereco);
  const [numero, setNumero] = useState(dadosIniciais.numero);
  const [complemento, setComplemento] = useState(dadosIniciais.complemento);
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
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
      email: email.trim() || undefined,
      dataNascimento: dataNascimento.trim() || undefined,
    });
    setPending(false);
    if ("erro" in res) return setErro(res.erro);
    // chavePix/tipoChavePix não são editáveis aqui (só pelo cadastro no
    // iFREE Conecta) — repassa sem alterar pro step que chamou esta tela.
    onSalvo({
      telefone,
      endereco,
      numero,
      complemento,
      chavePix: dadosIniciais.chavePix,
      tipoChavePix: dadosIniciais.tipoChavePix,
    });
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

      {perfilIncompleto && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="text-base text-amber-800">
            ⚠️ Complete com e-mail ou data de nascimento (só um dos dois já ajuda) — sem isso, se você
            trabalhar em outra empresa pelo iFREE, seu cadastro pode ficar bloqueado lá até o responsável
            liberar na mão.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-base text-stone-500">E-mail (opcional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="seuemail@exemplo.com"
              className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-base text-stone-500">Data de nascimento (opcional)</label>
            <input
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              type="date"
              className="border border-stone-300 rounded-lg px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      )}

      <p className="text-sm text-stone-400 text-left -mb-1">
        Pra mudar sua chave PIX ou seu e-mail já cadastrado, acesse seu cadastro no iFREE Conecta (fora do
        totem).
      </p>

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
