import type { ReactNode } from "react";
import { theme } from "../ui/theme";

export function Panel({
  title,
  children,
  flexGrow,
  borderColor,
}: {
  title?: string;
  children: ReactNode;
  flexGrow?: number;
  borderColor?: string;
}) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={borderColor ?? theme.panelBorder}
      title={title}
      titleAlignment="left"
      padding={1}
      flexDirection="column"
      gap={0}
      flexGrow={flexGrow}
      flexShrink={0}
    >
      {children}
    </box>
  );
}
