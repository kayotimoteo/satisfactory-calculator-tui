import { theme } from "../ui/theme";

export interface Hint {
  key: string;
  label: string;
}

export interface StatusMsg {
  text: string;
  tone: "ok" | "warn" | "err";
}

export function Footer({
  hints,
}: {
  hints: Hint[];
}) {
  // Legend split across two lines: the first half of the shortcuts on top, the
  // rest below — so it doesn't overflow the width when there are many commands.
  const half = Math.ceil(hints.length / 2);
  const lines = [hints.slice(0, half), hints.slice(half)];

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="flex-end"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="column" gap={0}>
        {lines.map((line, i) => (
          <box key={i} flexDirection="row" gap={2}>
            {line.map((h) => (
              <text key={h.key} fg={theme.muted}>
                <span fg={theme.accent}>{h.key}</span> {h.label}
              </text>
            ))}
          </box>
        ))}
      </box>
    </box>
  );
}
