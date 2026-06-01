#!/usr/bin/env bun
// Builds a standalone executable (.exe) of the app with `bun build --compile`.
//
// The trick is OpenTUI's native lib (opentui.dll). At runtime OpenTUI locates it
// via `import("@opentui/core-win32-x64")`, which does NOT exist inside a compiled
// binary (there is no node_modules on disk). The fix: `src/exe.tsx` embeds the
// dll with `type: "file"` and sets `OPENTUI_LIB_PATH` to it before loading the
// app, which is the override the FFI loader respects. Result: a single
// self-contained .exe, no dll alongside it.
//
// After compiling, the .exe is copied to a folder on the PATH as `sfcalc.exe`,
// so the `sfcalc` command is available in any terminal. The destination is
// `~/.local/bin` by default (override with SFCALC_INSTALL_DIR); skip the copy
// with `--no-install` or SFCALC_NO_INSTALL=1.
//
// Usage:  bun run build:exe   (or: bun run scripts/build-exe.ts [--no-install])
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const root = resolve(import.meta.dir, "..");
const entry = resolve(root, "src/exe.tsx");
const outfile = resolve(root, "dist/satisfactory-calculator-tui.exe");

// Folder where the `sfcalc` command is installed (must be on the PATH).
const installDir = process.env.SFCALC_INSTALL_DIR ?? join(homedir(), ".local", "bin");
const installPath = join(installDir, "sfcalc.exe");
const skipInstall = process.argv.includes("--no-install") || process.env.SFCALC_NO_INSTALL === "1";

console.log("Compiling executable...");
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
  console.error("\nFailed to compile the executable.");
  process.exit(proc.exitCode ?? 1);
}

const seconds = ((performance.now() - t0) / 1000).toFixed(1);
const mb = (Bun.file(outfile).size / 1024 / 1024).toFixed(1);
console.log(`\nDone in ${seconds}s -> ${outfile} (${mb} MB)`);
console.log("It's standalone: the native dll is embedded, you can copy just the .exe.");

// Installs as `sfcalc` in a folder on the PATH, unless skipping was requested.
if (skipInstall) {
  console.log("\nInstall skipped (--no-install).");
} else {
  mkdirSync(installDir, { recursive: true });
  await Bun.write(installPath, Bun.file(outfile));
  console.log(`\nInstalled: ${installPath}`);
  console.log("Command `sfcalc` ready (open a new terminal if it's not on the PATH yet).");
}
