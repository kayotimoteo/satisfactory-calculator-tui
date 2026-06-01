#!/usr/bin/env bun
// Gera um executável standalone (.exe) do app com `bun build --compile`.
//
// O pulo do gato é a lib nativa do OpenTUI (opentui.dll). Em runtime o OpenTUI
// a localiza via `import("@opentui/core-win32-x64")`, que NÃO existe dentro de
// um binário compilado (não há node_modules em disco). A saída: `src/exe.tsx`
// embute a dll com `type: "file"` e seta `OPENTUI_LIB_PATH` pra ela antes de
// carregar o app, que é o override que o loader FFI respeita. Resultado: um
// único .exe autocontido, sem dll ao lado.
//
// Depois de compilar, o .exe é copiado pra uma pasta do PATH como `sfcalc.exe`,
// então o comando `sfcalc` fica disponível em qualquer terminal. O destino é
// `~/.local/bin` por padrão (ajuste com SFCALC_INSTALL_DIR); pule a cópia com
// `--no-install` ou SFCALC_NO_INSTALL=1.
//
// Uso:  bun run build:exe   (ou: bun run scripts/build-exe.ts [--no-install])
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const root = resolve(import.meta.dir, "..");
const entry = resolve(root, "src/exe.tsx");
const outfile = resolve(root, "dist/satisfactory-calculator-tui.exe");

// Pasta onde o comando `sfcalc` é instalado (precisa estar no PATH).
const installDir = process.env.SFCALC_INSTALL_DIR ?? join(homedir(), ".local", "bin");
const installPath = join(installDir, "sfcalc.exe");
const pularInstall = process.argv.includes("--no-install") || process.env.SFCALC_NO_INSTALL === "1";

console.log("Compilando executável...");
const t0 = performance.now();

const proc = Bun.spawnSync(
  [
    "bun",
    "build",
    "--compile",
    "--target=bun-windows-x64",
    "--minify",
    entry,
    "--outfile",
    outfile,
  ],
  { cwd: root, stdout: "inherit", stderr: "inherit" },
);

if (!proc.success) {
  console.error("\nFalha ao compilar o executável.");
  process.exit(proc.exitCode ?? 1);
}

const segundos = ((performance.now() - t0) / 1000).toFixed(1);
const mb = (Bun.file(outfile).size / 1024 / 1024).toFixed(1);
console.log(`\nPronto em ${segundos}s -> ${outfile} (${mb} MB)`);
console.log("É standalone: a dll nativa já vai embutida, pode copiar só o .exe.");

// Instala como `sfcalc` numa pasta do PATH, a não ser que tenham pedido pra pular.
if (pularInstall) {
  console.log("\nInstalação pulada (--no-install).");
} else {
  mkdirSync(installDir, { recursive: true });
  await Bun.write(installPath, Bun.file(outfile));
  console.log(`\nInstalado: ${installPath}`);
  console.log("Comando `sfcalc` pronto (abra um terminal novo se ele não estiver no PATH ainda).");
}
