// Persistência do histórico / cálculos salvos.
//
// Tudo vai para um único JSON em ~/.satisfactory-calculator-tui/history.json.
// Mantemos as entradas como strings (o que foi digitado) para conseguir
// reabrir o cálculo exatamente como estava.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type ModoCalculo = "clock" | "saida" | "entrada" | "layout";

export interface EntradaHistorico {
  id: string;
  nome: string;
  modo: ModoCalculo;
  criadoEm: string; // ISO
  campos: Record<string, string>; // valores digitados, por campo
  resumo: string; // linha curta pra lista
  clock: number | null; // clock relevante (pra copiar rápido do histórico)
}

const DIR = join(homedir(), ".satisfactory-calculator-tui");
const ARQUIVO = join(DIR, "history.json");

function garantirDir(): void {
  if (!existsSync(DIR)) {
    mkdirSync(DIR, { recursive: true });
  }
}

export function carregarHistorico(): EntradaHistorico[] {
  try {
    if (!existsSync(ARQUIVO)) return [];
    const dados = JSON.parse(readFileSync(ARQUIVO, "utf8"));
    if (!Array.isArray(dados)) return [];
    return dados as EntradaHistorico[];
  } catch {
    return [];
  }
}

function persistir(lista: EntradaHistorico[]): void {
  garantirDir();
  writeFileSync(ARQUIVO, JSON.stringify(lista, null, 2), "utf8");
}

function gerarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Salva uma nova entrada no topo do histórico e devolve a lista atualizada. */
export function salvarEntrada(
  entrada: Omit<EntradaHistorico, "id" | "criadoEm">,
): EntradaHistorico[] {
  const completa: EntradaHistorico = {
    ...entrada,
    id: gerarId(),
    criadoEm: new Date().toISOString(),
  };
  const lista = [completa, ...carregarHistorico()];
  persistir(lista);
  return lista;
}

export function removerEntrada(id: string): EntradaHistorico[] {
  const lista = carregarHistorico().filter((e) => e.id !== id);
  persistir(lista);
  return lista;
}

export function limparHistorico(): EntradaHistorico[] {
  persistir([]);
  return [];
}

/** Caminho do arquivo, só pra mostrar na tela de histórico. */
export const CAMINHO_HISTORICO = ARQUIVO;
