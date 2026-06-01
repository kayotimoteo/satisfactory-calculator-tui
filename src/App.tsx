import { useCallback, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";
import { Header } from "./components/Header";
import { Footer, type Hint, type StatusMsg } from "./components/Footer";
import { MenuScreen } from "./screens/MenuScreen";
import { ClockScreen } from "./screens/ClockScreen";
import { RateScreen } from "./screens/RateScreen";
import { LayoutScreen } from "./screens/LayoutScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import type { HistoryEntry } from "./lib/storage";
import { theme } from "./ui/theme";
import { useT } from "./i18n";

// `origin` remembers where the calculation screen was opened from, so Esc goes
// back to the right place (History when reopened from there; otherwise the main
// menu).
type Origin = "menu" | "history";
type Route =
  | { name: "menu" }
  | { name: "clock"; seed?: Record<string, string>; origin?: Origin }
  | { name: "saida"; seed?: Record<string, string>; origin?: Origin }
  | { name: "entrada"; seed?: Record<string, string>; origin?: Origin }
  | { name: "layout"; seed?: Record<string, string>; origin?: Origin }
  | { name: "history" };

export function App() {
  const renderer = useRenderer();
  const t = useT();

  const HINTS_CALC: Hint[] = [
    { key: "Tab", label: t.hints.field },
    { key: "Enter", label: t.hints.next },
    { key: "Ctrl+S", label: t.hints.save },
    { key: "C", label: t.hints.copy },
    { key: "Esc", label: t.hints.clearBack },
  ];
  const HINTS_MENU: Hint[] = [
    { key: t.hints.arrowsMouse, label: t.hints.navigate },
    { key: t.hints.enterClick, label: t.hints.open },
    { key: "Ctrl+C", label: t.hints.quit },
  ];
  const HINTS_HIST: Hint[] = [
    { key: "↑↓", label: t.hints.navigate },
    { key: "Enter", label: t.hints.reopen },
    { key: "C", label: t.hints.copy },
    { key: "d", label: t.hints.delete },
    { key: "Esc", label: t.hints.back },
  ];

  const [route, setRoute] = useState<Route>({ name: "menu" });
  const [status, setStatusState] = useState<StatusMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = useCallback((s: StatusMsg | null) => {
    setStatusState(s);
    if (timer.current) clearTimeout(timer.current);
    if (s) timer.current = setTimeout(() => setStatusState(null), 4000);
  }, []);

  const goMenu = useCallback(() => {
    setStatus(null);
    setRoute({ name: "menu" });
  }, [setStatus]);

  const goHistory = useCallback(() => {
    setStatus(null);
    setRoute({ name: "history" });
  }, [setStatus]);

  const onMenuSelect = (id: string) => {
    if (id === "sair") {
      renderer.destroy();
      process.exit(0);
    }
    if (id === "history") return setRoute({ name: "history" });
    setRoute({ name: id, origin: "menu" } as Route);
  };

  const onOpenHistory = (e: HistoryEntry) => {
    setStatus(null);
    setRoute({ name: e.modo, seed: e.campos, origin: "history" } as Route);
  };

  // Goes from the calculation screen back to its origin (History or menu).
  // Captured on each screen's mount, so it sees the correct `route` for that
  // calculation.
  const onBackCalc =
    "origin" in route && route.origin === "history" ? goHistory : goMenu;

  const hints =
    route.name === "menu"
      ? HINTS_MENU
      : route.name === "history"
        ? HINTS_HIST
        : HINTS_CALC;

  const seedKey = "seed" in route && route.seed ? JSON.stringify(route.seed) : "";

  const subtitle =
    route.name === "menu"
      ? undefined
      : route.name === "history"
        ? t.history.title
        : t.header.subtitle(t.modes[route.name]);

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      padding={1}
      gap={1}
      backgroundColor={theme.bg}
    >
      <Header subtitle={subtitle} />

      <box flexGrow={1} flexDirection="column" paddingLeft={1} paddingRight={1}>
        {route.name === "menu" && <MenuScreen onSelect={onMenuSelect} />}
        {route.name === "clock" && (
          <ClockScreen key={`clock${seedKey}`} seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "saida" && (
          <RateScreen key={`saida${seedKey}`} mode="saida" seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "entrada" && (
          <RateScreen key={`entrada${seedKey}`} mode="entrada" seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "layout" && (
          <LayoutScreen key={`layout${seedKey}`} seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "history" && (
          <HistoryScreen onBack={goMenu} setStatus={setStatus} onOpen={onOpenHistory} />
        )}
      </box>

      <Footer hints={hints} status={status} />
    </box>
  );
}
