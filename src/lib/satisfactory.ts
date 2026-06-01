// Núcleo de cálculo da calculadora de fábrica do Satisfactory.
//
// Tudo aqui é puro (sem I/O, sem UI): recebe números, devolve números.
// Portado e reorganizado a partir do satisfactory3.js original, agora com
// funções bem mais "quebradas" para cada pergunta que costumo fazer no jogo:
//   - só o clock (clock necessário para uma meta)
//   - só a saída (quanto sai com N máquinas num clock)
//   - só a entrada (quanto entra com N máquinas num clock)
//   - layout completo a partir da entrada desejada

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const LIMITE_FILEIRA = 1200;
/** Clock padrão da calculadora. Antes era 100%, agora 250% como pedido. */
export const CLOCK_PADRAO = 250;
export const CLOCK_MAX = 250;
export const EPSILON = 1e-9;

export const NORMALIZAR_TAXAS_SATISFACTORY = true;
export const MAX_DENOMINADOR_FRACAO = 240;
export const TOLERANCIA_NORMALIZACAO = 0.0005;

export type TipoClock = "UNDERCLOCK" | "NORMAL" | "OVERCLOCK";

// ---------------------------------------------------------------------------
// Formatação (pt-BR, vírgula decimal)
// ---------------------------------------------------------------------------

export function fmt(valor: number, casas = 3): string {
  return valor.toFixed(casas).replace(".", ",");
}

export function fmtFlex(valor: number, maxCasas = 6): string {
  const texto = valor
    .toFixed(maxCasas)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "");

  return texto.replace(".", ",");
}

/** Texto exato do clock para colar no jogo (mesma regra de sempre). */
export function fmtClockClipboard(valor: number): string {
  return fmtFlex(valor, 6);
}

// ---------------------------------------------------------------------------
// Parsing tolerante (usado pela TUI). Devolve null em vez de lançar erro.
// ---------------------------------------------------------------------------

export function parseNumero(texto: string): number | null {
  const limpo = String(texto).trim().replace(",", ".");
  if (limpo === "") return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

export function parseInteiroPositivo(texto: string): number | null {
  const valor = Number(String(texto).trim());
  if (!Number.isInteger(valor) || valor <= 0) return null;
  return valor;
}

/** Mantém só dígitos — pros campos lidos por `parseInteiroPositivo`. */
export function sanitizarInteiro(texto: string): string {
  return String(texto).replace(/[^0-9]/g, "");
}

/**
 * Mantém dígitos e UM único separador decimal (vírgula ou ponto, o que o usuário
 * digitar primeiro). `parseNumero` aceita os dois e troca a primeira vírgula por
 * ponto, então aqui só garantimos que não entre letra nem um segundo separador.
 */
export function sanitizarDecimal(texto: string): string {
  let saida = "";
  let temSeparador = false;
  for (const ch of String(texto)) {
    if (ch >= "0" && ch <= "9") {
      saida += ch;
    } else if ((ch === "," || ch === ".") && !temSeparador) {
      saida += ch;
      temSeparador = true;
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Blocos de cálculo básicos
// ---------------------------------------------------------------------------

export function capacidadePorMaquina(taxa100: number, clock: number): number {
  return (taxa100 * clock) / 100;
}

export function calcularClockExato(
  metaTotal: number,
  taxa100: number,
  totalMaquinas: number,
): number {
  return (metaTotal / (taxa100 * totalMaquinas)) * 100;
}

export function classificarClock(clock: number): TipoClock {
  if (Math.abs(clock - 100) < EPSILON) return "NORMAL";
  if (clock < 100) return "UNDERCLOCK";
  return "OVERCLOCK";
}

// ---------------------------------------------------------------------------
// Normalização de taxas para frações "redondas" do Satisfactory
// ---------------------------------------------------------------------------

export interface InfoNormalizacao {
  valorOriginal: number;
  valorNormalizado: number;
  ajustado: boolean;
  fracao: string | null;
  erro: number;
}

interface FracaoSimples {
  numerador: number;
  denominador: number;
  aproximado: number;
  erro: number;
}

export function aproximarFracaoSimples(
  valor: number,
  maxDenominador = MAX_DENOMINADOR_FRACAO,
  tolerancia = TOLERANCIA_NORMALIZACAO,
): FracaoSimples | null {
  let melhor: FracaoSimples | null = null;

  for (let denominador = 1; denominador <= maxDenominador; denominador += 1) {
    const numerador = Math.round(valor * denominador);
    const aproximado = numerador / denominador;
    const erro = Math.abs(aproximado - valor);

    if (
      !melhor ||
      erro < melhor.erro - EPSILON ||
      (Math.abs(erro - melhor.erro) < EPSILON &&
        denominador < melhor.denominador)
    ) {
      melhor = { numerador, denominador, aproximado, erro };
    }
  }

  if (melhor && melhor.erro <= tolerancia + EPSILON) {
    return melhor;
  }

  return null;
}

export function normalizarTaxaSatisfactory(valor: number): InfoNormalizacao {
  if (!NORMALIZAR_TAXAS_SATISFACTORY || valor <= 0) {
    return {
      valorOriginal: valor,
      valorNormalizado: valor,
      ajustado: false,
      fracao: null,
      erro: 0,
    };
  }

  const fracao = aproximarFracaoSimples(valor);

  if (!fracao || Math.abs(fracao.aproximado - valor) < EPSILON) {
    return {
      valorOriginal: valor,
      valorNormalizado: valor,
      ajustado: false,
      fracao: null,
      erro: 0,
    };
  }

  return {
    valorOriginal: valor,
    valorNormalizado: fracao.aproximado,
    ajustado: true,
    fracao: `${fracao.numerador}/${fracao.denominador}`,
    erro: fracao.erro,
  };
}

// ---------------------------------------------------------------------------
// 1+2) SÓ A SAÍDA / SÓ A ENTRADA — quanto sai/entra com N máquinas num clock
// ---------------------------------------------------------------------------
//
// Saída e entrada são a MESMA conta (máquinas × taxa/100% × clock); o que muda
// é só o rótulo, que a TaxaScreen escolhe via `ehSaida`. Por isso há um único
// calculador `calcularTaxa` em vez de duas funções idênticas pra manter em sync.

export interface ResultadoTaxa {
  maquinas: number;
  taxa100: number;
  clock: number;
  tipoClock: TipoClock;
  porMaquina: number;
  total: number;
}

export function calcularTaxa(
  maquinas: number,
  taxa100: number,
  clock: number,
): ResultadoTaxa {
  const porMaquina = capacidadePorMaquina(taxa100, clock);
  return {
    maquinas,
    taxa100,
    clock,
    tipoClock: classificarClock(clock),
    porMaquina,
    total: porMaquina * maquinas,
  };
}

// ---------------------------------------------------------------------------
// 3) SÓ O CLOCK — clock necessário para bater uma meta de produção
// ---------------------------------------------------------------------------

export interface ResultadoMetaClock {
  totalMaquinas: number;
  saida100: number;
  metaTotal: number;
  metaPorMaquina: number;
  producaoTotalEm100: number;
  clockNecessario: number;
  tipoClock: TipoClock;
  possivelNoLimite: boolean;
  producaoMaximaNoLimite: number;
  faltariaNoMax: number;
  maquinasMinimasNoMax: number;
  maquinasAdicionaisNecessarias: number;
  excessoDeClock: number;
}

export function calcularClockParaMeta(
  totalMaquinas: number,
  saida100: number,
  metaTotal: number,
): ResultadoMetaClock {
  const producaoTotalEm100 = totalMaquinas * saida100;
  const metaPorMaquina = metaTotal / totalMaquinas;
  const clockNecessario = calcularClockExato(metaTotal, saida100, totalMaquinas);
  const tipoClock = classificarClock(clockNecessario);
  const possivelNoLimite = clockNecessario > 0 && clockNecessario <= CLOCK_MAX;

  const capacidadeMaximaPorMaquina = capacidadePorMaquina(saida100, CLOCK_MAX);
  const producaoMaximaNoLimite = totalMaquinas * capacidadeMaximaPorMaquina;
  const faltariaNoMax = Math.max(0, metaTotal - producaoMaximaNoLimite);
  const maquinasMinimasNoMax = Math.ceil(metaTotal / capacidadeMaximaPorMaquina);
  const maquinasAdicionaisNecessarias = Math.max(
    0,
    maquinasMinimasNoMax - totalMaquinas,
  );
  const excessoDeClock = Math.max(0, clockNecessario - CLOCK_MAX);

  return {
    totalMaquinas,
    saida100,
    metaTotal,
    metaPorMaquina,
    producaoTotalEm100,
    clockNecessario,
    tipoClock,
    possivelNoLimite,
    producaoMaximaNoLimite,
    faltariaNoMax,
    maquinasMinimasNoMax,
    maquinasAdicionaisNecessarias,
    excessoDeClock,
  };
}

// ---------------------------------------------------------------------------
// 4) LAYOUT COMPLETO a partir da entrada desejada
// ---------------------------------------------------------------------------

export interface ResultadoLayout {
  metaEntradaTotal: number;
  entrada100: number;
  fileiras: number;
  clockEscolhido: number;
  entradaAlvoPorFileira: number;
  entradaPorMaquinaNoClockEscolhido: number;
  maquinasPorFileiraExatas: number;
  maquinasPorFileiraMinimas: number;
  totalMaquinas: number;
  entradaPorFileiraNoClockEscolhido: number;
  entradaTotalNoClockEscolhido: number;
  excessoEntradaNoClockEscolhido: number;
  clockExato: number;
  entradaPorMaquinaNoClockExato: number;
  entradaPorFileiraNoClockExato: number;
  // saída opcional
  saida100?: number;
  saidaPorMaquinaNoClockEscolhido?: number;
  saidaPorFileiraNoClockEscolhido?: number;
  saidaTotalNoClockEscolhido?: number;
  saidaPorMaquinaNoClockExato?: number;
  saidaPorFileiraNoClockExato?: number;
  saidaTotalNoClockExato?: number;
}

export function calcularLayoutPorEntrada(
  metaEntradaTotal: number,
  entrada100: number,
  fileiras: number,
  clockEscolhido: number,
  saida100: number | null = null,
): ResultadoLayout {
  if (metaEntradaTotal <= 0) {
    throw new Error("A entrada total desejada deve ser maior que zero.");
  }
  if (entrada100 <= 0) {
    throw new Error("A entrada por máquina a 100% deve ser maior que zero.");
  }
  if (fileiras <= 0) {
    throw new Error("A quantidade de fileiras deve ser maior que zero.");
  }
  if (clockEscolhido <= 0 || clockEscolhido > CLOCK_MAX) {
    throw new Error(`O clock deve ser maior que 0 e menor ou igual a ${CLOCK_MAX}.`);
  }
  if (saida100 !== null && saida100 <= 0) {
    throw new Error("A saída por máquina a 100% deve ser maior que zero.");
  }

  const entradaAlvoPorFileira = metaEntradaTotal / fileiras;

  if (entradaAlvoPorFileira > LIMITE_FILEIRA + EPSILON) {
    throw new Error(
      `Cada fileira precisaria receber ${fmtFlex(entradaAlvoPorFileira)} itens/min, ` +
        `mas o limite é ${LIMITE_FILEIRA} itens/min por fileira. Aumente o número de fileiras.`,
    );
  }

  const entradaPorMaquinaNoClockEscolhido = capacidadePorMaquina(
    entrada100,
    clockEscolhido,
  );

  if (entradaPorMaquinaNoClockEscolhido <= 0) {
    throw new Error("A entrada por máquina no clock informado é inválida.");
  }

  const maquinasPorFileiraExatas =
    entradaAlvoPorFileira / entradaPorMaquinaNoClockEscolhido;
  const maquinasPorFileiraMinimas = Math.ceil(maquinasPorFileiraExatas);

  const entradaPorFileiraNoClockEscolhido =
    maquinasPorFileiraMinimas * entradaPorMaquinaNoClockEscolhido;

  // Não checamos `entradaPorFileiraNoClockEscolhido` contra o limite da fileira:
  // esse valor é só o que entraria SE rodássemos no clock-teto escolhido, antes
  // do ajuste fino. A operação recomendada é no `clockExato` (o valor que vai pro
  // jogo), onde a fileira carrega exatamente `meta/fileiras = entradaAlvoPorFileira`,
  // já validado acima contra LIMITE_FILEIRA. Arredondar as máquinas pra cima só
  // gera excesso no clock-teto (mostrado como "Excesso no clock"), nunca estoura a
  // esteira no clock exato. Checar o clock-teto aqui era um falso positivo
  // (ex.: meta 2400, 45/máq, 2 fileiras → 1237,5 no teto, mas 1200 no exato).

  const totalMaquinas = maquinasPorFileiraMinimas * fileiras;
  const entradaTotalNoClockEscolhido =
    totalMaquinas * entradaPorMaquinaNoClockEscolhido;
  const excessoEntradaNoClockEscolhido =
    entradaTotalNoClockEscolhido - metaEntradaTotal;

  const clockExato = calcularClockExato(metaEntradaTotal, entrada100, totalMaquinas);
  const entradaPorMaquinaNoClockExato = capacidadePorMaquina(entrada100, clockExato);
  const entradaPorFileiraNoClockExato =
    maquinasPorFileiraMinimas * entradaPorMaquinaNoClockExato;

  const resultado: ResultadoLayout = {
    metaEntradaTotal,
    entrada100,
    fileiras,
    clockEscolhido,
    entradaAlvoPorFileira,
    entradaPorMaquinaNoClockEscolhido,
    maquinasPorFileiraExatas,
    maquinasPorFileiraMinimas,
    totalMaquinas,
    entradaPorFileiraNoClockEscolhido,
    entradaTotalNoClockEscolhido,
    excessoEntradaNoClockEscolhido,
    clockExato,
    entradaPorMaquinaNoClockExato,
    entradaPorFileiraNoClockExato,
  };

  if (saida100 !== null) {
    const saidaPorMaquinaNoClockEscolhido = capacidadePorMaquina(
      saida100,
      clockEscolhido,
    );
    const saidaPorMaquinaNoClockExato = capacidadePorMaquina(saida100, clockExato);

    resultado.saida100 = saida100;
    resultado.saidaPorMaquinaNoClockEscolhido = saidaPorMaquinaNoClockEscolhido;
    resultado.saidaPorFileiraNoClockEscolhido =
      maquinasPorFileiraMinimas * saidaPorMaquinaNoClockEscolhido;
    resultado.saidaTotalNoClockEscolhido =
      totalMaquinas * saidaPorMaquinaNoClockEscolhido;
    resultado.saidaPorMaquinaNoClockExato = saidaPorMaquinaNoClockExato;
    resultado.saidaPorFileiraNoClockExato =
      maquinasPorFileiraMinimas * saidaPorMaquinaNoClockExato;
    resultado.saidaTotalNoClockExato = totalMaquinas * saidaPorMaquinaNoClockExato;
  }

  return resultado;
}

/**
 * Número mínimo de fileiras recomendado para o cálculo "fechar": cada fileira
 * recebe no máximo {@link LIMITE_FILEIRA} itens/min, então precisamos de pelo
 * menos `ceil(meta / LIMITE_FILEIRA)` fileiras. Devolve null se a meta for
 * inválida (<= 0).
 */
export function fileirasMinimasRecomendadas(metaEntradaTotal: number): number | null {
  if (!Number.isFinite(metaEntradaTotal) || metaEntradaTotal <= 0) return null;
  return Math.max(1, Math.ceil(metaEntradaTotal / LIMITE_FILEIRA));
}
