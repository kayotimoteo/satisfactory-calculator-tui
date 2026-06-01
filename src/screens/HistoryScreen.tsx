import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { Panel } from "../components/Panel";
import { copyClock } from "../lib/clipboard";
import { copyWithStatus } from "../lib/copyStatus";
import {
  HISTORY_PATH,
  loadHistory,
  clearHistory,
  removeEntry,
  type HistoryEntry,
} from "../lib/storage";
import { theme } from "../ui/theme";
import { fmt } from "../lib/satisfactory";
import { useT } from "../i18n";
import type { StatusMsg } from "../components/Footer";

export function HistoryScreen({
  onBack,
  setStatus,
  onOpen,
}: {
  onBack: () => void;
  setStatus: (s: StatusMsg | null) => void;
  onOpen: (entry: HistoryEntry) => void;
}) {
  const t = useT();
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

  const copyPath = () => {
    setStatus(copyWithStatus(HISTORY_PATH, () => t.common.pathCopied, t.common.copyFailed));
  };

  const copySummary = () => {
    const current = listRef.current[idxRef.current];
    if (!current) return setStatus({ text: t.history.emptyText, tone: "warn" });
    const line = `${current.nome} — ${current.resumo}`;
    setStatus(copyWithStatus(line, t.common.textCopied, t.common.copyFailed));
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
        return setStatus({ text: t.history.noClock, tone: "warn" });
      }
      const { text, ok } = copyClock(current.clock);
      return setStatus({
        text: ok ? t.common.copied(text) : t.common.copyFailed,
        tone: ok ? "ok" : "err",
      });
    }
    if (!key.ctrl && !key.meta && key.name === "y") return copySummary();
    if (!key.ctrl && !key.meta && key.name === "p") return copyPath();
    if (key.name === "d" || key.name === "delete" || key.name === "backspace") {
      if (!current) return;
      const updated = removeEntry(current.id);
      idxRef.current = Math.max(0, Math.min(idxRef.current, updated.length - 1));
      setActive(idxRef.current);
      setList(updated);
      return setStatus({ text: t.history.removed, tone: "ok" });
    }
    if (key.ctrl && key.name === "l") {
      setList(clearHistory());
      idxRef.current = 0;
      setActive(0);
      return setStatus({ text: t.history.cleared, tone: "ok" });
    }
  });

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <text fg={theme.accent} attributes={TextAttributes.BOLD}>{t.history.title}</text>
      <text fg={theme.muted}>{t.history.help}</text>

      {list.length === 0 ? (
        <Panel title={t.history.emptyPanel}>
          <text fg={theme.muted}>{t.history.emptyText}</text>
        </Panel>
      ) : (
        <Panel title={t.history.count(list.length)} flexGrow={1}>
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
                      [{t.modes[e.modo]}]
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

      <box
        onMouseDown={(e) => {
          if (e.button === 0) copyPath();
        }}
      >
        <text fg={theme.muted}>
          {HISTORY_PATH}
          {"  ·  "}
          <span fg={theme.accent}>P</span> {t.history.pathHint}
        </text>
      </box>
    </box>
  );
}
