import { useEffect, useMemo, useRef, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { Field } from "../components/Field";
import { Panel } from "../components/Panel";
import { Row } from "../components/Row";
import { SavePrompt } from "../components/SavePrompt";
import { useField } from "../ui/useField";
import { useFieldNav } from "../ui/useFieldNav";
import { copyClock } from "../lib/clipboard";
import { saveEntry } from "../lib/storage";
import { clockColor, theme } from "../ui/theme";
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

// Generic screen for the two direct calculations:
//   - JUST THE OUTPUT  (how much comes out)
//   - JUST THE INPUT   (how much goes in)
// Same math (machines × rate × clock), only the label changes.
export function RateScreen({
  mode,
  seed,
  onBack,
  setStatus,
}: ScreenProps & { mode: "saida" | "entrada" }) {
  const isOutput = mode === "saida";
  const title = isOutput ? "Só a saída" : "Só a entrada";
  const rateLabel = isOutput ? "Saída por máquina a 100%" : "Entrada por máquina a 100%";

  // Initial form values (the "default" the reset goes back to).
  const initial = {
    machines: seed?.maquinas ?? "",
    rate100: seed?.taxa100 ?? "",
    clock: seed?.clock ?? String(CLOCK_PADRAO),
  };
  const machines = useField(initial.machines);
  const rate100 = useField(initial.rate100);
  const clock = useField(initial.clock);
  const [saving, setSaving] = useState(false);
  // The <input> is seeded, not controlled: to reflect a reset on screen we
  // remount the fields by changing this key.
  const [formKey, setFormKey] = useState(0);

  const data = useMemo(() => {
    const m = parseInteiroPositivo(machines.value);
    const t = parseNumero(rate100.value);
    const c = parseNumero(clock.value);
    if (m === null || t === null || c === null || t <= 0 || c <= 0) return null;
    const info = normalizarTaxaSatisfactory(t);
    const calc = calcularTaxa(m, info.valorNormalizado, c);
    return { info, calc, clock: c };
  }, [machines.value, rate100.value, clock.value]);

  const snap = useRef(data);
  snap.current = data;
  const refs = useRef({ machines, rate100, clock });
  refs.current = { machines, rate100, clock };

  const copy = () => {
    const d = snap.current;
    if (!d) return setStatus({ text: "Preencha os campos primeiro.", tone: "warn" });
    const { text, ok } = copyClock(d.clock);
    setStatus({
      text: ok ? `Clock copiado: ${text}` : "Falhou ao copiar.",
      tone: ok ? "ok" : "err",
    });
  };

  const openSave = () => {
    if (!snap.current) return setStatus({ text: "Nada calculado para salvar.", tone: "warn" });
    setSaving(true);
  };

  const confirmSave = (name: string) => {
    const d = snap.current;
    if (!d) return setSaving(false);
    const c = refs.current;
    const word = isOutput ? "saída" : "entrada";
    saveEntry({
      nome: name || `${title} ${c.machines.value} máq @${c.clock.value}%`,
      modo: mode,
      campos: {
        maquinas: c.machines.value,
        taxa100: c.rate100.value,
        clock: c.clock.value,
      },
      resumo: `${c.machines.value} máq @${c.clock.value}% → ${fmtFlex(d.calc.total)}/min de ${word}`,
      clock: d.clock,
    });
    setSaving(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
  };

  const reset = () => {
    machines.set(initial.machines);
    rate100.set(initial.rate100);
    clock.set(initial.clock);
    setFormKey((k) => k + 1);
    setStatus(null);
  };

  // Reads live values via the ref so the (once-bound) Esc handler isn't stale.
  const isDirty = () => {
    const c = refs.current;
    return (
      c.machines.value !== initial.machines ||
      c.rate100.value !== initial.rate100 ||
      c.clock.value !== initial.clock
    );
  };

  const { index, setIndex } = useFieldNav(
    3,
    { onBack, onCopy: copy, onSave: openSave, onReset: reset, isDirty },
    saving,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const calc = data?.calc;
  const word = isOutput ? "Saída" : "Entrada";
  const focus = saving ? -1 : index;
  // A mouse click on a field moves the keyboard focus to it (syncs the yellow
  // border with where OpenTUI already placed the <input>'s native focus).
  const focusField = (n: number) => () => {
    if (!saving) setIndex(n);
  };

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      {saving ? (
        <SavePrompt
          defaultName={`${title} ${machines.value || "?"} máq`}
          onConfirm={confirmSave}
          onCancel={() => setSaving(false)}
        />
      ) : null}

      <scrollbox
        focused={false}
        flexGrow={1}
        style={{ contentOptions: { flexDirection: "column", gap: 1 } }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>{title}</text>
        <text fg={theme.muted}>
          N máquinas num dado clock → quanto {isOutput ? "produz" : "consome"} no total.
        </text>

        <Panel title="Dados">
          <Field key={`maquinas-${formKey}`} label="Máquinas" value={machines.value} focused={focus === 0} onFocusRequest={focusField(0)} onInput={machines.set} placeholder="ex: 8" numeric="integer" />
          <Field key={`taxa100-${formKey}`} label={rateLabel} value={rate100.value} focused={focus === 1} onFocusRequest={focusField(1)} onInput={rate100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`clock-${formKey}`} label="Clock" value={clock.value} focused={focus === 2} onFocusRequest={focusField(2)} onInput={clock.set} placeholder="%" hint="% (padrão 250)" numeric="decimal" />
        </Panel>

        {calc ? (
          <Panel title="Resultado" borderColor={theme.ok}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>{word} total</text>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                {fmtFlex(calc.total)} /min
              </text>
            </box>
            <Row label={`${word} por máquina`} value={`${fmtFlex(calc.porMaquina)} /min`} />
            <Row label="Máquinas" value={`${calc.maquinas}`} />
            <Row label="Clock" value={`${fmt(calc.clock, 4)}%`} color={clockColor(calc.tipoClock)} />
            {data?.info.ajustado ? (
              <Row
                label="Ajuste Satisfactory"
                value={`${data.info.fracao} (${fmtFlex(data.info.valorNormalizado)})`}
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
