import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";

export interface FieldNavActions {
  onBack: () => void;
  onCopy?: () => void;
  onSave?: () => void;
  /** restaura os campos ao estado inicial do formulário (volta pro 1º campo) */
  onReset?: () => void;
}

/**
 * Navegação compartilhada das telas de cálculo:
 *  - Tab / Shift+Tab e setas ↑↓ alternam o campo focado
 *  - Enter passa para o próximo campo; no ÚLTIMO, volta o foco pro primeiro
 *    (só navega — NÃO salva nem limpa: salvar é só Ctrl+S e limpar é só
 *    Ctrl+Backspace, pra um Enter sem querer nunca perder o que foi digitado
 *    nem abrir o prompt de nome)
 *  - Ctrl+Backspace reseta o formulário e volta pro primeiro campo
 *  - Esc volta, C copia, Ctrl+S salva
 * Ctrl/Esc são usados para não "vazarem" como texto; o C puro é exceção
 * segura porque todos os campos destas telas são numéricos (o sanitizador
 * de Field descarta a letra) e o `paused` desliga o copiar enquanto o
 * SavePrompt — único input de texto livre — está aberto. O reset fica no
 * Ctrl+Backspace (não no Backspace puro) pra que apagar um dígito dentro
 * do campo continue funcionando normalmente.
 *
 * `paused` desliga toda a navegação (ex.: enquanto um diálogo está aberto),
 * para que as teclas não conflitem com quem está no controle.
 */
export function useFieldNav(
  count: number,
  actions: FieldNavActions,
  paused = false,
) {
  const [index, setIndex] = useState(0);
  // Espelhos em ref para ler valores atuais dentro do handler (que o
  // useKeyboard registra uma única vez) sem closures velhas.
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
    if (key.name === "escape") return actions.onBack();
    // Ctrl+Backspace (ou Ctrl+H, que é o 0x08 que muitos terminais mandam no
    // lugar) reseta o formulário sem atrapalhar o Backspace puro dos campos.
    if (key.ctrl && (key.name === "backspace" || key.name === "h")) {
      return reset();
    }
    if (!key.ctrl && !key.meta && key.name === "c") return actions.onCopy?.();
    if (key.ctrl && key.name === "s") return actions.onSave?.();
    if (key.name === "return") {
      // Avança o foco; no último campo dá a volta pro primeiro (não limpa).
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
