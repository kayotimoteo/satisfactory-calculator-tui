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
import { homedir, platform } from "os";
import { join, resolve } from "path";
import { rcedit } from "rcedit";
import pkg from "../package.json";

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

// Rewrite the PE version info. `bun build --compile` produces an .exe that
// inherits bun's own version resource, so its OriginalFilename/InternalName stay
// "bun.exe" — which is the name VirusTotal then shows for the scanned binary.
// rcedit overwrites those fields so the scan (and Windows' file properties)
// report this app instead. rcedit ships a Windows-only helper exe, so this is a
// no-op (with a warning) on other platforms; the released build runs on Windows.
const fileVersion = `${pkg.version.split("-")[0]}.0`; // x.y.z -> x.y.z.0 (4-part)
if (platform() === "win32") {
  console.log("\nStamping version info (rcedit)...");
  try {
    await rcedit(outfile, {
      "file-version": fileVersion,
      "product-version": pkg.version,
      "version-string": {
        CompanyName: pkg.author,
        FileDescription: pkg.description,
        ProductName: "Satisfactory Calculator TUI",
        OriginalFilename: "sfcalc.exe",
        // The standard version-info key is "InternalName"; rcedit's types call it
        // "InternalFilename", which writes a non-standard string Windows ignores
        // (leaving the inherited "bun"). Pass the real key via a cast.
        InternalName: "sfcalc",
        LegalCopyright: `${pkg.author} - ${pkg.license}`,
      } as Parameters<typeof rcedit>[1]["version-string"],
    });
    console.log("Version info stamped (OriginalFilename -> sfcalc.exe).");
  } catch (err) {
    console.warn("Warning: failed to stamp version info:", err);
  }
} else {
  console.warn("\nSkipping version-info stamp (rcedit is Windows-only).");
}

// Installs as `sfcalc` in a folder on the PATH, unless skipping was requested.
if (skipInstall) {
  console.log("\nInstall skipped (--no-install).");
} else {
  mkdirSync(installDir, { recursive: true });
  await Bun.write(installPath, Bun.file(outfile));
  console.log(`\nInstalled: ${installPath}`);
  console.log("Command `sfcalc` ready (open a new terminal if it's not on the PATH yet).");
}
