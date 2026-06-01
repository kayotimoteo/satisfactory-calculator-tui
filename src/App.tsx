import { useCallback, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";
import { Header } from "./components/Header";
import { Footer, type Hint, type StatusMsg } from "./components/Footer";
import { MenuScreen } from "./screens/MenuScreen";
import { ClockScreen } from "./screens/ClockScreen";
import { TaxaScreen } from "./screens/TaxaScreen";
import { LayoutScreen } from "./screens/LayoutScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import type { EntradaHistorico } from "./lib/storage";
import { theme } from "./ui/theme";

// `origin` lembra de onde a tela de cálculo foi aberta, pra o Esc voltar pro
// lugar certo (Histórico quando reaberta de lá; senão o menu principal).
type Origin = "menu" | "history";
type Route =
  | { name: "menu" }
  | { name: "clock"; seed?: Record<string, string>; origin?: Origin }
  | { name: "saida"; seed?: Record<string, string>; origin?: Origin }
  | { name: "entrada"; seed?: Record<string, string>; origin?: Origin }
  | { name: "layout"; seed?: Record<string, string>; origin?: Origin }
  | { name: "history" };

const HINTS_CALC: Hint[] = [
  { key: "Tab", label: "campo" },
  { key: "Enter", label: "próximo" },
  { key: "Ctrl+S", label: "salvar" },
  { key: "C", label: "copiar" },
  { key: "Ctrl+Backspace", label: "limpar" },
  { key: "Esc", label: "voltar" },
];
const HINTS_MENU: Hint[] = [
  { key: "↑↓/mouse", label: "navegar" },
  { key: "Enter/clique", label: "abrir" },
  { key: "Ctrl+C", label: "sair" },
];
const HINTS_HIST: Hint[] = [
  { key: "↑↓", label: "navegar" },
  { key: "Enter", label: "reabrir" },
  { key: "C", label: "copiar" },
  { key: "d", label: "apagar" },
  { key: "Esc", label: "voltar" },
];

export function App() {
  const renderer = useRenderer();
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

  const onOpenHistorico = (e: EntradaHistorico) => {
    setStatus(null);
    setRoute({ name: e.modo, seed: e.campos, origin: "history" } as Route);
  };

  // Volta da tela de cálculo pra origem (Histórico ou menu). Capturado no
  // mount de cada tela, então enxerga a `route` correta daquele cálculo.
  const onBackCalc =
    "origin" in route && route.origin === "history" ? goHistory : goMenu;

  const hints =
    route.name === "menu"
      ? HINTS_MENU
      : route.name === "history"
        ? HINTS_HIST
        : HINTS_CALC;

  const seedKey = "seed" in route && route.seed ? JSON.stringify(route.seed) : "";

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      padding={1}
      gap={1}
      backgroundColor={theme.bg}
    >
      <Header subtitle={route.name === "menu" ? undefined : `modo: ${route.name}`} />

      <box flexGrow={1} flexDirection="column" paddingLeft={1} paddingRight={1}>
        {route.name === "menu" && <MenuScreen onSelect={onMenuSelect} />}
        {route.name === "clock" && (
          <ClockScreen key={`clock${seedKey}`} seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "saida" && (
          <TaxaScreen key={`saida${seedKey}`} modo="saida" seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "entrada" && (
          <TaxaScreen key={`entrada${seedKey}`} modo="entrada" seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "layout" && (
          <LayoutScreen key={`layout${seedKey}`} seed={route.seed} onBack={onBackCalc} setStatus={setStatus} />
        )}
        {route.name === "history" && (
          <HistoryScreen onBack={goMenu} setStatus={setStatus} onOpen={onOpenHistorico} />
        )}
      </box>

      <Footer hints={hints} status={status} />
    </box>
  );
}
