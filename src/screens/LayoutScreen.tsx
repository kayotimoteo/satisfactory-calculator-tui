import { useEffect, useMemo, useRef, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { Field } from "../components/Field";
import { Panel } from "../components/Panel";
import { Row } from "../components/Row";
import { SavePrompt } from "../components/SavePrompt";
import { useField } from "../ui/useField";
import { useFieldNav } from "../ui/useFieldNav";
import { copyClock } from "../lib/clipboard";
import { copyWithStatus } from "../lib/copyStatus";
import { saveEntry } from "../lib/storage";
import { theme } from "../ui/theme";
import {
  CLOCK_PADRAO,
  LayoutError,
  calcularLayoutPorEntrada,
  fileirasMinimasRecomendadas,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import type { LayoutErrorData } from "../lib/satisfactory";
import { useConfig } from "../ui/ConfigContext";
import { activeTier, limiteTransporte, type TransportType } from "../lib/config";
import { useT } from "../i18n";
import type { ScreenProps } from "./types";

// FULL LAYOUT from the desired input (the "powerful" mode).
export function LayoutScreen({ seed, onBack, setStatus }: ScreenProps) {
  const t = useT();
  const { config, update } = useConfig();
  // Per-row throughput limit comes from the active transport (belt/pipe), set in
  // the config screen and toggled here with M.
  const limite = limiteTransporte(config);
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
      const base = calcularLayoutPorEntrada(target, infoInput.valorNormalizado, rws, clk, outNorm, limite);
      return { ok: true as const, base, infoInput, infoOutput };
    } catch (e) {
      // The calc core throws locale-free LayoutError codes; the message is built
      // here, in the active language (see `errorText`).
      if (e instanceof LayoutError) return { ok: false as const, error: e.data };
      throw e;
    }
  }, [targetInput.value, input100.value, output100.value, clock.value, rows.value, limite]);

  // Turns a typed layout error into a translated, formatted message.
  const errorText = (err: LayoutErrorData): string => {
    const E = t.layout.errors;
    switch (err.code) {
      case "clockOutOfRange":
        return E.clockOutOfRange(err.max ?? CLOCK_PADRAO);
      case "rowLimitExceeded":
        return E.rowLimitExceeded(fmtFlex(err.perRow ?? 0), err.limit ?? 0);
      case "targetNonPositive":
        return E.targetNonPositive;
      case "inputNonPositive":
        return E.inputNonPositive;
      case "rowsNonPositive":
        return E.rowsNonPositive;
      case "outputNonPositive":
        return E.outputNonPositive;
      case "inputPerMachineInvalid":
        return E.inputPerMachineInvalid;
    }
  };

  // Minimum recommended number of rows, updated as the target is typed.
  const minRows = useMemo(() => {
    const target = parseNumero(targetInput.value);
    return target === null ? null : fileirasMinimasRecomendadas(target, limite);
  }, [targetInput.value, limite]);
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

  // Live transport, read via a ref so the once-bound M handler isn't stale.
  const transportRef = useRef<TransportType>(config.transport);
  transportRef.current = config.transport;
  const toggleTransport = () => {
    update({ transport: transportRef.current === "belt" ? "pipe" : "belt" });
  };

  const copy = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: t.layout.noCopy, tone: "warn" });
    const { text, ok } = copyClock(d.base.clockExato);
    setStatus({
      text: ok ? t.layout.copyOk(text) : t.common.copyFailed,
      tone: ok ? "ok" : "err",
    });
  };

  const copyField = (i: number) => {
    const c = refs.current;
    const vals = [
      c.targetInput.value,
      c.input100.value,
      c.output100.value,
      c.clock.value,
      c.rows.value,
    ];
    const v = vals[i]?.trim() ?? "";
    if (!v) return setStatus({ text: t.common.emptyField, tone: "warn" });
    setStatus(copyWithStatus(v, t.common.textCopied, t.common.copyFailed));
  };

  const copyLine = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: t.layout.noCopy, tone: "warn" });
    const c = refs.current;
    const line = t.layout.summary(
      `${d.base.totalMaquinas}`,
      c.rows.value,
      fmt(d.base.clockExato, 4),
    );
    setStatus(copyWithStatus(line, t.common.textCopied, t.common.copyFailed));
  };

  const openSave = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: t.layout.noSave, tone: "warn" });
    setSaving(true);
  };

  const confirmSave = (name: string) => {
    const d = snap.current;
    if (!d || !d.ok) return setSaving(false);
    const c = refs.current;
    saveEntry({
      nome: name || t.layout.defaultName(c.targetInput.value),
      modo: "layout",
      campos: {
        metaEntrada: c.targetInput.value,
        entrada100: c.input100.value,
        saida100: c.output100.value,
        clock: c.clock.value,
        fileiras: c.rows.value,
      },
      resumo: t.layout.summary(
        `${d.base.totalMaquinas}`,
        c.rows.value,
        fmt(d.base.clockExato, 2),
      ),
      clock: d.base.clockExato,
    });
    setSaving(false);
    setStatus({ text: t.common.saved, tone: "ok" });
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
    {
      onBack,
      onCopy: copy,
      onCopyField: copyField,
      onCopyLine: copyLine,
      onSave: openSave,
      onReset: reset,
      isDirty,
      onToggle: toggleTransport,
    },
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
          defaultName={t.layout.defaultName(targetInput.value || "?")}
          onConfirm={confirmSave}
          onCancel={() => setSaving(false)}
          setStatus={setStatus}
        />
      ) : null}

      <scrollbox
        focused={false}
        flexGrow={1}
        style={{ contentOptions: { flexDirection: "column", gap: 1 } }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>{t.layout.title}</text>
        <text fg={theme.muted}>{t.layout.subtitle}</text>

        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.textDim}>{t.config.activeMode}:</text>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            {`${config.transport === "belt" ? t.config.belt : t.config.pipe} ` +
              `${t.config.mk(activeTier(config).mk)} (${t.config.rate(limite)})`}
          </text>
          <text fg={theme.muted}>{`· ${t.config.toggleHint}`}</text>
        </box>

        <Panel title={t.common.dataPanel}>
          <Field key={`metaEntrada-${formKey}`} label={t.layout.fieldTargetInput} value={targetInput.value} focused={focus === 0} onFocusRequest={focusField(0)} onInput={targetInput.set} placeholder="/min" hint={t.common.itemsPerMin} numeric="decimal" />
          <Field key={`entrada100-${formKey}`} label={t.layout.fieldInput100} value={input100.value} focused={focus === 1} onFocusRequest={focusField(1)} onInput={input100.set} placeholder="/min" hint={t.common.itemsPerMin} numeric="decimal" />
          <Field key={`saida100-${formKey}`} label={t.layout.fieldOutput100} value={output100.value} focused={focus === 2} onFocusRequest={focusField(2)} onInput={output100.set} placeholder={t.layout.optional} hint={t.layout.optional} numeric="decimal" />
          <Field key={`clock-${formKey}`} label={t.common.clock} value={clock.value} focused={focus === 3} onFocusRequest={focusField(3)} onInput={clock.set} placeholder="%" hint={t.common.clockHint(CLOCK_PADRAO)} numeric="decimal" />
          <Field
            key={`fileiras-${rowsKey}-${formKey}`}
            label={t.layout.fieldRows}
            value={rows.value}
            focused={focus === 4}
            onFocusRequest={focusField(4)}
            onInput={rows.set}
            placeholder={t.layout.rowsPlaceholder}
            hint={minRows !== null ? t.layout.minRows(minRows) : undefined}
            hintColor={rowsInsufficient ? theme.warn : theme.ok}
            numeric="integer"
          />
        </Panel>

        {!data ? (
          <text fg={theme.muted}>
            {t.layout.emptyHint}
            {minRows !== null ? t.layout.emptyHintRows(minRows) : ""}
          </text>
        ) : !data.ok ? (
          <Panel title={t.layout.errorPanel} borderColor={theme.err}>
            <text fg={theme.err}>{errorText(data.error)}</text>
          </Panel>
        ) : (
          <Panel title={t.layout.resultPanel} borderColor={theme.ok}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>{t.layout.clockExact}</text>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>{fmt(data.base.clockExato, 4)}%</text>
            </box>
            <Row label={t.layout.totalMachines} value={`${data.base.totalMaquinas}`} strong />
            <Row label={t.layout.machinesPerRow} value={`${data.base.maquinasPorFileiraMinimas}`} />
            <Row label={t.layout.inputPerRowExact} value={`${fmtFlex(data.base.entradaPorFileiraNoClockExato)} /min`} strong />
            <Row label={t.layout.inputPerRowCeiling} value={`${fmtFlex(data.base.entradaPorFileiraNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label={t.layout.inputTotalCeiling} value={`${fmtFlex(data.base.entradaTotalNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label={t.layout.excessCeiling} value={`${fmtFlex(data.base.excessoEntradaNoClockEscolhido)} /min`} color={theme.warn} />
            {data.base.saidaTotalNoClockExato !== undefined ? (
              <Row label={t.layout.outputTotalExact} value={`${fmtFlex(data.base.saidaTotalNoClockExato)} /min`} color={theme.over} />
            ) : null}
          </Panel>
        )}
      </scrollbox>
    </box>
  );
}
