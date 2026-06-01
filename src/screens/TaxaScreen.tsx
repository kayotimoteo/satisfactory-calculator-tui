import { useEffect, useMemo, useRef, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { Field } from "../components/Field";
import { Panel } from "../components/Panel";
import { Row } from "../components/Row";
import { SavePrompt } from "../components/SavePrompt";
import { useField } from "../ui/useField";
import { useFieldNav } from "../ui/useFieldNav";
import { copiarClock } from "../lib/clipboard";
import { salvarEntrada } from "../lib/storage";
import { corDoClock, theme } from "../ui/theme";
import {
  CLOCK_PADRAO,
  calcularTaxa,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import type { ScreenProps } from "./types";

// Tela genérica para os dois cálculos diretos:
//   - SÓ A SAÍDA  (quanto sai)
//   - SÓ A ENTRADA (quanto entra)
// Mesma matemática (máquinas × taxa × clock), só muda o rótulo.
export function TaxaScreen({
  modo,
  seed,
  onBack,
  setStatus,
}: ScreenProps & { modo: "saida" | "entrada" }) {
  const ehSaida = modo === "saida";
  const titulo = ehSaida ? "Só a saída" : "Só a entrada";
  const rotuloTaxa = ehSaida ? "Saída por máquina a 100%" : "Entrada por máquina a 100%";

  // Valores iniciais do formulário (o "padrão" pro qual o reset volta).
  const inicial = {
    maquinas: seed?.maquinas ?? "",
    taxa100: seed?.taxa100 ?? "",
    clock: seed?.clock ?? String(CLOCK_PADRAO),
  };
  const maquinas = useField(inicial.maquinas);
  const taxa100 = useField(inicial.taxa100);
  const clock = useField(inicial.clock);
  const [salvando, setSalvando] = useState(false);
  // O <input> é semeado, não controlado: pra refletir um reset na tela
  // remontamos os campos trocando esta key.
  const [formKey, setFormKey] = useState(0);

  const dados = useMemo(() => {
    const m = parseInteiroPositivo(maquinas.value);
    const t = parseNumero(taxa100.value);
    const c = parseNumero(clock.value);
    if (m === null || t === null || c === null || t <= 0 || c <= 0) return null;
    const info = normalizarTaxaSatisfactory(t);
    const calc = calcularTaxa(m, info.valorNormalizado, c);
    return { info, calc, clock: c };
  }, [maquinas.value, taxa100.value, clock.value]);

  const snap = useRef(dados);
  snap.current = dados;
  const refs = useRef({ maquinas, taxa100, clock });
  refs.current = { maquinas, taxa100, clock };

  const copiar = () => {
    const d = snap.current;
    if (!d) return setStatus({ text: "Preencha os campos primeiro.", tone: "warn" });
    const { texto, ok } = copiarClock(d.clock);
    setStatus({
      text: ok ? `Clock copiado: ${texto}` : "Falhou ao copiar.",
      tone: ok ? "ok" : "err",
    });
  };

  const abrirSalvar = () => {
    if (!snap.current) return setStatus({ text: "Nada calculado para salvar.", tone: "warn" });
    setSalvando(true);
  };

  const confirmarSalvar = (nome: string) => {
    const d = snap.current;
    if (!d) return setSalvando(false);
    const c = refs.current;
    const palavra = ehSaida ? "saída" : "entrada";
    salvarEntrada({
      nome: nome || `${titulo} ${c.maquinas.value} máq @${c.clock.value}%`,
      modo,
      campos: {
        maquinas: c.maquinas.value,
        taxa100: c.taxa100.value,
        clock: c.clock.value,
      },
      resumo: `${c.maquinas.value} máq @${c.clock.value}% → ${fmtFlex(d.calc.total)}/min de ${palavra}`,
      clock: d.clock,
    });
    setSalvando(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
  };

  const resetar = () => {
    maquinas.set(inicial.maquinas);
    taxa100.set(inicial.taxa100);
    clock.set(inicial.clock);
    setFormKey((k) => k + 1);
    setStatus(null);
  };

  const { index, setIndex } = useFieldNav(
    3,
    { onBack, onCopy: copiar, onSave: abrirSalvar, onReset: resetar },
    salvando,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const calc = dados?.calc;
  const palavra = ehSaida ? "Saída" : "Entrada";
  const foco = salvando ? -1 : index;
  // Clique do mouse num campo move o foco de teclado pra ele (sincroniza a
  // borda amarela com onde o OpenTUI já jogou o foco nativo do <input>).
  const focar = (n: number) => () => {
    if (!salvando) setIndex(n);
  };

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      {salvando ? (
        <SavePrompt
          defaultName={`${titulo} ${maquinas.value || "?"} máq`}
          onConfirm={confirmarSalvar}
          onCancel={() => setSalvando(false)}
        />
      ) : null}

      <scrollbox
        focused={false}
        flexGrow={1}
        style={{ contentOptions: { flexDirection: "column", gap: 1 } }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>{titulo}</text>
        <text fg={theme.muted}>
          N máquinas num dado clock → quanto {ehSaida ? "produz" : "consome"} no total.
        </text>

        <Panel title="Dados">
          <Field key={`maquinas-${formKey}`} label="Máquinas" value={maquinas.value} focused={foco === 0} onFocusRequest={focar(0)} onInput={maquinas.set} placeholder="ex: 8" numeric="integer" />
          <Field key={`taxa100-${formKey}`} label={rotuloTaxa} value={taxa100.value} focused={foco === 1} onFocusRequest={focar(1)} onInput={taxa100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`clock-${formKey}`} label="Clock" value={clock.value} focused={foco === 2} onFocusRequest={focar(2)} onInput={clock.set} placeholder="%" hint="% (padrão 250)" numeric="decimal" />
        </Panel>

        {calc ? (
          <Panel title="Resultado" borderColor={theme.ok}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>{palavra} total</text>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                {fmtFlex(calc.total)} /min
              </text>
            </box>
            <Row label={`${palavra} por máquina`} value={`${fmtFlex(calc.porMaquina)} /min`} />
            <Row label="Máquinas" value={`${calc.maquinas}`} />
            <Row label="Clock" value={`${fmt(calc.clock, 4)}%`} color={corDoClock(calc.tipoClock)} />
            {dados?.info.ajustado ? (
              <Row
                label="Ajuste Satisfactory"
                value={`${dados.info.fracao} (${fmtFlex(dados.info.valorNormalizado)})`}
                color={theme.warn}
              />
            ) : null}
          </Panel>
        ) : (
          <text fg={theme.muted}>Preencha máquinas, taxa e clock para ver o total.</text>
        )}
      </scrollbox>
    </box>
  );
}
