#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { I18nProvider } from "./i18n";

// Default window size (columns x rows). Windows Terminal understands the ANSI
// sequence "CSI 8 ; rows ; columns t" and resizes the window on open. Terminals
// that don't support it (e.g. old conhost) just ignore the sequence.
const DEFAULT_COLUMNS = 100;
const DEFAULT_ROWS = 50;
if (process.stdout.isTTY) {
	process.stdout.write(`\x1b[8;${DEFAULT_ROWS};${DEFAULT_COLUMNS}t`);
}

const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	useMouse: true,
	enableMouseMovement: true,
});

createRoot(renderer).render(
	<I18nProvider>
		<App />
	</I18nProvider>,
);
