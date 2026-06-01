// `src/exe.tsx` embeds the native OpenTUI lib via Bun's
// `import dllPath from "...opentui.dll" with { type: "file" }`, which resolves to
// the file's path (a string) at runtime. tsc has no built-in declaration for
// `.dll` imports, so declare it here — otherwise `bun run typecheck` (the only
// build check) fails to resolve the module.
declare module "*.dll" {
  const path: string;
  export default path;
}
