import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";

export interface FieldNavActions {
  onBack: () => void;
  /** bare C — clock (or primary calc value) */
  onCopy?: () => void;
  /** bare V — focused field's current text */
  onCopyField?: (fieldIndex: number) => void;
  /** bare Y — main result line / summary */
  onCopyLine?: () => void;
  onSave?: () => void;
  /**
   * Bare `M`: toggle the active transport (belt/pipe). Same safety rationale as
   * bare `C` — every field is numeric, so the letter never reaches state, and
   * `paused` turns it off while the SavePrompt is open.
   */
  onToggle?: () => void;
  /** restores the fields to the form's initial state (moves back to the 1st field) */
  onReset?: () => void;
  /**
   * Whether the form currently differs from its initial values. Drives the
   * two-stage Esc (clear first, then leave). Must read LIVE field values (via a
   * ref) since the keyboard handler is bound once and would otherwise see stale
   * first-render values.
   */
  isDirty?: () => boolean;
}

/**
 * Shared navigation for the calculation screens:
 *  - Tab / Shift+Tab and arrows ↑↓ switch the focused field
 *  - Enter moves to the next field; on the LAST one it wraps focus back to the
 *    first (it only navigates — it does NOT save or clear: saving is Ctrl+S only,
 *    so an accidental Enter never loses what was typed nor opens the name prompt)
 *  - Esc is two-stage: if the form differs from its initial values it CLEARS it
 *    (back to the initial values, focus on the 1st field); a second Esc — with
 *    nothing left to clear — actually leaves the screen. This is the reliable
 *    reset path: many Windows terminals don't send the Ctrl modifier with
 *    Backspace, so Ctrl+Backspace never fired there. It still works as a
 *    one-shot reset on terminals that do report it (e.g. with kitty keyboard).
 *  - C copies the clock, V copies the focused field, Y copies the result line,
 *    Ctrl+S saves
 * Ctrl/Esc are used so they don't "leak" as text; bare C is a safe exception
 * because every field on these screens is numeric (Field's sanitizer drops the
 * letter) and `paused` turns the copy off while the SavePrompt — the only
 * free-text input — is open. The bare Backspace stays a normal in-field delete.
 *
 * `paused` disables all navigation (e.g. while a dialog is open) so the keys
 * don't conflict with whoever is in control.
 */
export function useFieldNav(
  count: number,
  actions: FieldNavActions,
  paused = false,
) {
  const [index, setIndex] = useState(0);
  // Ref mirrors so the handler (which useKeyboard registers once) can read the
  // current values without stale closures.
  const idxRef = useRef(0);
  idxRef.current = index;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const reset = () => {
    actions.onReset?.();
    setIndex(0);
  };

  useKeyboard((key) => {
    if (pausedRef.current) return;
    if (key.name === "escape") {
      // First Esc clears a filled-in form; a second one (nothing left to
      // clear) leaves the screen.
      if (actions.onReset && actions.isDirty?.()) return reset();
      return actions.onBack();
    }
    // Ctrl+Backspace (or Ctrl+H, the 0x08 that many terminals send instead)
    // resets the form without interfering with the bare Backspace in fields.
    if (key.ctrl && (key.name === "backspace" || key.name === "h")) {
      return reset();
    }
    if (!key.ctrl && !key.meta && key.name === "c") return actions.onCopy?.();
    if (!key.ctrl && !key.meta && key.name === "v") {
      return actions.onCopyField?.(idxRef.current);
    }
    if (!key.ctrl && !key.meta && key.name === "y") return actions.onCopyLine?.();
    if (!key.ctrl && !key.meta && key.name === "m") return actions.onToggle?.();
    if (key.ctrl && key.name === "s") return actions.onSave?.();
    if (key.name === "return") {
      // Advance the focus; on the last field wrap around to the first (no clear).
      setIndex((idxRef.current + 1) % count);
      return;
    }
    if (key.name === "tab") {
      setIndex(
        key.shift
          ? (idxRef.current - 1 + count) % count
          : (idxRef.current + 1) % count,
      );
      return;
    }
    if (key.name === "down") {
      setIndex((idxRef.current + 1) % count);
      return;
    }
    if (key.name === "up") {
      setIndex((idxRef.current - 1 + count) % count);
    }
  });

  return { index, setIndex };
}
