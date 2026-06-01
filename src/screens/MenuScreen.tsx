import { TextAttributes } from "@opentui/core";
import { Menu } from "../components/Menu";
import { Panel } from "../components/Panel";
import { theme } from "../ui/theme";
import { CLOCK_PADRAO } from "../lib/satisfactory";

const ITENS = [
  { id: "layout", label: "Layout por entrada", desc: "entrada/min + fileiras → tudo" },
  { id: "clock", label: "Clock para meta", desc: "máquinas + meta → clock necessário" },
  { id: "saida", label: "Só a saída", desc: "máquinas + clock → produção total" },
  { id: "entrada", label: "Só a entrada", desc: "máquinas + clock → consumo total" },
  { id: "history", label: "Histórico", desc: "reabrir e copiar cálculos salvos" },
  { id: "sair", label: "Sair", desc: "fecha o programa" },
];

export function MenuScreen({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <Panel title="O que vamos calcular?">
        <Menu items={ITENS} onSelect={onSelect} />
      </Panel>
      <box flexDirection="column">
        <text fg={theme.textDim}>
          Cada ferramenta é direta ao ponto. Em qualquer cálculo:
          <span fg={theme.accent}> C</span> copia o clock pro clipboard e
          <span fg={theme.accent}> Ctrl+S</span> salva no histórico.
        </text>
        <text fg={theme.muted}>
          Clock padrão é <span fg={theme.accent} attributes={TextAttributes.BOLD}>{`${CLOCK_PADRAO}%`}</span>,
          limite do jogo. As taxas são normalizadas pras frações do Satisfactory.
        </text>
      </box>
    </box>
  );
}
