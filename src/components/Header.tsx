import { TextAttributes } from "@opentui/core";
import { theme } from "../ui/theme";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          SATISFACTORY
        </text>
        <text fg={theme.textDim}>Calculadora de Fábrica</text>
      </box>
      <text fg={theme.muted}>{subtitle ?? "clock padrão 250%"}</text>
    </box>
  );
}
