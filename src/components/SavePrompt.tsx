import { useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import { Field } from "./Field";
import { Panel } from "./Panel";
import { theme } from "../ui/theme";
import { copyWithStatus } from "../lib/copyStatus";
import { useT } from "../i18n";
import type { StatusMsg } from "./Footer";

export interface SavePromptProps {
  /** name used if the field is left empty (shown as a hint) */
  defaultName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  setStatus: (s: StatusMsg | null) => void;
}

/**
 * Dialog that asks for the name when saving to history. It only shows up when
 * the user asks to save — the name is no longer part of the form.
 *  - Enter confirms (typed name, or the default if empty)
 *  - Esc cancels
 * It has its own focused input; the screen navigation is paused while it's open,
 * so there's no key conflict.
 */
export function SavePrompt({ defaultName, onConfirm, onCancel, setStatus }: SavePromptProps) {
  const t = useT();
  const [name, setName] = useState("");
  const nameRef = useRef("");
  nameRef.current = name;

  useKeyboard((key) => {
    if (key.name === "escape") return onCancel();
    if (key.name === "return") return onConfirm(nameRef.current.trim());
    // Ctrl+Y — free-text field would swallow a bare Y.
    if (key.ctrl && key.name === "y") {
      const text = nameRef.current.trim() || defaultName;
      return setStatus(copyWithStatus(text, t.save.nameCopied, t.common.copyFailed));
    }
  });

  return (
    <Panel title={t.save.title} borderColor={theme.accent}>
      <Field
        label={t.save.nameLabel}
        value={name}
        focused
        onInput={setName}
        placeholder={defaultName}
        width={30}
      />
      <text fg={theme.muted}>
        <span fg={theme.accent}>Enter</span> {t.save.confirm}
        {"  ·  "}
        <span fg={theme.accent}>Esc</span> {t.save.cancel}
        {"   "}
        {t.save.emptyUses(defaultName)}
        {"  ·  "}
        <span fg={theme.accent}>Ctrl+Y</span> {t.save.copyName}
      </text>
    </Panel>
  );
}
