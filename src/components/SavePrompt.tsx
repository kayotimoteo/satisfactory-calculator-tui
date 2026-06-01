import { useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { Field } from "./Field";
import { Panel } from "./Panel";
import { theme } from "../ui/theme";

export interface SavePromptProps {
  /** name used if the field is left empty (shown as a hint) */
  defaultName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

/**
 * Dialog that asks for the name when saving to history. It only shows up when
 * the user asks to save — the name is no longer part of the form.
 *  - Enter confirms (typed name, or the default if empty)
 *  - Esc cancels
 * It has its own focused input; the screen navigation is paused while it's open,
 * so there's no key conflict.
 */
export function SavePrompt({ defaultName, onConfirm, onCancel }: SavePromptProps) {
  const [name, setName] = useState("");
  const nameRef = useRef("");
  nameRef.current = name;

  useKeyboard((key) => {
    if (key.name === "escape") return onCancel();
    if (key.name === "return") return onConfirm(nameRef.current.trim());
  });

  return (
    <Panel title="Salvar no histórico" borderColor={theme.accent}>
      <Field
        label="Nome"
        value={name}
        focused
        onInput={setName}
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
