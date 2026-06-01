// Calculation core of the Satisfactory factory calculator.
//
// Everything here is pure (no I/O, no UI): numbers in, numbers out.
// Ported and reorganized from the original satisfactory3.js, now broken into
// much smaller functions, one per question I usually ask in the game:
//   - just the clock (clock needed to hit a target)
//   - just the output (how much N machines produce at a clock)
//   - just the input (how much N machines consume at a clock)
//   - full layout from the desired input
//
// Note: the calculation functions and their related identifiers keep their
// Portuguese names on purpose; only comments and messages are in English.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LIMITE_FILEIRA = 1200;
/** Calculator default clock. It used to be 100%, now 250% as requested. */
export const CLOCK_PADRAO = 250;
export const CLOCK_MAX = 250;
export const EPSILON = 1e-9;

export const NORMALIZAR_TAXAS_SATISFACTORY = true;
export const MAX_DENOMINADOR_FRACAO = 240;
export const TOLERANCIA_NORMALIZACAO = 0.0005;

export type TipoClock = "UNDERCLOCK" | "NORMAL" | "OVERCLOCK";

// ---------------------------------------------------------------------------
// Typed layout errors
// ---------------------------------------------------------------------------
//
// The core stays locale-free: instead of throwing a human (Portuguese) string,
// `calcularLayoutPorEntrada` throws a `LayoutError` carrying a stable `code`
// plus any numbers needed to phrase it. The UI (`LayoutScreen`) turns the code
// into a translated message via the i18n `layout.errors` table.

export type LayoutErrorCode =
  | "targetNonPositive"
  | "inputNonPositive"
  | "rowsNonPositive"
  | "clockOutOfRange"
  | "outputNonPositive"
  | "rowLimitExceeded"
  | "inputPerMachineInvalid";

export interface LayoutErrorData {
  code: LayoutErrorCode;
  /** clock ceiling, for `clockOutOfRange` */
  max?: number;
  /** items/min each row would receive, for `rowLimitExceeded` */
  perRow?: number;
  /** per-row item limit, for `rowLimitExceeded` */
  limit?: number;
}

export class LayoutError extends Error {
  readonly data: LayoutErrorData;
  constructor(data: LayoutErrorData) {
    super(data.code);
    this.name = "LayoutError";
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Formatting (pt-BR, comma decimal)
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

/** Exact clock text to paste into the game (same rule as always). */
export function fmtClockClipboard(valor: number): string {
  return fmtFlex(valor, 6);
}

// ---------------------------------------------------------------------------
// Tolerant parsing (used by the TUI). Returns null instead of throwing.
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

/** Keeps digits only — for fields read by `parseInteiroPositivo`. */
export function sanitizarInteiro(texto: string): string {
  return String(texto).replace(/[^0-9]/g, "");
}

/**
 * Keeps digits and ONE decimal separator (comma or dot, whichever the user
 * types first). `parseNumero` accepts both and swaps the first comma for a dot,
 * so here we only make sure no letters and no second separator get through.
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
// Basic calculation blocks
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
// Rate normalization to "round" Satisfactory fractions
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
// 1+2) JUST THE OUTPUT / JUST THE INPUT — how much N machines put out/in at a clock
// ---------------------------------------------------------------------------
//
// Output and input are the SAME math (machines × rate/100% × clock); only the
// label changes, which RateScreen picks via `isOutput`. That's why there's a
// single `calcularTaxa` calculator instead of two identical functions to keep
// in sync.

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
// 3) JUST THE CLOCK — clock needed to hit a production target
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
// 4) FULL LAYOUT from the desired input
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
  // optional output
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
    throw new LayoutError({ code: "targetNonPositive" });
  }
  if (entrada100 <= 0) {
    throw new LayoutError({ code: "inputNonPositive" });
  }
  if (fileiras <= 0) {
    throw new LayoutError({ code: "rowsNonPositive" });
  }
  if (clockEscolhido <= 0 || clockEscolhido > CLOCK_MAX) {
    throw new LayoutError({ code: "clockOutOfRange", max: CLOCK_MAX });
  }
  if (saida100 !== null && saida100 <= 0) {
    throw new LayoutError({ code: "outputNonPositive" });
  }

  const entradaAlvoPorFileira = metaEntradaTotal / fileiras;

  if (entradaAlvoPorFileira > LIMITE_FILEIRA + EPSILON) {
    throw new LayoutError({
      code: "rowLimitExceeded",
      perRow: entradaAlvoPorFileira,
      limit: LIMITE_FILEIRA,
    });
  }

  const entradaPorMaquinaNoClockEscolhido = capacidadePorMaquina(
    entrada100,
    clockEscolhido,
  );

  if (entradaPorMaquinaNoClockEscolhido <= 0) {
    throw new LayoutError({ code: "inputPerMachineInvalid" });
  }

  const maquinasPorFileiraExatas =
    entradaAlvoPorFileira / entradaPorMaquinaNoClockEscolhido;
  const maquinasPorFileiraMinimas = Math.ceil(maquinasPorFileiraExatas);

  const entradaPorFileiraNoClockEscolhido =
    maquinasPorFileiraMinimas * entradaPorMaquinaNoClockEscolhido;

  // We don't check `entradaPorFileiraNoClockEscolhido` against the row limit:
  // that value is only what WOULD enter IF we ran at the chosen ceiling clock,
  // before the fine tuning. The recommended operation is at `clockExato` (the
  // value that goes into the game), where each row carries exactly
  // `target/rows = entradaAlvoPorFileira`, already validated above against
  // LIMITE_FILEIRA. Rounding machines up only creates excess at the ceiling
  // clock (shown as "Excess at ceiling clock"), never overflows the belt at the
  // exact clock. Checking the ceiling clock here was a false positive
  // (e.g. target 2400, 45/machine, 2 rows → 1237.5 at the ceiling, but 1200 at
  // the exact clock).

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
 * Minimum recommended number of rows for the calculation to "close": each row
 * receives at most {@link LIMITE_FILEIRA} items/min, so we need at least
 * `ceil(target / LIMITE_FILEIRA)` rows. Returns null if the target is invalid
 * (<= 0).
 */
export function fileirasMinimasRecomendadas(metaEntradaTotal: number): number | null {
  if (!Number.isFinite(metaEntradaTotal) || metaEntradaTotal <= 0) return null;
  return Math.max(1, Math.ceil(metaEntradaTotal / LIMITE_FILEIRA));
}
