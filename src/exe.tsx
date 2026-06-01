// Entry point usado SÓ para gerar o executável (.exe) com `bun build --compile`.
//
// O OpenTUI carrega a lib nativa `opentui.dll` por FFI. Em runtime ele procura
// a DLL via `require.resolve("@opentui/core-win32-x64/...")`, que NÃO existe
// dentro de um binário compilado (não há node_modules). Mas antes disso ele
// respeita a env `OPENTUI_LIB_PATH`. Então embutimos a DLL no binário com
// `type: "file"` (o import vira um caminho válido em runtime) e apontamos a env
// pra ela ANTES de carregar o app. `await import` garante essa ordem — um
// `import "./index"` estático seria avaliado antes do `process.env`.
import dllPath from "../node_modules/@opentui/core-win32-x64/opentui.dll" with { type: "file" };

process.env.OPENTUI_LIB_PATH = dllPath;

await import("./index");
