import { theme } from "../ui/theme";

export interface RowProps {
  label: string;
  value: string;
  color?: string;
  /** highlight the whole row (e.g. the main result) */
  strong?: boolean;
}

/** "label .......... value" row for result blocks. */
export function Row({ label, value, color, strong }: RowProps) {
  return (
    <box flexDirection="row" justifyContent="space-between">
      <text fg={strong ? theme.text : theme.textDim}>{label}</text>
      <text fg={color ?? (strong ? theme.accent : theme.text)}>{value}</text>
    </box>
  );
}
