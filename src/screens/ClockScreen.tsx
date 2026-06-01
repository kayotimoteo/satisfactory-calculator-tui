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
  CLOCK_MAX,
  calcularClockParaMeta,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import type { ScreenProps } from "./types";

// JUST THE CLOCK: how many machines I have, how much each produces at 100% and
// what the target is -> which clock I need. The same calc the script already did.
export function ClockScreen({ seed, onBack, setStatus }: ScreenProps) {
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
    if (!d) return setStatus({ text: "Preencha os campos primeiro.", tone: "warn" });
    if (!d.resultado.possivelNoLimite) {
      return setStatus({
        text: `Clock passa de ${CLOCK_MAX}% — não copiei.`,
        tone: "err",
      });
    }
    const { text, ok } = copyClock(d.resultado.clockNecessario);
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
    const clock = d.resultado.clockNecessario;
    saveEntry({
      nome: name || `Clock p/ ${c.target.value}/min`,
      modo: "clock",
      campos: {
        maquinas: c.machines.value,
        saida100: c.output100.value,
        meta: c.target.value,
      },
      resumo: `${c.machines.value} máq • meta ${c.target.value}/min → ${fmt(clock, 2)}%`,
      clock: d.resultado.possivelNoLimite ? clock : null,
    });
    setSaving(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
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
    { onBack, onCopy: copy, onSave: openSave, onReset: reset, isDirty },
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
          defaultName={`Clock p/ ${target.value || "?"}/min`}
          onConfirm={confirmSave}
          onCancel={() => setSaving(false)}
        />
      ) : null}

      <scrollbox
        focused={false}
        flexGrow={1}
        style={{ contentOptions: { flexDirection: "column", gap: 1 } }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          Clock para meta
        </text>
        <text fg={theme.muted}>
          Tenho N máquinas e quero saber o clock pra bater uma produção.
        </text>

        <Panel title="Dados">
          <Field key={`maquinas-${formKey}`} label="Máquinas" value={machines.value} focused={focus === 0} onFocusRequest={focusField(0)} onInput={machines.set} placeholder="ex: 4" numeric="integer" />
          <Field key={`saida100-${formKey}`} label="Saída por máquina a 100%" value={output100.value} focused={focus === 1} onFocusRequest={focusField(1)} onInput={output100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`meta-${formKey}`} label="Meta total de produção" value={target.value} focused={focus === 2} onFocusRequest={focusField(2)} onInput={target.set} placeholder="/min" hint="itens/min" numeric="decimal" />
        </Panel>

        {r ? (
          <Panel
            title="Resultado"
            borderColor={r.possivelNoLimite ? theme.ok : theme.err}
          >
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>Clock necessário</text>
              <text fg={clockColor(r.tipoClock)} attributes={TextAttributes.BOLD}>
                {fmt(r.clockNecessario, 4)}%  ({r.tipoClock})
              </text>
            </box>
            <Row label="Meta por máquina" value={`${fmtFlex(r.metaPorMaquina)} /min`} />
            <Row label="Produção em 100%" value={`${fmtFlex(r.producaoTotalEm100)} /min`} />
            {data?.info.ajustado ? (
              <Row
                label="Ajuste Satisfactory"
                value={`${data.info.fracao} (${fmtFlex(data.info.valorNormalizado)})`}
                color={theme.warn}
              />
            ) : null}
            {r.possivelNoLimite ? (
              <Row label="Status" value={`VÁLIDO até ${CLOCK_MAX}%`} color={theme.ok} strong />
            ) : (
              <box flexDirection="column">
                <Row label="Status" value="INVIÁVEL" color={theme.err} strong />
                <Row label={`Excesso sobre ${CLOCK_MAX}%`} value={`${fmt(r.excessoDeClock, 2)}%`} color={theme.err} />
                <Row label={`Produção máx em ${CLOCK_MAX}%`} value={`${fmtFlex(r.producaoMaximaNoLimite)} /min`} />
                <Row label="Faltaria" value={`${fmtFlex(r.faltariaNoMax)} /min`} color={theme.warn} />
                <Row label={`Máquinas mín. em ${CLOCK_MAX}%`} value={`${r.maquinasMinimasNoMax}`} />
                <Row label="Adicionar máquinas" value={`+${r.maquinasAdicionaisNecessarias}`} color={theme.warn} />
              </box>
            )}
          </Panel>
        ) : (
          <text fg={theme.muted}>Preencha máquinas, saída e meta para ver o clock.</text>
        )}
      </scrollbox>
    </box>
  );
}
