import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";
import { theme } from "../ui/theme";

export interface MenuItem {
  id: string;
  label: string;
  desc: string;
}

export function Menu({
  items,
  onSelect,
}: {
  items: MenuItem[];
  onSelect: (id: string) => void;
}) {
  const [active, setActive] = useState(0);
  const ref = useRef(0);

  const move = (delta: number) => {
    const next = (ref.current + delta + items.length) % items.length;
    ref.current = next;
    setActive(next);
  };

  const focus = (idx: number) => {
    ref.current = idx;
    setActive(idx);
  };

  useKeyboard((key) => {
    if (key.name === "up" || (key.name === "tab" && key.shift)) move(-1);
    else if (key.name === "down" || key.name === "tab") move(1);
    else if (key.name === "return") onSelect(items[ref.current]!.id);
  });

  return (
    <box flexDirection="column" gap={0}>
      {items.map((it, idx) => {
        const on = idx === active;
        return (
          <box
            key={it.id}
            flexDirection="row"
            gap={1}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={on ? theme.panel : undefined}
            onMouseMove={() => focus(idx)}
            onMouseDown={() => {
              focus(idx);
              onSelect(it.id);
            }}
          >
            <text fg={on ? theme.accent : theme.muted}>{on ? "›" : " "}</text>
            <text fg={on ? theme.focus : theme.text}>{it.label.padEnd(26)}</text>
            <text fg={theme.muted}>{it.desc}</text>
          </box>
        );
      })}
    </box>
  );
}
