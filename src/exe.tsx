// Entry point used ONLY to build the standalone executable (.exe) with
// `bun build --compile`.
//
// OpenTUI loads the native lib `opentui.dll` through FFI. At runtime it looks
// the DLL up via `require.resolve("@opentui/core-win32-x64/...")`, which does
// NOT exist inside a compiled binary (there is no node_modules). But before
// that it respects the `OPENTUI_LIB_PATH` env. So we embed the DLL in the binary
// with `type: "file"` (the import becomes a valid path at runtime) and point the
// env at it BEFORE loading the app. `await import` guarantees that order — a
// static `import "./index"` would be evaluated before `process.env`.
import dllPath from "../node_modules/@opentui/core-win32-x64/opentui.dll" with { type: "file" };

process.env.OPENTUI_LIB_PATH = dllPath;

await import("./index");
