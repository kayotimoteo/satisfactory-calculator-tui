import { theme } from "../ui/theme";

export interface RowProps {
  label: string;
  value: string;
  color?: string;
  /** destaque a linha inteira (ex.: resultado principal) */
  strong?: boolean;
}

/** Linha "rótulo .......... valor" para blocos de resultado. */
export function Row({ label, value, color, strong }: RowProps) {
  return (
    <box flexDirection="row" justifyContent="space-between">
      <text fg={strong ? theme.text : theme.textDim}>{label}</text>
      <text fg={color ?? (strong ? theme.accent : theme.text)}>{value}</text>
    </box>
  );
}
