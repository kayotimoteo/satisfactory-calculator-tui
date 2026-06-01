// Cópia para o clipboard. No Windows usamos o clip.exe (igual ao script
// original); em outros sistemas tentamos pbcopy (macOS) ou xclip/wl-copy.
import { spawnSync } from "child_process";
import { fmtClockClipboard } from "./satisfactory";

function tentarComando(cmd: string, args: string[], texto: string): boolean {
  try {
    const res = spawnSync(cmd, args, { input: texto });
    // spawnSync NÃO lança quando o binário não existe (ENOENT): devolve
    // { status: null, error: <Error> }. Tratar status null como sucesso fazia
    // um clip/wl-copy ausente reportar "copiado" sem nada chegar ao clipboard
    // (e abortava o fallback pro xclip). Só é sucesso quando saiu com código 0.
    if (res.error) return false;
    return res.status === 0;
  } catch {
    return false;
  }
}

/** Copia um texto qualquer para o clipboard. Retorna true se conseguiu. */
export function copiarTexto(texto: string): boolean {
  if (process.platform === "win32") {
    return tentarComando("clip", [], texto);
  }
  if (process.platform === "darwin") {
    return tentarComando("pbcopy", [], texto);
  }
  // Linux: tenta wl-copy (Wayland) e depois xclip (X11).
  return (
    tentarComando("wl-copy", [], texto) ||
    tentarComando("xclip", ["-selection", "clipboard"], texto)
  );
}

/**
 * Copia o valor do clock já formatado do jeito que o jogo espera
 * (vírgula decimal, sem zeros à toa). Retorna o texto copiado.
 */
export function copiarClock(valor: number): { texto: string; ok: boolean } {
  const texto = fmtClockClipboard(valor);
  return { texto, ok: copiarTexto(texto) };
}
