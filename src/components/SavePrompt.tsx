import { useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { Field } from "./Field";
import { Panel } from "./Panel";
import { theme } from "../ui/theme";

export interface SavePromptProps {
  /** nome usado caso o campo fique vazio (mostrado como dica) */
  defaultName: string;
  onConfirm: (nome: string) => void;
  onCancel: () => void;
}

/**
 * Diálogo para pedir o nome ao salvar no histórico. Só aparece quando o
 * usuário pede para salvar — o nome não fica mais no formulário.
 *  - Enter confirma (nome digitado, ou o padrão se vazio)
 *  - Esc cancela
 * Tem seu próprio input focado; a navegação da tela fica pausada enquanto
 * ele está aberto, então não há conflito de teclas.
 */
export function SavePrompt({ defaultName, onConfirm, onCancel }: SavePromptProps) {
  const [nome, setNome] = useState("");
  const nomeRef = useRef("");
  nomeRef.current = nome;

  useKeyboard((key) => {
    if (key.name === "escape") return onCancel();
    if (key.name === "return") return onConfirm(nomeRef.current.trim());
  });

  return (
    <Panel title="Salvar no histórico" borderColor={theme.accent}>
      <Field
        label="Nome"
        value={nome}
        focused
        onInput={setNome}
        placeholder={defaultName}
        width={30}
      />
      <text fg={theme.muted}>
        <span fg={theme.accent}>Enter</span> salva
        {"  ·  "}
        <span fg={theme.accent}>Esc</span> cancela
        {"   "}
        (vazio usa “{defaultName}”)
      </text>
    </Panel>
  );
}
