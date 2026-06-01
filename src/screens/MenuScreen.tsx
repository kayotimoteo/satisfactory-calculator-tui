import { TextAttributes } from "@opentui/core";
import { Menu } from "../components/Menu";
import { Panel } from "../components/Panel";
import { theme } from "../ui/theme";
import { CLOCK_PADRAO } from "../lib/satisfactory";
import { useT } from "../i18n";

export function MenuScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const t = useT();
  const m = t.menu.items;
  const ITEMS = [
    { id: "layout", label: m.layout.label, desc: m.layout.desc },
    { id: "clock", label: m.clock.label, desc: m.clock.desc },
    { id: "saida", label: m.saida.label, desc: m.saida.desc },
    { id: "entrada", label: m.entrada.label, desc: m.entrada.desc },
    { id: "history", label: m.history.label, desc: m.history.desc },
    { id: "config", label: m.config.label, desc: m.config.desc },
    { id: "sair", label: m.sair.label, desc: m.sair.desc },
  ];
  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <Panel title={t.menu.panelTitle}>
        <Menu items={ITEMS} onSelect={onSelect} />
      </Panel>
      <box flexDirection="column">
        <text fg={theme.textDim}>
          {t.menu.tipPre}
          <span fg={theme.accent}> C</span> {t.menu.tipCopy}
          <span fg={theme.accent}> Ctrl+S</span> {t.menu.tipSave}
        </text>
        <text fg={theme.muted}>
          {t.menu.clockNotePre}
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>{`${CLOCK_PADRAO}%`}</span>
          {t.menu.clockNotePost}
        </text>
      </box>
    </box>
  );
}
