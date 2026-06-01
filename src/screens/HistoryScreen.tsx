import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { Panel } from "../components/Panel";
import { copyClock } from "../lib/clipboard";
import {
  HISTORY_PATH,
  loadHistory,
  clearHistory,
  removeEntry,
  type HistoryEntry,
} from "../lib/storage";
import { theme } from "../ui/theme";
import { fmt } from "../lib/satisfactory";
import type { StatusMsg } from "../components/Footer";

const MODE_LABELS: Record<HistoryEntry["modo"], string> = {
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
  onOpen: (entry: HistoryEntry) => void;
}) {
  const [list, setList] = useState<HistoryEntry[]>(() => loadHistory());
  const [active, setActive] = useState(0);
  const idxRef = useRef(0);
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => setStatus(null), [setStatus]);

  const move = (delta: number) => {
    const len = listRef.current.length;
    if (len === 0) return;
    const next = (idxRef.current + delta + len) % len;
    idxRef.current = next;
    setActive(next);
  };

  // Moves the selection to an item (used by the mouse: hovering selects, like in
  // the main Menu).
  const focus = (idx: number) => {
    idxRef.current = idx;
    setActive(idx);
  };

  useKeyboard((key) => {
    if (key.name === "escape") return onBack();
    const current = listRef.current[idxRef.current];
    if (key.name === "up" || (key.name === "tab" && key.shift)) return move(-1);
    if (key.name === "down" || key.name === "tab") return move(1);
    if (key.name === "return") {
      if (current) onOpen(current);
      return;
    }
    if (!key.ctrl && !key.meta && key.name === "c") {
      if (!current || current.clock === null) {
        return setStatus({ text: "Essa entrada não tem clock.", tone: "warn" });
      }
      const { text, ok } = copyClock(current.clock);
      return setStatus({
        text: ok ? `Clock copiado: ${text}` : "Falhou ao copiar.",
        tone: ok ? "ok" : "err",
      });
    }
    if (key.name === "d" || key.name === "delete" || key.name === "backspace") {
      if (!current) return;
      const updated = removeEntry(current.id);
      idxRef.current = Math.max(0, Math.min(idxRef.current, updated.length - 1));
      setActive(idxRef.current);
      setList(updated);
      return setStatus({ text: "Entrada removida.", tone: "ok" });
    }
    if (key.ctrl && key.name === "l") {
      setList(clearHistory());
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

      {list.length === 0 ? (
        <Panel title="Vazio">
          <text fg={theme.muted}>
            Nenhum cálculo salvo ainda. Use Ctrl+S nas telas de cálculo.
          </text>
        </Panel>
      ) : (
        <Panel title={`${list.length} cálculo(s)`} flexGrow={1}>
          <box flexDirection="column">
            {list.map((e, idx) => {
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
                      [{MODE_LABELS[e.modo]}]
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

      <text fg={theme.muted}>{HISTORY_PATH}</text>
    </box>
  );
}
