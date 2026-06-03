import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { theme } from "../ui/theme";
import type { StatusMsg } from "./Footer";

function ellipsize(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return `${text.slice(0, max - 3)}...`;
}

export function Toast({ status }: { status: StatusMsg | null }) {
  const { width } = useTerminalDimensions();

  if (!status) return null;

  const margin = width < 48 ? 1 : 2;
  const toastWidth = Math.max(12, Math.min(64, width - margin * 2));
  const label = status.tone === "ok" ? "OK" : status.tone === "err" ? "ERR" : "!";
  const toneColor =
    status.tone === "ok" ? theme.ok : status.tone === "err" ? theme.err : theme.warn;
  const text = ellipsize(status.text, toastWidth - label.length - 5);

  return (
    <box
      position="absolute"
      top={2}
      right={margin}
      zIndex={100}
      width={toastWidth}
      height={3}
      border
      borderColor={toneColor}
      backgroundColor={theme.panel}
      paddingLeft={1}
      paddingRight={1}
      flexDirection="row"
      alignItems="center"
      gap={1}
    >
      <text fg={toneColor} attributes={TextAttributes.BOLD}>
        {label}
      </text>
      <text fg={theme.text}>{text}</text>
    </box>
  );
}
