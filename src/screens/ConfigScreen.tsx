import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { Panel } from "../components/Panel";
import { theme } from "../ui/theme";
import { useConfig } from "../ui/ConfigContext";
import { BELT_TIERS, PIPE_TIERS, CONFIG_PATH, type TransportTier } from "../lib/config";
import { useT, detectLocale, messages, resolveLocale, type LanguagePref } from "../i18n";
import type { StatusMsg } from "../components/Footer";

// Settings screen. Opens automatically on the first run, then lives behind the
// "Settings" menu item. Three lists: belts, pipes and the UI language. The
// active-transport toggle is NOT here — that lives in the calc (LayoutScreen) on
// `M` — so this screen stays simple: just pick what you use.
//
// We render the lists by hand (instead of OpenTUI's SelectRenderable) because we
// want TWO distinct visual states the renderable can't show at once: a SELECTED
// row (orange, the committed choice) and a HOVERED/cursor row (subtle). Hover and
// the keyboard cursor share one "cursor" position; clicking/Enter commits it.

// Section indices, named so the list math reads clearly.
const BELTS = 0;
const PIPES = 1;
const LANG = 2;
const SECTIONS = 3;

// A single row to render: its committed (orange) state, label and optional
// secondary text.
interface ListRow {
  key: string | number;
  label: string;
  sub?: string;
  committed: boolean;
}

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

  // Language options, in display order. "system" shows which locale the OS
  // currently resolves to as a hint.
  const resolvedName = detectLocale() === "pt-BR" ? t.config.langPtBR : t.config.langEnUS;
  const LANG_OPTIONS: { value: LanguagePref; label: string; sub?: string }[] = [
    { value: "system", label: t.config.langSystem, sub: t.config.langSystemHint(resolvedName) },
    { value: "pt-BR", label: t.config.langPtBR },
    { value: "en-US", label: t.config.langEnUS },
  ];
  const langIndex = LANG_OPTIONS.findIndex((o) => o.value === config.language);

  // Which list has keyboard focus.
  const [section, setSection] = useState(BELTS);
  // Cursor (hover / keyboard) position per list — starts on the committed choice.
  const [cursorBelt, setCursorBelt] = useState(config.beltMk - 1);
  const [cursorPipe, setCursorPipe] = useState(config.pipeMk - 1);
  const [cursorLang, setCursorLang] = useState(langIndex < 0 ? 0 : langIndex);

  const counts = [BELT_TIERS.length, PIPE_TIERS.length, LANG_OPTIONS.length];

  // Refs so the once-bound keyboard handler reads live values (not stale ones).
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const cursorRef = useRef([cursorBelt, cursorPipe, cursorLang]);
  cursorRef.current = [cursorBelt, cursorPipe, cursorLang];
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const setCursor = (list: number, i: number) =>
    (list === BELTS ? setCursorBelt : list === PIPES ? setCursorPipe : setCursorLang)(i);

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

  // Commit the row as the chosen value (click / Enter) — turns it orange.
  const commit = (list: number, i: number) => {
    setSection(list);
    setCursor(list, i);
    if (list === BELTS) {
      const tier = BELT_TIERS[i];
      if (tier) update({ beltMk: tier.mk });
    } else if (list === PIPES) {
      const tier = PIPE_TIERS[i];
      if (tier) update({ pipeMk: tier.mk });
    } else {
      const opt = LANG_OPTIONS[i];
      if (opt && opt.value !== config.language) {
        const nextT = messages[resolveLocale(opt.value)];
        update({ language: opt.value });
        setStatus({ tone: "ok", text: nextT.config.languageSaved });
      }
    }
  };

  useKeyboard((key) => {
    if (key.name === "escape") return onDoneRef.current();
    if (key.name === "tab") return setSection((s) => (s + 1) % SECTIONS);

    const list = sectionRef.current;
    const count = counts[list]!;
    const cur = cursorRef.current[list]!;

    if (key.name === "up" || key.name === "k") {
      return setCursor(list, (cur - 1 + count) % count);
    }
    if (key.name === "down" || key.name === "j") {
      return setCursor(list, (cur + 1) % count);
    }
    if (key.name === "return") {
      commit(list, cur);
      // Enter confirms and moves on to the next list.
      return setSection((s) => (s + 1) % SECTIONS);
    }
  });

  // Renders one list. `cursor` is the hover/keyboard position (subtle, only while
  // this list is focused); committed rows are orange.
  const renderList = (list: number, rows: ListRow[], cursor: number) => (
    <box flexDirection="column">
      {rows.map((row, i) => {
        const committed = row.committed;
        const onCursor = section === list && i === cursor;
        const bg = committed ? theme.accent : onCursor ? theme.panel : undefined;
        const marker = committed ? "▶" : onCursor ? "›" : " ";
        const markerFg = committed ? theme.bg : onCursor ? theme.focus : theme.muted;
        return (
          <box
            key={row.key}
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
            <text fg={committed ? theme.bg : theme.text}>{row.label}</text>
            {row.sub ? (
              <text fg={committed ? theme.bg : theme.muted}>{row.sub}</text>
            ) : null}
          </box>
        );
      })}
    </box>
  );

  const tierRows = (tiers: readonly TransportTier[], committedMk: number): ListRow[] =>
    tiers.map((tier) => ({
      key: tier.mk,
      label: t.config.mk(tier.mk).padEnd(6),
      sub: t.config.rate(tier.rate),
      committed: tier.mk === committedMk,
    }));

  const langRows: ListRow[] = LANG_OPTIONS.map((o) => ({
    key: o.value,
    label: o.label,
    sub: o.sub,
    committed: config.language === o.value,
  }));

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <text fg={theme.accent} attributes={TextAttributes.BOLD}>{t.config.title}</text>
      <text fg={theme.muted}>{firstRun ? t.config.welcome : t.config.subtitle}</text>

      <Panel
        title={t.config.beltsPanel}
        borderColor={section === BELTS ? theme.focus : theme.panelBorder}
      >
        {renderList(BELTS, tierRows(BELT_TIERS, config.beltMk), cursorBelt)}
      </Panel>

      <Panel
        title={t.config.pipesPanel}
        borderColor={section === PIPES ? theme.focus : theme.panelBorder}
      >
        {renderList(PIPES, tierRows(PIPE_TIERS, config.pipeMk), cursorPipe)}
      </Panel>

      <Panel
        title={t.config.languagePanel}
        borderColor={section === LANG ? theme.focus : theme.panelBorder}
      >
        {renderList(LANG, langRows, cursorLang)}
      </Panel>

      <text fg={theme.muted}>{CONFIG_PATH}</text>
    </box>
  );
}
