import { useRef } from "react";
import type { InputRenderable } from "@opentui/core";
import { sanitizarDecimal, sanitizarInteiro } from "../lib/satisfactory";
import { theme } from "../ui/theme";

export interface FieldProps {
  label: string;
  value: string;
  focused: boolean;
  onInput: (value: string) => void;
  placeholder?: string;
  /** short hint shown on the right (e.g. unit or computed value) */
  hint?: string;
  hintColor?: string;
  width?: number;
  /**
   * Restricts what can be typed:
   *   "integer" → digits only (fields read by `parseInteiroPositivo`)
   *   "decimal" → digits + one `,`/`.` separator (fields read by `parseNumero`)
   * Blocked characters never reach state; the input buffer is fixed on the spot.
   */
  numeric?: "integer" | "decimal";
  /**
   * Fired when the field is clicked with the mouse. OpenTUI already gives the
   * <input> native focus on click (you can type), but the keyboard navigation
   * state doesn't know about it — so the focus border would stay on the old
   * field. The screen uses this to move the focused index to the clicked field.
   */
  onFocusRequest?: () => void;
}

/**
 * Form row: label + input box + optional hint.
 * The border changes color when the field is focused.
 */
export function Field({
  label,
  value,
  focused,
  onInput,
  placeholder,
  hint,
  hintColor,
  width = 16,
  numeric,
  onFocusRequest,
}: FieldProps) {
  const inputRef = useRef<InputRenderable>(null);

  const handleInput = (raw: string) => {
    if (!numeric) return onInput(raw);
    const clean = numeric === "integer" ? sanitizarInteiro(raw) : sanitizarDecimal(raw);
    // The <input> keeps its own buffer; when we block a character the state
    // doesn't change, so React won't reapply `value`. We fix the buffer directly.
    if (clean !== raw && inputRef.current) inputRef.current.value = clean;
    onInput(clean);
  };

  return (
    <box
      flexDirection="row"
      alignItems="center"
      gap={1}
      height={3}
      onMouseDown={(e) => {
        if (e.button === 0) onFocusRequest?.();
      }}
    >
      <text fg={focused ? theme.focus : theme.textDim}>
        {(focused ? "› " : "  ") + label.padEnd(30)}
      </text>
      <box
        border
        borderStyle="rounded"
        borderColor={focused ? theme.focus : theme.panelBorder}
        width={width}
        height={3}
        paddingLeft={1}
        paddingRight={1}
      >
        <input
          ref={inputRef}
          value={value}
          focused={focused}
          placeholder={placeholder}
          onInput={handleInput}
          textColor={theme.text}
          cursorColor={theme.accent}
        />
      </box>
      {hint ? <text fg={hintColor ?? theme.muted}>{hint}</text> : null}
    </box>
  );
}
