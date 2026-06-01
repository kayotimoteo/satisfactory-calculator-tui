// Paleta inspirada no laranja/cinza do Satisfactory.
export const theme = {
  bg: "#11141a",
  panel: "#1a1f29",
  panelBorder: "#2c333f",
  accent: "#ff9f1c", // laranja Satisfactory
  accentDim: "#b5701a",
  focus: "#ffd166",
  text: "#e6e9ef",
  textDim: "#8b95a7",
  muted: "#5e6675",
  ok: "#48c78e",
  warn: "#ffb454",
  err: "#f25f5c",
  under: "#5bc0eb",
  over: "#ff9f1c",
  normal: "#48c78e",
} as const;

export function corDoClock(tipo: "UNDERCLOCK" | "NORMAL" | "OVERCLOCK"): string {
  if (tipo === "UNDERCLOCK") return theme.under;
  if (tipo === "OVERCLOCK") return theme.over;
  return theme.normal;
}
