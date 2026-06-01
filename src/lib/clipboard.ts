// Clipboard copy. On Windows we use clip.exe (same as the original script);
// on other systems we try pbcopy (macOS) or xclip/wl-copy.
import { spawnSync } from "child_process";
import { fmtClockClipboard } from "./satisfactory";

function tryCommand(cmd: string, args: string[], text: string): boolean {
  try {
    const res = spawnSync(cmd, args, { input: text });
    // spawnSync does NOT throw when the binary is missing (ENOENT): it returns
    // { status: null, error: <Error> }. Treating a null status as success made
    // a missing clip/wl-copy report "copied" with nothing reaching the
    // clipboard (and aborted the xclip fallback). It's only a success when it
    // exited with code 0.
    if (res.error) return false;
    return res.status === 0;
  } catch {
    return false;
  }
}

/** Copies any text to the clipboard. Returns true on success. */
export function copyText(text: string): boolean {
  if (process.platform === "win32") {
    return tryCommand("clip", [], text);
  }
  if (process.platform === "darwin") {
    return tryCommand("pbcopy", [], text);
  }
  // Linux: try wl-copy (Wayland) and then xclip (X11).
  return (
    tryCommand("wl-copy", [], text) ||
    tryCommand("xclip", ["-selection", "clipboard"], text)
  );
}

/**
 * Copies the clock value already formatted the way the game expects
 * (comma decimal, no stray zeros). Returns the copied text.
 */
export function copyClock(valor: number): { text: string; ok: boolean } {
  const text = fmtClockClipboard(valor);
  return { text, ok: copyText(text) };
}
