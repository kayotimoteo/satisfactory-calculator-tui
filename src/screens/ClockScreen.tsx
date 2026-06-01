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
import { clockColor, theme } from "../ui/theme";
import {
  CLOCK_MAX,
  calcularClockParaMeta,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import { useT } from "../i18n";
import type { ScreenProps } from "./types";

// JUST THE CLOCK: how many machines I have, how much each produces at 100% and
// what the target is -> which clock I need. The same calc the script already did.
export function ClockScreen({ seed, onBack, setStatus }: ScreenProps) {
  const t = useT();
  // Initial form values (the "default" the reset goes back to).
  const initial = {
    machines: seed?.maquinas ?? "",
    output100: seed?.saida100 ?? "",
    target: seed?.meta ?? "",
  };
  const machines = useField(initial.machines);
  const output100 = useField(initial.output100);
  const target = useField(initial.target);
  const [saving, setSaving] = useState(false);
  // The <input> is seeded, not controlled: to reflect a reset on screen we
  // remount the fields by changing this key.
  const [formKey, setFormKey] = useState(0);

  const data = useMemo(() => {
    const m = parseInteiroPositivo(machines.value);
    const s = parseNumero(output100.value);
    const t = parseNumero(target.value);
    if (m === null || s === null || t === null || s <= 0 || t <= 0) return null;
    const info = normalizarTaxaSatisfactory(s);
    return {
      info,
      resultado: calcularClockParaMeta(m, info.valorNormalizado, t),
    };
  }, [machines.value, output100.value, target.value]);

  const snap = useRef(data);
  snap.current = data;
  const refs = useRef({ machines, output100, target });
  refs.current = { machines, output100, target };

  const copy = () => {
    const d = snap.current;
    if (!d) return setStatus({ text: t.common.fillFirst, tone: "warn" });
    if (!d.resultado.possivelNoLimite) {
      return setStatus({ text: t.clock.overLimit(CLOCK_MAX), tone: "err" });
    }
    const { text, ok } = copyClock(d.resultado.clockNecessario);
    setStatus({
      text: ok ? t.common.copied(text) : t.common.copyFailed,
      tone: ok ? "ok" : "err",
    });
  };

  const copyField = (i: number) => {
    const vals = [
      refs.current.machines.value,
      refs.current.output100.value,
      refs.current.target.value,
    ];
    const v = vals[i]?.trim() ?? "";
    if (!v) return setStatus({ text: t.common.emptyField, tone: "warn" });
    setStatus(copyWithStatus(v, t.common.textCopied, t.common.copyFailed));
  };

  const copyLine = () => {
    const d = snap.current;
    if (!d) return setStatus({ text: t.common.fillFirst, tone: "warn" });
    const r = d.resultado;
    const c = refs.current;
    const line = r.possivelNoLimite
      ? t.clock.summary(c.machines.value, c.target.value, fmt(r.clockNecessario, 4))
      : t.clock.unfeasible;
    setStatus(copyWithStatus(line, t.common.textCopied, t.common.copyFailed));
  };

  const openSave = () => {
    if (!snap.current) return setStatus({ text: t.common.nothingToSave, tone: "warn" });
    setSaving(true);
  };

  const confirmSave = (name: string) => {
    const d = snap.current;
    if (!d) return setSaving(false);
    const c = refs.current;
    const clock = d.resultado.clockNecessario;
    saveEntry({
      nome: name || t.clock.defaultName(c.target.value),
      modo: "clock",
      campos: {
        maquinas: c.machines.value,
        saida100: c.output100.value,
        meta: c.target.value,
      },
      resumo: t.clock.summary(c.machines.value, c.target.value, fmt(clock, 2)),
      clock: d.resultado.possivelNoLimite ? clock : null,
    });
    setSaving(false);
    setStatus({ text: t.common.saved, tone: "ok" });
  };

  const reset = () => {
    machines.set(initial.machines);
    output100.set(initial.output100);
    target.set(initial.target);
    setFormKey((k) => k + 1);
    setStatus(null);
  };

  // Reads live values via the ref so the (once-bound) Esc handler isn't stale.
  const isDirty = () => {
    const c = refs.current;
    return (
      c.machines.value !== initial.machines ||
      c.output100.value !== initial.output100 ||
      c.target.value !== initial.target
    );
  };

  const { index, setIndex } = useFieldNav(
    3,
    { onBack, onCopy: copy, onCopyField: copyField, onCopyLine: copyLine, onSave: openSave, onReset: reset, isDirty },
    saving,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const r = data?.resultado;
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
          defaultName={t.clock.defaultName(target.value || "?")}
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
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          {t.clock.title}
        </text>
        <text fg={theme.muted}>{t.clock.subtitle}</text>

        <Panel title={t.common.dataPanel}>
          <Field key={`maquinas-${formKey}`} label={t.common.machines} value={machines.value} focused={focus === 0} onFocusRequest={focusField(0)} onInput={machines.set} placeholder={t.clock.machinesPlaceholder} numeric="integer" />
          <Field key={`saida100-${formKey}`} label={t.clock.fieldOutput100} value={output100.value} focused={focus === 1} onFocusRequest={focusField(1)} onInput={output100.set} placeholder="/min" hint={t.common.itemsPerMin} numeric="decimal" />
          <Field key={`meta-${formKey}`} label={t.clock.fieldTarget} value={target.value} focused={focus === 2} onFocusRequest={focusField(2)} onInput={target.set} placeholder="/min" hint={t.common.itemsPerMin} numeric="decimal" />
        </Panel>

        {r ? (
          <Panel
            title={t.common.resultPanel}
            borderColor={r.possivelNoLimite ? theme.ok : theme.err}
          >
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>{t.clock.clockNeeded}</text>
              <text fg={clockColor(r.tipoClock)} attributes={TextAttributes.BOLD}>
                {fmt(r.clockNecessario, 4)}%  ({r.tipoClock})
              </text>
            </box>
            <Row label={t.clock.targetPerMachine} value={`${fmtFlex(r.metaPorMaquina)} /min`} />
            <Row label={t.clock.prodAt100} value={`${fmtFlex(r.producaoTotalEm100)} /min`} />
            {data?.info.ajustado ? (
              <Row
                label={t.common.satisfactoryAdjust}
                value={`${data.info.fracao} (${fmtFlex(data.info.valorNormalizado)})`}
                color={theme.warn}
              />
            ) : null}
            {r.possivelNoLimite ? (
              <Row label={t.clock.status} value={t.clock.validUpTo(CLOCK_MAX)} color={theme.ok} strong />
            ) : (
              <box flexDirection="column">
                <Row label={t.clock.status} value={t.clock.unfeasible} color={theme.err} strong />
                <Row label={t.clock.excessOver(CLOCK_MAX)} value={`${fmt(r.excessoDeClock, 2)}%`} color={theme.err} />
                <Row label={t.clock.maxProdAt(CLOCK_MAX)} value={`${fmtFlex(r.producaoMaximaNoLimite)} /min`} />
                <Row label={t.clock.missing} value={`${fmtFlex(r.faltariaNoMax)} /min`} color={theme.warn} />
                <Row label={t.clock.minMachinesAt(CLOCK_MAX)} value={`${r.maquinasMinimasNoMax}`} />
                <Row label={t.clock.addMachines} value={`+${r.maquinasAdicionaisNecessarias}`} color={theme.warn} />
              </box>
            )}
          </Panel>
        ) : (
          <text fg={theme.muted}>{t.clock.emptyHint}</text>
        )}
      </scrollbox>
    </box>
  );
}
