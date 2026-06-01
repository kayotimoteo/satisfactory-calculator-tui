# Satisfactory Calculator TUI

Calculadora de fábrica do **Satisfactory** rodando direto no terminal, com
interface TUI feita em [OpenTUI](https://github.com/sst/opentui) + React.

Normaliza taxas pras frações do jogo e oferece ferramentas diretas ao ponto:
**clock padrão de 250%**, **histórico**, **cálculos salvos com nome** e
**cópia do clock pro clipboard**.

## Rodar (desenvolvimento)

```bash
bun install      # já instalado pelo create-tui
bun start        # abre a TUI
# ou, durante o desenvolvimento, com hot-reload:
bun dev
```

Requer [Bun](https://bun.sh) — o app roda o TypeScript direto, sem etapa de
build. Sair: `Ctrl+C` ou a opção **Sair** no menu.

## Instalar (baixar pronto)

Não quer instalar nada de dev? Baixe o executável direto das
[**Releases**](../../releases):

1. Pegue o arquivo `sfcalc-vX.Y.Z-windows-x64.exe` da release mais recente.
2. (Opcional) Renomeie pra `sfcalc.exe` e coloque numa pasta que esteja no seu
   PATH — aí é só digitar `sfcalc` em qualquer terminal. Ou rode o `.exe`
   direto, clicando duas vezes ou pelo caminho.

É um arquivo só, autocontido: **não precisa de Bun, Node nem `node_modules`**.

- **Conferir integridade (opcional):** cada release traz um `.sha256`. Compare
  com `(Get-FileHash .\sfcalc-vX.Y.Z-windows-x64.exe -Algorithm SHA256).Hash`.
- **Aviso do Windows:** como o `.exe` não é assinado, o SmartScreen pode mostrar
  "Windows protegeu seu computador" na primeira execução — clique em "Mais
  informações" → "Executar assim mesmo". É esperado.

> Por enquanto só há binário pra **Windows x64**. Em macOS/Linux, use o fluxo de
> desenvolvimento acima ou compile localmente (próxima seção).

## Instalar como comando `sfcalc` (compilando)

Pra ter o app como um comando global no terminal, gere o executável standalone:

```bash
bun run build:exe
```

Isso compila um único `.exe` autocontido (~100 MB, com a dll nativa do OpenTUI
embutida — **não precisa do Bun instalado pra rodar**) e o copia pra
`~/.local/bin/sfcalc.exe`. Depois é só abrir um terminal novo e digitar:

```bash
sfcalc
```

Detalhes:

- **Por que `sfcalc` e não `sfc`:** `sfc` é o System File Checker nativo do
  Windows e tem prioridade no PATH — por isso o comando é `sfcalc`.
- **Pasta de instalação:** `~/.local/bin` por padrão (no Windows,
  `C:\Users\<você>\.local\bin`). Essa pasta precisa estar no seu PATH. Mude o
  destino com a variável `SFCALC_INSTALL_DIR`.
- **Só compilar, sem instalar:** `bun run build:exe --no-install` (ou
  `SFCALC_NO_INSTALL=1`). O `.exe` fica em `dist/` mesmo assim.
- **Outra máquina:** copie `dist/satisfactory-calculator-tui.exe` (ou o
  `sfcalc.exe` instalado) pra qualquer pasta do PATH de lá. É um arquivo só,
  sem Node, Bun ou `node_modules`.

## Publicar uma nova versão (mantenedor)

A release é automática: empurrar uma tag `v*` dispara o workflow
`.github/workflows/release.yml`, que compila o `.exe` de Windows x64 e cria a
GitHub Release com o binário + `.sha256` anexados.

```bash
git tag v1.0.0
git push origin v1.0.0
```

As notas da release são geradas automaticamente a partir dos commits desde a
tag anterior.

## Ferramentas (menu)

| Ferramenta             | Pergunta que responde                        | Você informa                                          | Resultado                                  |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| **Clock para meta**    | "Que clock preciso pra bater essa produção?" | máquinas, saída@100%, meta total                      | clock necessário (+ viabilidade ≤250%)     |
| **Só a saída**         | "Quanto isso produz no total?"               | máquinas, saída@100%, clock                           | saída por máquina e total                  |
| **Só a entrada**       | "Quanto isso consome no total?"              | máquinas, entrada@100%, clock                         | entrada por máquina e total                |
| **Layout por entrada** | "Como monto N fileiras pra alimentar X/min?" | entrada total, entrada@100%, [saída], clock, fileiras | máquinas, paridade PAR/ÍMPAR e clock exato |
| **Histórico**          | "O que eu já calculei?"                       | —                                                     | lista pra reabrir, copiar ou apagar        |

Toda taxa `@100%` é normalizada automaticamente pras frações redondas do
Satisfactory (ex.: `13,333…` vira `40/3`); quando isso acontece, a tela mostra a
fração usada.

## Atalhos

Nas telas de cálculo:

| Tecla        | Ação                          |
| ------------ | ----------------------------- |
| `Tab` / `↑↓` | Alterna o campo focado        |
| `Ctrl+Y`     | Copia o clock pro clipboard   |
| `Ctrl+S`     | Salva o cálculo no histórico  |
| `Esc`        | Volta pro menu                |

No histórico: `Enter` reabre o cálculo, `Ctrl+Y` copia o clock daquela entrada,
`d` apaga a entrada selecionada, `Ctrl+L` limpa tudo.

> As teclas de comando usam `Ctrl`/`Esc` de propósito, pra não "vazarem" como
> texto enquanto você digita num campo.

## Onde os dados ficam salvos

O histórico é um único JSON em:

```
~/.satisfactory-calculator-tui/history.json
```

(no Windows, `C:\Users\<você>\.satisfactory-calculator-tui\history.json`). O
caminho exato aparece no rodapé da tela de Histórico.

## Estrutura

```
src/
  index.tsx          # bootstrap do renderer
  App.tsx            # roteamento de telas, status/toast, atalhos globais
  lib/
    satisfactory.ts  # núcleo de cálculo puro
    clipboard.ts     # cópia pro clipboard (clip/pbcopy/xclip/wl-copy)
    storage.ts       # histórico/salvos em JSON
  ui/                # tema + hooks (useField, useFieldNav)
  components/        # Header, Footer, Panel, Field, Row, Menu
  screens/           # MenuScreen, ClockScreen, RateScreen, LayoutScreen, HistoryScreen
```

## Notas sobre a cópia do clock

O valor é formatado como o jogo espera (vírgula decimal, sem zeros sobrando),
ex.: `83,333333`. No Windows usa o
`clip.exe`; em macOS/Linux cai pra `pbcopy` / `wl-copy` / `xclip`.
