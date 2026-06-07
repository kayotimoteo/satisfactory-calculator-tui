// All user-visible text, per locale. This is the i18n source of truth.
//
// Design notes:
//  - `pt-BR` mirrors exactly what the app showed before internationalization.
//  - `Messages` is derived from `ptBR` (its shape is the canonical contract), so
//    every other locale is type-checked to have the SAME keys and the SAME
//    function signatures — a missing or mistyped key is a compile error.
//  - Parameterized strings are functions; static ones are plain strings.
//  - The calc core (`satisfactory.ts`) stays locale-free: it throws typed
//    `LayoutError` codes and the screen translates them via `layout.errors`.
//  - Numbers keep their comma-decimal, game-matching format in BOTH locales
//    (see `fmt`/`fmtFlex` and the clipboard contract); only words are translated.

export type Locale = "pt-BR" | "en-US";

// User's language preference as stored in config. "system" defers to OS
// detection (see `detect.ts`); the explicit locales pin the language.
export type LanguagePref = "system" | Locale;

// Widens the literal types inferred from `ptBR` ("Máquinas" -> string) while
// preserving structure and function signatures, so other locales aren't forced
// to repeat the Portuguese string literals.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : { [K in keyof T]: Widen<T[K]> };

const ptBR = {
  header: {
    tagline: "Calculadora de Fábrica",
    defaultSubtitle: (clock: number) => `clock padrão ${clock}%`,
    subtitle: (mode: string) => `modo: ${mode}`,
  },

  // Short mode labels, reused by the header subtitle and the history list.
  modes: {
    clock: "clock",
    saida: "saída",
    entrada: "entrada",
    layout: "layout",
  },

  // Footer legend. Plain key chords (Tab, Enter, Ctrl+S, …) stay literal in the
  // code; only the words and the chords that embed words live here.
  hints: {
    field: "campo",
    next: "próximo",
    save: "salvar",
    copy: "copiar clock",
    copyField: "copiar campo",
    copyLine: "copiar resultado",
    copyPath: "copiar caminho",
    copySummary: "copiar resumo",
    clearBack: "limpar/voltar",
    navigate: "navegar",
    open: "abrir",
    quit: "sair",
    reopen: "reabrir",
    delete: "apagar",
    back: "voltar",
    arrowsMouse: "↑↓/mouse",
    enterClick: "Enter/clique",
    list: "lista",
    select: "selecionar",
    toggle: "esteira/cano",
  },

  // Shared across calc screens.
  common: {
    copied: (text: string) => `Clock copiado: ${text}`,
    textCopied: (text: string) => `Copiado: ${text}`,
    pathCopied: "Caminho do histórico copiado.",
    emptyField: "Campo vazio — nada pra copiar.",
    copyFailed: "Falhou ao copiar.",
    fillFirst: "Preencha os campos primeiro.",
    nothingToSave: "Nada calculado para salvar.",
    saved: "Salvo no histórico.",
    dataPanel: "Dados",
    resultPanel: "Resultado",
    machines: "Máquinas",
    clock: "Clock",
    satisfactoryAdjust: "Ajuste Satisfactory",
    itemsPerMin: "itens/min",
    clockHint: (clock: number) => `% (padrão ${clock})`,
  },

  menu: {
    panelTitle: "O que vamos calcular?",
    items: {
      layout: { label: "Layout por entrada", desc: "entrada/min + fileiras → tudo" },
      clock: { label: "Clock para meta", desc: "máquinas + meta → clock necessário" },
      saida: { label: "Só a saída", desc: "máquinas + clock → produção total" },
      entrada: { label: "Só a entrada", desc: "máquinas + clock → consumo total" },
      history: { label: "Histórico", desc: "reabrir e copiar cálculos salvos" },
      config: { label: "Configurações", desc: "esteiras, canos e transporte ativo" },
      sair: { label: "Sair", desc: "fecha o programa" },
    },
    tipPre: "Cada ferramenta é direta ao ponto. Em qualquer cálculo:",
    tipCopy: "copia o clock pro clipboard e",
    tipSave: "salva no histórico.",
    clockNotePre: "Clock padrão é ",
    clockNotePost:
      ", limite do jogo. As taxas são normalizadas pras frações do Satisfactory.",
  },

  clock: {
    title: "Clock para meta",
    subtitle: "Tenho N máquinas e quero saber o clock pra bater uma produção.",
    machinesPlaceholder: "ex: 4",
    fieldOutput100: "Saída por máquina a 100%",
    fieldTarget: "Meta total de produção",
    clockNeeded: "Clock necessário",
    targetPerMachine: "Meta por máquina",
    prodAt100: "Produção em 100%",
    status: "Status",
    validUpTo: (max: number) => `VÁLIDO até ${max}%`,
    unfeasible: "INVIÁVEL",
    excessOver: (max: number) => `Excesso sobre ${max}%`,
    maxProdAt: (max: number) => `Produção máx em ${max}%`,
    missing: "Faltaria",
    minMachinesAt: (max: number) => `Máquinas mín. em ${max}%`,
    addMachines: "Adicionar máquinas",
    overLimit: (max: number) => `Clock passa de ${max}% — não copiei.`,
    emptyHint: "Preencha máquinas, saída e meta para ver o clock.",
    defaultName: (target: string) => `Clock p/ ${target}/min`,
    summary: (machines: string, target: string, clock: string) =>
      `${machines} máq • meta ${target}/min → ${clock}%`,
  },

  rate: {
    titleOutput: "Só a saída",
    titleInput: "Só a entrada",
    rateLabelOutput: "Saída por máquina a 100%",
    rateLabelInput: "Entrada por máquina a 100%",
    subtitle: (isOutput: boolean) =>
      `N máquinas num dado clock → quanto ${isOutput ? "produz" : "consome"} no total.`,
    machinesPlaceholder: "ex: 8",
    wordOutput: "Saída",
    wordInput: "Entrada",
    totalOf: (word: string) => `${word} total`,
    perMachine: (word: string) => `${word} por máquina`,
    emptyHint: "Preencha máquinas, taxa e clock para ver o total.",
    defaultName: (title: string, machines: string) => `${title} ${machines} máq`,
    summary: (machines: string, clock: string, total: string, isOutput: boolean) =>
      `${machines} máq @${clock}% → ${total}/min de ${isOutput ? "saída" : "entrada"}`,
  },

  layout: {
    title: "Layout por entrada",
    subtitle: "Quero alimentar X/min em N fileiras → máquinas e clock exato.",
    fieldTargetInput: "Entrada total",
    fieldInput100: "Entrada por máquina a 100%",
    fieldOutput100: "Saída por máquina a 100%",
    fieldRows: "Fileiras",
    optional: "opcional",
    rowsPlaceholder: "ex: 2",
    minRows: (n: number) => `mín. ${n}`,
    clockExact: "Clock exato",
    errorPanel: "Não deu",
    resultPanel: "Layout mínimo",
    totalMachines: "Total de máquinas",
    machinesPerRow: "Máquinas por fileira",
    inputPerRowExact: "Entrada por fileira (clock exato)",
    inputPerRowCeiling: "Entrada por fileira (clock teto)",
    inputTotalCeiling: "Entrada total no clock teto",
    excessCeiling: "Excesso no clock teto",
    outputTotalExact: "Saída total (clock exato)",
    emptyHint: "Preencha entrada total, entrada/100%, clock e fileiras.",
    emptyHintRows: (n: number) => ` Recomendo ao menos ${n} fileira(s).`,
    copyOk: (text: string) => `Clock exato copiado: ${text}`,
    noCopy: "Sem resultado válido pra copiar.",
    noSave: "Sem resultado válido pra salvar.",
    defaultName: (target: string) => `Layout ${target}/min`,
    summary: (total: string, rows: string, clock: string) =>
      `${total} máq • ${rows} fileira(s) • clock ${clock}%`,
    errors: {
      targetNonPositive: "A entrada total desejada deve ser maior que zero.",
      inputNonPositive: "A entrada por máquina a 100% deve ser maior que zero.",
      rowsNonPositive: "A quantidade de fileiras deve ser maior que zero.",
      clockOutOfRange: (max: number) =>
        `O clock deve ser maior que 0 e menor ou igual a ${max}.`,
      outputNonPositive: "A saída por máquina a 100% deve ser maior que zero.",
      rowLimitExceeded: (perRow: string, limit: number) =>
        `Cada fileira precisaria receber ${perRow} itens/min, mas o limite é ` +
        `${limit} itens/min por fileira. Aumente o número de fileiras.`,
      outputRowLimitExceeded: (perRow: string, limit: number) =>
        `Cada fileira produziria ${perRow} itens/min de saída, mas o limite é ` +
        `${limit} itens/min por fileira. Aumente o número de fileiras.`,
      inputPerMachineInvalid: "A entrada por máquina no clock informado é inválida.",
    },
  },

  config: {
    title: "Configurações",
    subtitle: "Esteiras e canos usados nos limites de entrada/saída.",
    welcome:
      "Bem-vindo! Escolha suas esteiras e canos. Dá pra mudar depois nas Configurações.",
    beltsPanel: "Esteiras",
    pipesPanel: "Canos",
    languagePanel: "Idioma",
    langSystem: "Padrão do sistema",
    langPtBR: "Português do Brasil",
    langEnUS: "English",
    langSystemHint: (lang: string) => `→ ${lang}`,
    activeMode: "Transporte ativo",
    belt: "Esteira",
    pipe: "Cano",
    mk: (mk: number) => `Mk.${mk}`,
    rate: (rate: number) => `${rate} /min`,
    toggleHint: "M troca esteira/cano",
    saved: "Configuração salva.",
    languageSaved: "Idioma alterado.",
  },

  history: {
    title: "Histórico",
    help:
      "Enter reabre · C clock · Y resumo · P caminho do arquivo · d apaga · Ctrl+L limpa",
    pathHint: "clique ou P copia o caminho",
    emptyPanel: "Vazio",
    emptyText: "Nenhum cálculo salvo ainda. Use Ctrl+S nas telas de cálculo.",
    count: (n: number) => `${n} cálculo(s)`,
    noClock: "Essa entrada não tem clock.",
    removed: "Entrada removida.",
    cleared: "Histórico limpo.",
  },

  save: {
    title: "Salvar no histórico",
    nameLabel: "Nome",
    confirm: "salva",
    cancel: "cancela",
    emptyUses: (name: string) => `(vazio usa “${name}”)`,
    copyName: "Ctrl+Y copia o nome",
    nameCopied: (text: string) => `Nome copiado: ${text}`,
  },
};

export type Messages = Widen<typeof ptBR>;

const enUS: Messages = {
  header: {
    tagline: "Factory Calculator",
    defaultSubtitle: (clock) => `default clock ${clock}%`,
    subtitle: (mode) => `mode: ${mode}`,
  },

  modes: {
    clock: "clock",
    saida: "output",
    entrada: "input",
    layout: "layout",
  },

  hints: {
    field: "field",
    next: "next",
    save: "save",
    copy: "copy clock",
    copyField: "copy field",
    copyLine: "copy result",
    copyPath: "copy path",
    copySummary: "copy summary",
    clearBack: "clear/back",
    navigate: "navigate",
    open: "open",
    quit: "quit",
    reopen: "reopen",
    delete: "delete",
    back: "back",
    arrowsMouse: "↑↓/mouse",
    enterClick: "Enter/click",
    list: "list",
    select: "select",
    toggle: "belt/pipe",
  },

  common: {
    copied: (text) => `Clock copied: ${text}`,
    textCopied: (text) => `Copied: ${text}`,
    pathCopied: "History file path copied.",
    emptyField: "Empty field — nothing to copy.",
    copyFailed: "Copy failed.",
    fillFirst: "Fill in the fields first.",
    nothingToSave: "Nothing calculated to save.",
    saved: "Saved to history.",
    dataPanel: "Data",
    resultPanel: "Result",
    machines: "Machines",
    clock: "Clock",
    satisfactoryAdjust: "Satisfactory adjust",
    itemsPerMin: "items/min",
    clockHint: (clock) => `% (default ${clock})`,
  },

  menu: {
    panelTitle: "What are we calculating?",
    items: {
      layout: { label: "Layout by input", desc: "input/min + rows → everything" },
      clock: { label: "Clock for target", desc: "machines + target → needed clock" },
      saida: { label: "Output only", desc: "machines + clock → total output" },
      entrada: { label: "Input only", desc: "machines + clock → total consumption" },
      history: { label: "History", desc: "reopen and copy saved calculations" },
      config: { label: "Settings", desc: "belts, pipes and active transport" },
      sair: { label: "Quit", desc: "closes the program" },
    },
    tipPre: "Each tool is to the point. In any calculation:",
    tipCopy: "copies the clock to the clipboard and",
    tipSave: "saves to history.",
    clockNotePre: "Default clock is ",
    clockNotePost:
      ", the game cap. Rates are normalized to Satisfactory fractions.",
  },

  clock: {
    title: "Clock for target",
    subtitle: "I have N machines and want the clock to hit a production target.",
    machinesPlaceholder: "e.g. 4",
    fieldOutput100: "Output per machine at 100%",
    fieldTarget: "Total production target",
    clockNeeded: "Clock needed",
    targetPerMachine: "Target per machine",
    prodAt100: "Output at 100%",
    status: "Status",
    validUpTo: (max) => `VALID up to ${max}%`,
    unfeasible: "UNFEASIBLE",
    excessOver: (max) => `Excess over ${max}%`,
    maxProdAt: (max) => `Max output at ${max}%`,
    missing: "Shortfall",
    minMachinesAt: (max) => `Min machines at ${max}%`,
    addMachines: "Add machines",
    overLimit: (max) => `Clock exceeds ${max}% — not copied.`,
    emptyHint: "Fill in machines, output and target to see the clock.",
    defaultName: (target) => `Clock for ${target}/min`,
    summary: (machines, target, clock) =>
      `${machines} mach • target ${target}/min → ${clock}%`,
  },

  rate: {
    titleOutput: "Output only",
    titleInput: "Input only",
    rateLabelOutput: "Output per machine at 100%",
    rateLabelInput: "Input per machine at 100%",
    subtitle: (isOutput) =>
      `N machines at a given clock → how much it ${isOutput ? "produces" : "consumes"} in total.`,
    machinesPlaceholder: "e.g. 8",
    wordOutput: "Output",
    wordInput: "Input",
    totalOf: (word) => `Total ${word.toLowerCase()}`,
    perMachine: (word) => `${word} per machine`,
    emptyHint: "Fill in machines, rate and clock to see the total.",
    defaultName: (title, machines) => `${title} ${machines} mach`,
    summary: (machines, clock, total, isOutput) =>
      `${machines} mach @${clock}% → ${total}/min of ${isOutput ? "output" : "input"}`,
  },

  layout: {
    title: "Layout by input",
    subtitle: "I want to feed X/min across N rows → machines and exact clock.",
    fieldTargetInput: "Total input",
    fieldInput100: "Input per machine at 100%",
    fieldOutput100: "Output per machine at 100%",
    fieldRows: "Rows",
    optional: "optional",
    rowsPlaceholder: "e.g. 2",
    minRows: (n) => `min. ${n}`,
    clockExact: "Exact clock",
    errorPanel: "No go",
    resultPanel: "Minimum layout",
    totalMachines: "Total machines",
    machinesPerRow: "Machines per row",
    inputPerRowExact: "Input per row (exact clock)",
    inputPerRowCeiling: "Input per row (ceiling clock)",
    inputTotalCeiling: "Total input at ceiling clock",
    excessCeiling: "Excess at ceiling clock",
    outputTotalExact: "Total output (exact clock)",
    emptyHint: "Fill in total input, input/100%, clock and rows.",
    emptyHintRows: (n) => ` I recommend at least ${n} row(s).`,
    copyOk: (text) => `Exact clock copied: ${text}`,
    noCopy: "No valid result to copy.",
    noSave: "No valid result to save.",
    defaultName: (target) => `Layout ${target}/min`,
    summary: (total, rows, clock) =>
      `${total} mach • ${rows} row(s) • clock ${clock}%`,
    errors: {
      targetNonPositive: "The total desired input must be greater than zero.",
      inputNonPositive: "The input per machine at 100% must be greater than zero.",
      rowsNonPositive: "The number of rows must be greater than zero.",
      clockOutOfRange: (max) =>
        `The clock must be greater than 0 and at most ${max}.`,
      outputNonPositive: "The output per machine at 100% must be greater than zero.",
      rowLimitExceeded: (perRow, limit) =>
        `Each row would need to receive ${perRow} items/min, but the limit is ` +
        `${limit} items/min per row. Increase the number of rows.`,
      outputRowLimitExceeded: (perRow, limit) =>
        `Each row would output ${perRow} items/min, but the limit is ` +
        `${limit} items/min per row. Increase the number of rows.`,
      inputPerMachineInvalid: "The input per machine at the given clock is invalid.",
    },
  },

  config: {
    title: "Settings",
    subtitle: "Belts and pipes used by the input/output limits.",
    welcome:
      "Welcome! Pick your belts and pipes. You can change this later in Settings.",
    beltsPanel: "Belts",
    pipesPanel: "Pipes",
    languagePanel: "Language",
    langSystem: "System default",
    langPtBR: "Português do Brasil",
    langEnUS: "English",
    langSystemHint: (lang) => `→ ${lang}`,
    activeMode: "Active transport",
    belt: "Belt",
    pipe: "Pipe",
    mk: (mk) => `Mk.${mk}`,
    rate: (rate) => `${rate} /min`,
    toggleHint: "M toggles belt/pipe",
    saved: "Settings saved.",
    languageSaved: "Language changed.",
  },

  history: {
    title: "History",
    help:
      "Enter reopens · C clock · Y summary · P file path · d deletes · Ctrl+L clears all",
    pathHint: "click or P copies the path",
    emptyPanel: "Empty",
    emptyText: "No saved calculations yet. Use Ctrl+S on the calc screens.",
    count: (n) => `${n} calc(s)`,
    noClock: "This entry has no clock.",
    removed: "Entry removed.",
    cleared: "History cleared.",
  },

  save: {
    title: "Save to history",
    nameLabel: "Name",
    confirm: "save",
    cancel: "cancel",
    emptyUses: (name) => `(empty uses “${name}”)`,
    copyName: "Ctrl+Y copies the name",
    nameCopied: (text) => `Name copied: ${text}`,
  },
};

export const messages: Record<Locale, Messages> = {
  "pt-BR": ptBR,
  "en-US": enUS,
};
