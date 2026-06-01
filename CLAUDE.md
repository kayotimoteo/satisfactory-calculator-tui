# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A terminal UI (TUI) calculator for the game **Satisfactory**, built with [OpenTUI](https://github.com/sst/opentui) + its React binding, running on Bun. It is a rework of an older single-file script (`C:\Users\Kayo\Documents\satisfactory3.js`); the calculation math was ported verbatim and then split into smaller, focused tools.

## Commands

```bash
bun start          # run the TUI
bun dev            # run with hot-reload (--watch)
bun run typecheck  # tsc --noEmit (strict; the only "build" check)
bun run build:exe  # compile standalone .exe into dist/ AND install as `sfcalc`
```

`build:exe` (see `scripts/build-exe.ts`) runs `bun build --compile`. The catch is OpenTUI's native `opentui.dll` (in `@opentui/core-win32-x64/`), located at runtime via `import("@opentui/core-${platform}-${arch}")` — which fails inside a compiled binary since there is no node_modules. The loader respects an `OPENTUI_LIB_PATH` env override, so the build-only entry `src/exe.tsx` imports the dll with `type: "file"` (embedding it) and sets `process.env.OPENTUI_LIB_PATH` to that path *before* `await import("./index")`. Result is a single self-contained .exe — no sidecar dll. Smoke-test by running it from a directory with no node_modules; it should render the menu with no FFI errors. After compiling, the script also copies the .exe to `~/.local/bin/sfcalc.exe` (override with `SFCALC_INSTALL_DIR`, skip with `--no-install`/`SFCALC_NO_INSTALL=1`) so the global `sfcalc` command stays current on every build. The command is named `sfcalc`, not `sfc`, because `sfc` collides with Windows' built-in System File Checker.

There is no test suite. To smoke-check calc logic, run pure functions directly:
`bun -e 'import {calcularClockParaMeta} from "./src/lib/satisfactory"; console.log(...)'`.
The app needs a real TTY to run interactively; from a non-TTY shell it still renders (escape codes go to stdout) but won't accept input.

## Architecture

Strict separation between **pure logic** and **UI** — keep it that way.

- `src/lib/satisfactory.ts` — the entire calculation core. **Pure**: numbers in, numbers out, no I/O, no React. All formatting (pt-BR comma decimals via `fmt`/`fmtFlex`) and tolerant parsing (`parseNumero`/`parseInteiroPositivo` return `null` instead of throwing) live here. The three calculators are `calcularTaxa` (saída/entrada share one function — same math, only the label differs, chosen by `RateScreen`'s `isOutput`), `calcularClockParaMeta`, and `calcularLayoutPorEntrada` (plus `fileirasMinimasRecomendadas`, the live "at least N rows" hint for the layout screen). Rates are run through `normalizarTaxaSatisfactory`, which snaps a rate to a "round" Satisfactory fraction (e.g. `13.333` → `40/3`); screens display the fraction when `ajustado` is true.
- `src/lib/clipboard.ts` — `copyClock(valor)` formats with `fmtClockClipboard` (comma decimal, no trailing zeros — must match the original game-paste format) and shells out: `clip` on Windows, `pbcopy`/`wl-copy`/`xclip` elsewhere.
- `src/lib/storage.ts` — history persistence as a single JSON at `~/.satisfactory-calculator-tui/history.json`. Entries store the **raw typed strings** keyed by field name (`campos`) so a calculation can be reopened exactly as entered.
- `src/App.tsx` — the router. Holds a `Route` discriminated union (`menu | clock | saida | entrada | layout | history`) in state, owns the status/toast (auto-clears after 4s), and maps menu/history selections to routes. Screens are remounted via a `key` derived from the seed so prefilled values take effect.
- `src/screens/` — one screen per tool. `RateScreen` is shared by both `saida` and `entrada` (a `mode` prop switches labels/math).
- `src/ui/` — `theme.ts` (colors), `useField` (controlled text field), `useFieldNav` (Tab/arrows to move focus + the global command keys).
- `src/components/` — presentational: `Header`, `Footer`, `Panel`, `Field`, `Row`, `Menu`, `SavePrompt` (the name dialog shown only when saving).

## Conventions that matter

- **Language split: code English, calc core + visible UI Portuguese.** Comments and identifiers (variables, helpers, types, props) are in English. Two deliberate exceptions stay Portuguese: (1) the calculation core in `src/lib/satisfactory.ts` — its function/type/property names (`calcularTaxa`, `metaEntradaTotal`, `ajustado`, …) are domain vocabulary ported from the original script; (2) every string the user sees on screen (titles, labels, hints, status/toast text, the thrown calc error messages rendered by `LayoutScreen`). Also Portuguese for data-contract reasons: the persisted `history.json` keys — `CalcMode` values (`"saida"`/`"entrada"`), the `campos`/seed field keys, and `HistoryEntry` field names (`nome`, `modo`, `criadoEm`, `campos`, `resumo`) — renaming them would break already-saved history.
- **Command keys use Ctrl/Esc, never bare letters — with one deliberate exception: copy is bare `C`.** OpenTUI's `useKeyboard` fires globally even while an `<input>` is focused, so a bare letter would *also* be typed into the field. Bare `C` (copy clock) is safe because every calc-screen field is `numeric` (the `Field` sanitizer drops the `c` before it reaches state) and `useFieldNav` is `paused` while the `SavePrompt` — the only free-text input — is open, so the copy handler is off then. The handler also guards `!key.ctrl && !key.meta` so it doesn't fire on Ctrl+C (menu's "sair"). Other commands stay on modifiers: `Ctrl+S` (save), `Tab`/`↑↓` (move field), `Enter` (next field; wraps to the first field on the last — it does **not** save or clear). **`Esc` is two-stage: it clears the form first (back to the initial values + focus on the 1st field) and only leaves the screen on a second press, when nothing differs from the initial.** `useFieldNav` decides via the screen's `isDirty()` (which must read live field values through the screen's ref, since the handler is bound once). This replaced the old `Ctrl+Backspace` reset, which silently never fired on Windows: those terminals don't send the `Ctrl` modifier with Backspace (see `parse.keypress` — both plain and Ctrl+Backspace arrive as `name:"backspace"` with `ctrl:false`), so the bare Backspace just deleted one in-field character. `Ctrl+Backspace` still resets in one shot where the terminal reports the modifier (e.g. kitty keyboard). Menu and History use bare keys throughout (no focused input).
- **Name is asked only on save, and save is Ctrl+S only.** Calc screens have no "name" form field. Saving (`Ctrl+S`) opens `SavePrompt`; `useFieldNav` is *paused* while it's open (the `paused` arg) so its keys don't collide with the dialog. Empty name falls back to a generated default. Enter deliberately never triggers save, so an accidental Enter on the last field can't pester you for a name.
- **Long screens scroll, they don't overflow.** Each calc screen body is wrapped in an unfocused `<scrollbox>` (`focused={false}` so it doesn't eat the arrow keys used for field nav) and `Panel` has `flexShrink={0}` so borders never get clipped when content exceeds the viewport.
- **Avoid stale closures in keyboard handlers.** Assume `useKeyboard` binds the handler once. Screens mirror their live computed result and field values into refs (`snap.current`, `nameRef.current`, …) and have `copy`/`openSave` read those refs; navigation uses functional `setState` updaters. Follow this pattern for any new key-driven action.
- **`<input>` value is a seed, not fully controlled.** `value` is passed as the initial value (and for history prefill via remount key); edits flow through `onInput` into state. Don't try to force-control it on every render.
- **Live computation:** screens recompute via `useMemo` over field strings — there's no explicit "calculate" button.

## TypeScript setup notes

`tsconfig.json` is strict with `verbatimModuleSyntax` (use `import type` for type-only imports) and `noUncheckedIndexedAccess` (array indexing yields `T | undefined` — note the `!` after `items[ref.current]` in `Menu.tsx`). `@types/react@19` is a required devDependency beyond what `create-tui` scaffolds. JSX uses `jsxImportSource: "@opentui/react"`, so JSX intrinsics are OpenTUI renderables (`<box>`, `<text>`, `<input>`, `<span>`), not the DOM.
