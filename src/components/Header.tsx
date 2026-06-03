import { TextAttributes } from "@opentui/core";
import { theme } from "../ui/theme";
import { useTSection } from "../i18n";
import { CLOCK_PADRAO } from "../lib/satisfactory";

export function Header({ subtitle }: { subtitle?: string }) {
  const t = useTSection("header");
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
        <text fg={theme.textDim}>{t.tagline}</text>
      </box>
      <text fg={theme.muted}>{subtitle ?? t.defaultSubtitle(CLOCK_PADRAO)}</text>
    </box>
  );
}
