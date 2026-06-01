#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";

// Tamanho padrão da janela (colunas x linhas). O Windows Terminal entende a
// sequência ANSI "CSI 8 ; linhas ; colunas t" e redimensiona a janela ao abrir.
// Em terminais que não suportam (ex.: conhost antigo) a sequência é ignorada.
const COLUNAS_PADRAO = 100;
const LINHAS_PADRAO = 50;
if (process.stdout.isTTY) {
	process.stdout.write(`\x1b[8;${LINHAS_PADRAO};${COLUNAS_PADRAO}t`);
}

const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	useMouse: true,
	enableMouseMovement: true,
});

createRoot(renderer).render(<App />);
