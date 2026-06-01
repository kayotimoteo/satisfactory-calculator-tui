import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { Panel } from "../components/Panel";
import { theme } from "../ui/theme";
import { useConfig } from "../ui/ConfigContext";
import { BELT_TIERS, PIPE_TIERS, CONFIG_PATH, type TransportTier } from "../lib/config";
import { useT } from "../i18n";
import type { StatusMsg } from "../components/Footer";

// Settings screen. Opens automatically on the first run, then lives behind the
// "Settings" menu item. Two tier lists (belts / pipes). The active-transport
// toggle is NOT here — that lives in the calc (LayoutScreen) on `M` — so this
// screen stays simple: just pick which Mk you use.
//
// We render the lists by hand (instead of OpenTUI's SelectRenderable) because we
// want TWO distinct visual states the renderable can't show at once: a SELECTED
// row (orange, the committed choice) and a HOVERED/cursor row (subtle). Hover and
// the keyboard cursor share one "cursor" position; clicking/Enter commits it.
export function ConfigScreen({
  onDone,
  setStatus,
  firstRun,
}: {
  onDone: () => void;
  setStatus: (s: StatusMsg | null) => void;
  firstRun?: boolean;
}) {
  const t = useT();
  const { config, update } = useConfig();

  // Which list has keyboard focus: 0 = belts, 1 = pipes.
  const [section, setSection] = useState(0);
  // Cursor (hover / keyboard) position per list — starts on the committed tier.
  const [cursorBelt, setCursorBelt] = useState(config.beltMk - 1);
  const [cursorPipe, setCursorPipe] = useState(config.pipeMk - 1);

  // Refs so the once-bound keyboard handler reads live values (not stale ones).
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const cursorRef = useRef([cursorBelt, cursorPipe]);
  cursorRef.current = [cursorBelt, cursorPipe];
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const setCursor = (list: number, i: number) =>
    (list === 0 ? setCursorBelt : setCursorPipe)(i);

  // Persist once on mount so the first run leaves a config file behind — without
  // it, `configExists()` would keep routing here on every launch.
  useEffect(() => {
    update({});
    setStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the cursor over a row (hover / arrow). Does NOT commit.
  const hover = (list: number, i: number) => {
    setSection(list);
    setCursor(list, i);
  };

  // Commit the row as the chosen tier (click / Enter) — turns it orange.
  const commit = (list: number, i: number) => {
    setSection(list);
    setCursor(list, i);
    const tier = (list === 0 ? BELT_TIERS : PIPE_TIERS)[i];
    if (tier) update(list === 0 ? { beltMk: tier.mk } : { pipeMk: tier.mk });
  };

  useKeyboard((key) => {
    if (key.name === "escape") return onDoneRef.current();
    if (key.name === "tab") return setSection((s) => (s + 1) % 2);

    const list = sectionRef.current;
    const count = (list === 0 ? BELT_TIERS : PIPE_TIERS).length;
    const cur = cursorRef.current[list]!;

    if (key.name === "up" || key.name === "k") {
      return setCursor(list, (cur - 1 + count) % count);
    }
    if (key.name === "down" || key.name === "j") {
      return setCursor(list, (cur + 1) % count);
    }
    if (key.name === "return") {
      commit(list, cur);
      // Enter confirms and moves on to the other list.
      return setSection((s) => (s + 1) % 2);
    }
  });

  // Renders one tier list. `committedMk` is the saved choice (orange); `cursor`
  // is the hover/keyboard position (subtle, only while this list is focused).
  const renderList = (
    list: number,
    tiers: readonly TransportTier[],
    committedMk: number,
    cursor: number,
  ) => (
    <box flexDirection="column">
      {tiers.map((tier, i) => {
        const committed = tier.mk === committedMk;
        const onCursor = section === list && i === cursor;
        const bg = committed ? theme.accent : onCursor ? theme.panel : undefined;
        const marker = committed ? "▶" : onCursor ? "›" : " ";
        const markerFg = committed ? theme.bg : onCursor ? theme.focus : theme.muted;
        return (
          <box
            key={tier.mk}
            flexDirection="row"
            gap={1}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={bg}
            onMouseMove={() => hover(list, i)}
            onMouseDown={(e) => {
              if (e.button === 0) commit(list, i);
            }}
          >
            <text fg={markerFg}>{marker}</text>
            <text fg={committed ? theme.bg : theme.text}>{t.config.mk(tier.mk).padEnd(6)}</text>
            <text fg={committed ? theme.bg : theme.muted}>{t.config.rate(tier.rate)}</text>
          </box>
        );
      })}
    </box>
  );

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <text fg={theme.accent} attributes={TextAttributes.BOLD}>{t.config.title}</text>
      <text fg={theme.muted}>{firstRun ? t.config.welcome : t.config.subtitle}</text>

      <Panel
        title={t.config.beltsPanel}
        borderColor={section === 0 ? theme.focus : theme.panelBorder}
      >
        {renderList(0, BELT_TIERS, config.beltMk, cursorBelt)}
      </Panel>

      <Panel
        title={t.config.pipesPanel}
        borderColor={section === 1 ? theme.focus : theme.panelBorder}
      >
        {renderList(1, PIPE_TIERS, config.pipeMk, cursorPipe)}
      </Panel>

      <text fg={theme.muted}>{CONFIG_PATH}</text>
    </box>
  );
}
