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
  status,
}: {
  hints: Hint[];
  status: StatusMsg | null;
}) {
  const toneColor =
    status?.tone === "ok"
      ? theme.ok
      : status?.tone === "err"
        ? theme.err
        : theme.warn;

  // Legenda quebrada em duas linhas: a primeira metade dos atalhos em cima,
  // o resto embaixo — assim não estoura a largura quando há muitos comandos.
  const meio = Math.ceil(hints.length / 2);
  const linhas = [hints.slice(0, meio), hints.slice(meio)];

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="flex-end"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="column" gap={0}>
        {linhas.map((linha, i) => (
          <box key={i} flexDirection="row" gap={2}>
            {linha.map((h) => (
              <text key={h.key} fg={theme.muted}>
                <span fg={theme.accent}>{h.key}</span> {h.label}
              </text>
            ))}
          </box>
        ))}
      </box>
      {status ? <text fg={toneColor}>{status.text}</text> : null}
    </box>
  );
}
