---
name: opentui-select-no-mouse
description: OpenTUI's SelectRenderable has no mouse and only one highlight — often not worth using
metadata:
  type: reference
---

Two limitations of `SelectRenderable` in this project's `@opentui/core` build:

1. **No mouse handling** — it only implements `handleKeyPress`. `<select>` clicks/hover do nothing unless you wire `onMouseDown`/`onMouseMove` yourself: map `event.y` to an index via `Math.floor((event.y - selectRef.y) / LINES_PER_ITEM)` (LINES_PER_ITEM is 2 with `showDescription`, 1 without, no font; `MouseEvent.y` and `Renderable.y` are both absolute) and call `setSelectedIndex(i)`.
2. **Only one highlight** — it can only color `_selectedIndex` (via `selectedBackgroundColor`). You cannot show a SELECTED row and a separate HOVER/cursor row in different colors at the same time.

Because of #2, `ConfigScreen.tsx` does NOT use `<select>` — it renders its own list of `<box>` rows (like the main `Menu`) so it can show a committed row in orange AND a hover/keyboard-cursor row in a subtle color. Reach for `<select>` only when a single highlight is enough; otherwise a hand-rolled list is simpler.

React binding wiring (if you do use it): `onChange` → `SELECTION_CHANGED` (fires on arrow move AND `setSelectedIndex`); `onSelect` → `ITEM_SELECTED` (fires on Enter).
