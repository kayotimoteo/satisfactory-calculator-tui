# Satisfactory Calculator TUI

Calculadora de fábrica do **Satisfactory** rodando direto no terminal, com
interface TUI feita em [OpenTUI](https://github.com/sst/opentui) + React.

É a evolução do antigo `satisfactory3.js`: a mesma matemática (com normalização
das taxas pras frações do jogo), mas quebrada em ferramentas diretas ao ponto,
com **clock padrão de 250%**, **histórico**, **cálculos salvos com nome** e a
**cópia do clock pro clipboard** que continua funcionando igual.

## Rodar (desenvolvimento)

```bash
bun install      # já instalado pelo create-tui
bun start        # abre a TUI
# ou, durante o desenvolvimento, com hot-reload:
bun dev
```

Requer [Bun](https://bun.sh) — o app roda o TypeScript direto, sem etapa de
build. Sair: `Ctrl+C` ou a opção **Sair** no menu.

## Instalar como comando `sfcalc`

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
    satisfactory.ts  # núcleo de cálculo puro (portado do satisfactory3.js)
    clipboard.ts     # cópia pro clipboard (clip/pbcopy/xclip/wl-copy)
    storage.ts       # histórico/salvos em JSON
  ui/                # tema + hooks (useField, useFieldNav)
  components/        # Header, Footer, Panel, Field, Row, Menu
  screens/           # MenuScreen, ClockScreen, RateScreen, LayoutScreen, HistoryScreen
```

## Notas sobre a cópia do clock

O valor é formatado como o jogo espera (vírgula decimal, sem zeros sobrando),
exatamente como o script original fazia — ex.: `83,333333`. No Windows usa o
`clip.exe`; em macOS/Linux cai pra `pbcopy` / `wl-copy` / `xclip`.
