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
  /** dica curta mostrada à direita (ex.: unidade ou valor calculado) */
  hint?: string;
  hintColor?: string;
  width?: number;
  /**
   * Restringe o que pode ser digitado:
   *   "integer" → só dígitos (campos de `parseInteiroPositivo`)
   *   "decimal" → dígitos + um separador `,`/`.` (campos de `parseNumero`)
   * Caracteres barrados nem chegam no estado; o buffer do input é corrigido na hora.
   */
  numeric?: "integer" | "decimal";
  /**
   * Disparado quando o campo é clicado com o mouse. O OpenTUI já dá foco
   * nativo ao <input> no clique (dá pra digitar), mas o estado de navegação
   * por teclado não fica sabendo — então a borda de foco continuaria no
   * campo antigo. A tela usa isso pra mover o índice focado pro campo clicado.
   */
  onFocusRequest?: () => void;
}

/**
 * Linha de formulário: rótulo + caixa de input + dica opcional.
 * A borda muda de cor quando o campo está focado.
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
    const limpo = numeric === "integer" ? sanitizarInteiro(raw) : sanitizarDecimal(raw);
    // O <input> mantém o próprio buffer; quando barramos um caractere o estado
    // não muda, então o React não reaplica `value`. Corrigimos o buffer direto.
    if (limpo !== raw && inputRef.current) inputRef.current.value = limpo;
    onInput(limpo);
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
