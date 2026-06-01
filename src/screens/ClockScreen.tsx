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
  CLOCK_MAX,
  calcularClockParaMeta,
  fmt,
  fmtFlex,
  normalizarTaxaSatisfactory,
  parseInteiroPositivo,
  parseNumero,
} from "../lib/satisfactory";
import type { ScreenProps } from "./types";

// SÓ O CLOCK: quantas máquinas eu tenho, quanto cada uma produz a 100% e qual
// é a meta -> qual clock preciso. É o cálculo que o script já fazia.
export function ClockScreen({ seed, onBack, setStatus }: ScreenProps) {
  // Valores iniciais do formulário (o "padrão" pro qual o reset volta).
  const inicial = {
    maquinas: seed?.maquinas ?? "",
    saida100: seed?.saida100 ?? "",
    meta: seed?.meta ?? "",
  };
  const maquinas = useField(inicial.maquinas);
  const saida100 = useField(inicial.saida100);
  const meta = useField(inicial.meta);
  const [salvando, setSalvando] = useState(false);
  // O <input> é semeado, não controlado: pra refletir um reset na tela
  // remontamos os campos trocando esta key.
  const [formKey, setFormKey] = useState(0);

  const dados = useMemo(() => {
    const m = parseInteiroPositivo(maquinas.value);
    const s = parseNumero(saida100.value);
    const t = parseNumero(meta.value);
    if (m === null || s === null || t === null || s <= 0 || t <= 0) return null;
    const info = normalizarTaxaSatisfactory(s);
    return {
      info,
      resultado: calcularClockParaMeta(m, info.valorNormalizado, t),
    };
  }, [maquinas.value, saida100.value, meta.value]);

  const snap = useRef(dados);
  snap.current = dados;
  const refs = useRef({ maquinas, saida100, meta });
  refs.current = { maquinas, saida100, meta };

  const copiar = () => {
    const d = snap.current;
    if (!d) return setStatus({ text: "Preencha os campos primeiro.", tone: "warn" });
    if (!d.resultado.possivelNoLimite) {
      return setStatus({
        text: `Clock passa de ${CLOCK_MAX}% — não copiei.`,
        tone: "err",
      });
    }
    const { texto, ok } = copiarClock(d.resultado.clockNecessario);
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
    const clock = d.resultado.clockNecessario;
    salvarEntrada({
      nome: nome || `Clock p/ ${c.meta.value}/min`,
      modo: "clock",
      campos: {
        maquinas: c.maquinas.value,
        saida100: c.saida100.value,
        meta: c.meta.value,
      },
      resumo: `${c.maquinas.value} máq • meta ${c.meta.value}/min → ${fmt(clock, 2)}%`,
      clock: d.resultado.possivelNoLimite ? clock : null,
    });
    setSalvando(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
  };

  const resetar = () => {
    maquinas.set(inicial.maquinas);
    saida100.set(inicial.saida100);
    meta.set(inicial.meta);
    setFormKey((k) => k + 1);
    setStatus(null);
  };

  const { index, setIndex } = useFieldNav(
    3,
    { onBack, onCopy: copiar, onSave: abrirSalvar, onReset: resetar },
    salvando,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const r = dados?.resultado;
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
          defaultName={`Clock p/ ${meta.value || "?"}/min`}
          onConfirm={confirmarSalvar}
          onCancel={() => setSalvando(false)}
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
          <Field key={`maquinas-${formKey}`} label="Máquinas" value={maquinas.value} focused={foco === 0} onFocusRequest={focar(0)} onInput={maquinas.set} placeholder="ex: 4" numeric="integer" />
          <Field key={`saida100-${formKey}`} label="Saída por máquina a 100%" value={saida100.value} focused={foco === 1} onFocusRequest={focar(1)} onInput={saida100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`meta-${formKey}`} label="Meta total de produção" value={meta.value} focused={foco === 2} onFocusRequest={focar(2)} onInput={meta.set} placeholder="/min" hint="itens/min" numeric="decimal" />
        </Panel>

        {r ? (
          <Panel
            title="Resultado"
            borderColor={r.possivelNoLimite ? theme.ok : theme.err}
          >
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>Clock necessário</text>
              <text fg={corDoClock(r.tipoClock)} attributes={TextAttributes.BOLD}>
                {fmt(r.clockNecessario, 4)}%  ({r.tipoClock})
              </text>
            </box>
            <Row label="Meta por máquina" value={`${fmtFlex(r.metaPorMaquina)} /min`} />
            <Row label="Produção em 100%" value={`${fmtFlex(r.producaoTotalEm100)} /min`} />
            {dados?.info.ajustado ? (
              <Row
                label="Ajuste Satisfactory"
                value={`${dados.info.fracao} (${fmtFlex(dados.info.valorNormalizado)})`}
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
