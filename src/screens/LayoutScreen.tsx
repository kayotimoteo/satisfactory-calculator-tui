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
import { theme } from "../ui/theme";
import {
  CLOCK_PADRAO,
  calcularLayoutPorEntrada,
  fileirasMinimasRecomendadas,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import type { ScreenProps } from "./types";

// FULL LAYOUT from the desired input (the "powerful" mode).
export function LayoutScreen({ seed, onBack, setStatus }: ScreenProps) {
  // Initial form values (the "default" the reset goes back to).
  const initial = {
    targetInput: seed?.metaEntrada ?? "",
    input100: seed?.entrada100 ?? "",
    output100: seed?.saida100 ?? "",
    clock: seed?.clock ?? String(CLOCK_PADRAO),
    rows: seed?.fileiras ?? "1",
  };
  const targetInput = useField(initial.targetInput);
  const input100 = useField(initial.input100);
  const output100 = useField(initial.output100);
  const clock = useField(initial.clock);
  const rows = useField(initial.rows);
  // The <input> is seeded, not controlled: to reflect a value we adjust in code
  // (clamp to the minimum, or a reset) we remount the fields by changing these
  // keys — rowsKey just for the rows, formKey for the rest of the form.
  const [rowsKey, setRowsKey] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const data = useMemo(() => {
    const target = parseNumero(targetInput.value);
    const input = parseNumero(input100.value);
    const clk = parseNumero(clock.value);
    const rws = parseInteiroPositivo(rows.value);
    if (target === null || input === null || clk === null || rws === null) return null;

    const out = output100.value.trim() === "" ? null : parseNumero(output100.value);
    const infoInput = normalizarTaxaSatisfactory(input);
    const infoOutput = out !== null ? normalizarTaxaSatisfactory(out) : null;
    const outNorm = infoOutput ? infoOutput.valorNormalizado : null;

    try {
      const base = calcularLayoutPorEntrada(target, infoInput.valorNormalizado, rws, clk, outNorm);
      return { ok: true as const, base, infoInput, infoOutput };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [targetInput.value, input100.value, output100.value, clock.value, rows.value]);

  // Minimum recommended number of rows, updated as the target is typed.
  const minRows = useMemo(() => {
    const target = parseNumero(targetInput.value);
    return target === null ? null : fileirasMinimasRecomendadas(target);
  }, [targetInput.value]);
  const currentRows = parseInteiroPositivo(rows.value);
  const rowsInsufficient =
    minRows !== null && currentRows !== null && currentRows < minRows;

  // Resets the rows input to the minimum value (and remounts to reflect it).
  const adjustRows = (min: number) => {
    rows.set(String(min));
    setRowsKey((k) => k + 1);
  };

  // When the recommended minimum CHANGES (the target was edited on screen), the
  // rows field starts obeying it — up OR down. The idea is to always start from
  // the smallest possible; if you want more (for size), type it by hand. Without
  // this, lowering the target would leave the field stuck on an old value.
  //
  // But we skip the 1st run (mount): reopening a saved layout with rows above the
  // minimum (e.g. 6 rows when the minimum is 5), forcing it to the minimum would
  // change totalMaquinas/clockExato and break "reopen exactly as typed". The seed
  // stays untouched; the clamp only applies to later edits.
  const minRowsMounted = useRef(false);
  useEffect(() => {
    if (!minRowsMounted.current) {
      minRowsMounted.current = true;
      return;
    }
    if (minRows === null) return;
    const current = parseInteiroPositivo(rows.value);
    if (current !== minRows) adjustRows(minRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRows]);

  const snap = useRef(data);
  snap.current = data;
  const refs = useRef({ targetInput, input100, output100, clock, rows });
  refs.current = { targetInput, input100, output100, clock, rows };

  const copy = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: "Sem resultado válido pra copiar.", tone: "warn" });
    const { text, ok } = copyClock(d.base.clockExato);
    setStatus({
      text: ok ? `Clock exato copiado: ${text}` : "Falhou ao copiar.",
      tone: ok ? "ok" : "err",
    });
  };

  const openSave = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: "Sem resultado válido pra salvar.", tone: "warn" });
    setSaving(true);
  };

  const confirmSave = (name: string) => {
    const d = snap.current;
    if (!d || !d.ok) return setSaving(false);
    const c = refs.current;
    saveEntry({
      nome: name || `Layout ${c.targetInput.value}/min`,
      modo: "layout",
      campos: {
        metaEntrada: c.targetInput.value,
        entrada100: c.input100.value,
        saida100: c.output100.value,
        clock: c.clock.value,
        fileiras: c.rows.value,
      },
      resumo: `${d.base.totalMaquinas} máq • ${c.rows.value} fileira(s) • clock ${fmt(d.base.clockExato, 2)}%`,
      clock: d.base.clockExato,
    });
    setSaving(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
  };

  const reset = () => {
    targetInput.set(initial.targetInput);
    input100.set(initial.input100);
    output100.set(initial.output100);
    clock.set(initial.clock);
    rows.set(initial.rows);
    setFormKey((k) => k + 1);
    setRowsKey((k) => k + 1);
    setStatus(null);
  };

  // Reads live values via the ref so the (once-bound) Esc handler isn't stale.
  const isDirty = () => {
    const c = refs.current;
    return (
      c.targetInput.value !== initial.targetInput ||
      c.input100.value !== initial.input100 ||
      c.output100.value !== initial.output100 ||
      c.clock.value !== initial.clock ||
      c.rows.value !== initial.rows
    );
  };

  const { index, setIndex } = useFieldNav(
    5,
    { onBack, onCopy: copy, onSave: openSave, onReset: reset, isDirty },
    saving,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const focus = saving ? -1 : index;
  // A mouse click on a field moves the keyboard focus to it (syncs the yellow
  // border with where OpenTUI already placed the <input>'s native focus).
  const focusField = (n: number) => () => {
    if (!saving) setIndex(n);
  };

  // When leaving the Rows field, make sure nothing stayed below the minimum
  // (while typing we leave it free to allow multi-digit numbers).
  const rowsFocused = focus === 4;
  const rowsWasFocused = useRef(rowsFocused);
  useEffect(() => {
    if (rowsWasFocused.current && !rowsFocused) {
      const min = minRows ?? 1;
      const current = parseInteiroPositivo(rows.value);
      if (current === null || current < min) adjustRows(min);
    }
    rowsWasFocused.current = rowsFocused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsFocused, minRows]);

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      {saving ? (
        <SavePrompt
          defaultName={`Layout ${targetInput.value || "?"}/min`}
          onConfirm={confirmSave}
          onCancel={() => setSaving(false)}
        />
      ) : null}

      <scrollbox
        focused={false}
        flexGrow={1}
        style={{ contentOptions: { flexDirection: "column", gap: 1 } }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>Layout por entrada</text>
        <text fg={theme.muted}>
          Quero alimentar X/min em N fileiras → máquinas e clock exato.
        </text>

        <Panel title="Dados">
          <Field key={`metaEntrada-${formKey}`} label="Entrada total" value={targetInput.value} focused={focus === 0} onFocusRequest={focusField(0)} onInput={targetInput.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`entrada100-${formKey}`} label="Entrada por máquina a 100%" value={input100.value} focused={focus === 1} onFocusRequest={focusField(1)} onInput={input100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`saida100-${formKey}`} label="Saída por máquina a 100%" value={output100.value} focused={focus === 2} onFocusRequest={focusField(2)} onInput={output100.set} placeholder="opcional" hint="opcional" numeric="decimal" />
          <Field key={`clock-${formKey}`} label="Clock" value={clock.value} focused={focus === 3} onFocusRequest={focusField(3)} onInput={clock.set} placeholder="%" hint="% (padrão 250)" numeric="decimal" />
          <Field
            key={`fileiras-${rowsKey}-${formKey}`}
            label="Fileiras"
            value={rows.value}
            focused={focus === 4}
            onFocusRequest={focusField(4)}
            onInput={rows.set}
            placeholder="ex: 2"
            hint={minRows !== null ? `mín. ${minRows}` : undefined}
            hintColor={rowsInsufficient ? theme.warn : theme.ok}
            numeric="integer"
          />
        </Panel>

        {!data ? (
          <text fg={theme.muted}>
            Preencha entrada total, entrada/100%, clock e fileiras.
            {minRows !== null ? ` Recomendo ao menos ${minRows} fileira(s).` : ""}
          </text>
        ) : !data.ok ? (
          <Panel title="Não deu" borderColor={theme.err}>
            <text fg={theme.err}>{data.error}</text>
          </Panel>
        ) : (
          <Panel title="Layout mínimo" borderColor={theme.ok}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>Clock exato</text>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>{fmt(data.base.clockExato, 4)}%</text>
            </box>
            <Row label="Total de máquinas" value={`${data.base.totalMaquinas}`} strong />
            <Row label="Máquinas por fileira" value={`${data.base.maquinasPorFileiraMinimas}`} />
            <Row label="Entrada por fileira (clock exato)" value={`${fmtFlex(data.base.entradaPorFileiraNoClockExato)} /min`} strong />
            <Row label="Entrada por fileira (clock teto)" value={`${fmtFlex(data.base.entradaPorFileiraNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label="Entrada total no clock teto" value={`${fmtFlex(data.base.entradaTotalNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label="Excesso no clock teto" value={`${fmtFlex(data.base.excessoEntradaNoClockEscolhido)} /min`} color={theme.warn} />
            {data.base.saidaTotalNoClockExato !== undefined ? (
              <Row label="Saída total (clock exato)" value={`${fmtFlex(data.base.saidaTotalNoClockExato)} /min`} color={theme.over} />
            ) : null}
          </Panel>
        )}
      </scrollbox>
    </box>
  );
}
