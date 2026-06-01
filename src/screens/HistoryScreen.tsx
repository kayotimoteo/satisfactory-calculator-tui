import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { Panel } from "../components/Panel";
import { copiarClock } from "../lib/clipboard";
import {
  CAMINHO_HISTORICO,
  carregarHistorico,
  limparHistorico,
  removerEntrada,
  type EntradaHistorico,
} from "../lib/storage";
import { theme } from "../ui/theme";
import { fmt } from "../lib/satisfactory";
import type { StatusMsg } from "../components/Footer";

const NOMES_MODO: Record<EntradaHistorico["modo"], string> = {
  clock: "clock",
  saida: "saída",
  entrada: "entrada",
  layout: "layout",
};

export function HistoryScreen({
  onBack,
  setStatus,
  onOpen,
}: {
  onBack: () => void;
  setStatus: (s: StatusMsg | null) => void;
  onOpen: (entrada: EntradaHistorico) => void;
}) {
  const [lista, setLista] = useState<EntradaHistorico[]>(() => carregarHistorico());
  const [active, setActive] = useState(0);
  const idxRef = useRef(0);
  const listaRef = useRef(lista);
  listaRef.current = lista;

  useEffect(() => setStatus(null), [setStatus]);

  const move = (delta: number) => {
    const len = listaRef.current.length;
    if (len === 0) return;
    const next = (idxRef.current + delta + len) % len;
    idxRef.current = next;
    setActive(next);
  };

  // Move a seleção pra um item (usado pelo mouse: passar o cursor seleciona,
  // como no Menu principal).
  const focus = (idx: number) => {
    idxRef.current = idx;
    setActive(idx);
  };

  useKeyboard((key) => {
    if (key.name === "escape") return onBack();
    const atual = listaRef.current[idxRef.current];
    if (key.name === "up" || (key.name === "tab" && key.shift)) return move(-1);
    if (key.name === "down" || key.name === "tab") return move(1);
    if (key.name === "return") {
      if (atual) onOpen(atual);
      return;
    }
    if (!key.ctrl && !key.meta && key.name === "c") {
      if (!atual || atual.clock === null) {
        return setStatus({ text: "Essa entrada não tem clock.", tone: "warn" });
      }
      const { texto, ok } = copiarClock(atual.clock);
      return setStatus({
        text: ok ? `Clock copiado: ${texto}` : "Falhou ao copiar.",
        tone: ok ? "ok" : "err",
      });
    }
    if (key.name === "d" || key.name === "delete" || key.name === "backspace") {
      if (!atual) return;
      const nova = removerEntrada(atual.id);
      idxRef.current = Math.max(0, Math.min(idxRef.current, nova.length - 1));
      setActive(idxRef.current);
      setLista(nova);
      return setStatus({ text: "Entrada removida.", tone: "ok" });
    }
    if (key.ctrl && key.name === "l") {
      setLista(limparHistorico());
      idxRef.current = 0;
      setActive(0);
      return setStatus({ text: "Histórico limpo.", tone: "ok" });
    }
  });

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <text fg={theme.accent} attributes={TextAttributes.BOLD}>Histórico</text>
      <text fg={theme.muted}>
        Enter reabre o cálculo · C copia o clock · d apaga · Ctrl+L limpa tudo
      </text>

      {lista.length === 0 ? (
        <Panel title="Vazio">
          <text fg={theme.muted}>
            Nenhum cálculo salvo ainda. Use Ctrl+S nas telas de cálculo.
          </text>
        </Panel>
      ) : (
        <Panel title={`${lista.length} cálculo(s)`} flexGrow={1}>
          <box flexDirection="column">
            {lista.map((e, idx) => {
              const on = idx === active;
              return (
                <box
                  key={e.id}
                  flexDirection="column"
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={on ? theme.panel : undefined}
                  onMouseMove={() => focus(idx)}
                  onMouseDown={() => {
                    focus(idx);
                    onOpen(e);
                  }}
                >
                  <box flexDirection="row" gap={1} justifyContent="space-between">
                    <text fg={on ? theme.focus : theme.text}>
                      {(on ? "› " : "  ") + e.nome}
                    </text>
                    <text fg={theme.muted}>
                      [{NOMES_MODO[e.modo]}]
                      {e.clock !== null ? `  ${fmt(e.clock, 2)}%` : ""}
                    </text>
                  </box>
                  <text fg={theme.textDim}>{"   " + e.resumo}</text>
                </box>
              );
            })}
          </box>
        </Panel>
      )}

      <text fg={theme.muted}>{CAMINHO_HISTORICO}</text>
    </box>
  );
}
