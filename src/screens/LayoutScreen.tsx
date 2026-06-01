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

// LAYOUT COMPLETO a partir da entrada desejada (o modo "poderoso").
export function LayoutScreen({ seed, onBack, setStatus }: ScreenProps) {
  // Valores iniciais do formulário (o "padrão" pro qual o reset volta).
  const inicial = {
    metaEntrada: seed?.metaEntrada ?? "",
    entrada100: seed?.entrada100 ?? "",
    saida100: seed?.saida100 ?? "",
    clock: seed?.clock ?? String(CLOCK_PADRAO),
    fileiras: seed?.fileiras ?? "1",
  };
  const metaEntrada = useField(inicial.metaEntrada);
  const entrada100 = useField(inicial.entrada100);
  const saida100 = useField(inicial.saida100);
  const clock = useField(inicial.clock);
  const fileiras = useField(inicial.fileiras);
  // O <input> é semeado, não controlado: pra refletir um valor que ajustamos
  // por código (clamp ao mínimo, ou um reset) remontamos os campos trocando
  // estas keys — filKey só pras fileiras, formKey pro resto do formulário.
  const [filKey, setFilKey] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const dados = useMemo(() => {
    const meta = parseNumero(metaEntrada.value);
    const ent = parseNumero(entrada100.value);
    const cl = parseNumero(clock.value);
    const fil = parseInteiroPositivo(fileiras.value);
    if (meta === null || ent === null || cl === null || fil === null) return null;

    const sai = saida100.value.trim() === "" ? null : parseNumero(saida100.value);
    const infoEnt = normalizarTaxaSatisfactory(ent);
    const infoSai = sai !== null ? normalizarTaxaSatisfactory(sai) : null;
    const saiNorm = infoSai ? infoSai.valorNormalizado : null;

    try {
      const base = calcularLayoutPorEntrada(meta, infoEnt.valorNormalizado, fil, cl, saiNorm);
      return { ok: true as const, base, infoEnt, infoSai };
    } catch (e) {
      return { ok: false as const, erro: (e as Error).message };
    }
  }, [metaEntrada.value, entrada100.value, saida100.value, clock.value, fileiras.value]);

  // Mínimo de fileiras recomendado, atualizado conforme a meta é digitada.
  const minFileiras = useMemo(() => {
    const meta = parseNumero(metaEntrada.value);
    return meta === null ? null : fileirasMinimasRecomendadas(meta);
  }, [metaEntrada.value]);
  const filAtual = parseInteiroPositivo(fileiras.value);
  const filInsuficiente =
    minFileiras !== null && filAtual !== null && filAtual < minFileiras;

  // Reseta o input de fileiras pro valor mínimo (e remonta pra refletir na tela).
  const ajustarFileiras = (min: number) => {
    fileiras.set(String(min));
    setFilKey((k) => k + 1);
  };

  // Quando o mínimo recomendado MUDA (a meta foi editada em tela), o campo de
  // fileiras passa a obedecê-lo — pra cima OU pra baixo. A ideia é sempre
  // partir do mínimo possível; se quiser mais (por tamanho), o usuário digita
  // na mão. Sem isso, ao baixar a meta o campo ficaria preso num valor antigo.
  //
  // Mas pulamos a 1ª execução (mount): ao reabrir um layout salvo com fileiras
  // acima do mínimo (ex.: 6 fileiras quando o mínimo é 5), forçar pro mínimo
  // mudaria totalMaquinas/clockExato e violaria o "reabrir exatamente como foi
  // digitado". O seed fica intocado; o clamp só vale pra edições posteriores.
  const minFileirasMontou = useRef(false);
  useEffect(() => {
    if (!minFileirasMontou.current) {
      minFileirasMontou.current = true;
      return;
    }
    if (minFileiras === null) return;
    const atual = parseInteiroPositivo(fileiras.value);
    if (atual !== minFileiras) ajustarFileiras(minFileiras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minFileiras]);

  const snap = useRef(dados);
  snap.current = dados;
  const refs = useRef({ metaEntrada, entrada100, saida100, clock, fileiras });
  refs.current = { metaEntrada, entrada100, saida100, clock, fileiras };

  const copiar = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: "Sem resultado válido pra copiar.", tone: "warn" });
    const { texto, ok } = copiarClock(d.base.clockExato);
    setStatus({
      text: ok ? `Clock exato copiado: ${texto}` : "Falhou ao copiar.",
      tone: ok ? "ok" : "err",
    });
  };

  const abrirSalvar = () => {
    const d = snap.current;
    if (!d || !d.ok) return setStatus({ text: "Sem resultado válido pra salvar.", tone: "warn" });
    setSalvando(true);
  };

  const confirmarSalvar = (nome: string) => {
    const d = snap.current;
    if (!d || !d.ok) return setSalvando(false);
    const c = refs.current;
    salvarEntrada({
      nome: nome || `Layout ${c.metaEntrada.value}/min`,
      modo: "layout",
      campos: {
        metaEntrada: c.metaEntrada.value,
        entrada100: c.entrada100.value,
        saida100: c.saida100.value,
        clock: c.clock.value,
        fileiras: c.fileiras.value,
      },
      resumo: `${d.base.totalMaquinas} máq • ${c.fileiras.value} fileira(s) • clock ${fmt(d.base.clockExato, 2)}%`,
      clock: d.base.clockExato,
    });
    setSalvando(false);
    setStatus({ text: "Salvo no histórico.", tone: "ok" });
  };

  const resetar = () => {
    metaEntrada.set(inicial.metaEntrada);
    entrada100.set(inicial.entrada100);
    saida100.set(inicial.saida100);
    clock.set(inicial.clock);
    fileiras.set(inicial.fileiras);
    setFormKey((k) => k + 1);
    setFilKey((k) => k + 1);
    setStatus(null);
  };

  const { index, setIndex } = useFieldNav(
    5,
    { onBack, onCopy: copiar, onSave: abrirSalvar, onReset: resetar },
    salvando,
  );
  useEffect(() => setStatus(null), [setStatus]);

  const foco = salvando ? -1 : index;
  // Clique do mouse num campo move o foco de teclado pra ele (sincroniza a
  // borda amarela com onde o OpenTUI já jogou o foco nativo do <input>).
  const focar = (n: number) => () => {
    if (!salvando) setIndex(n);
  };

  // Ao sair do campo Fileiras, garante que não ficou nada abaixo do mínimo
  // (durante a digitação deixamos livre pra permitir números de vários dígitos).
  const filFocado = foco === 4;
  const filEraFocado = useRef(filFocado);
  useEffect(() => {
    if (filEraFocado.current && !filFocado) {
      const min = minFileiras ?? 1;
      const atual = parseInteiroPositivo(fileiras.value);
      if (atual === null || atual < min) ajustarFileiras(min);
    }
    filEraFocado.current = filFocado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filFocado, minFileiras]);

  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      {salvando ? (
        <SavePrompt
          defaultName={`Layout ${metaEntrada.value || "?"}/min`}
          onConfirm={confirmarSalvar}
          onCancel={() => setSalvando(false)}
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
          <Field key={`metaEntrada-${formKey}`} label="Entrada total" value={metaEntrada.value} focused={foco === 0} onFocusRequest={focar(0)} onInput={metaEntrada.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`entrada100-${formKey}`} label="Entrada por máquina a 100%" value={entrada100.value} focused={foco === 1} onFocusRequest={focar(1)} onInput={entrada100.set} placeholder="/min" hint="itens/min" numeric="decimal" />
          <Field key={`saida100-${formKey}`} label="Saída por máquina a 100%" value={saida100.value} focused={foco === 2} onFocusRequest={focar(2)} onInput={saida100.set} placeholder="opcional" hint="opcional" numeric="decimal" />
          <Field key={`clock-${formKey}`} label="Clock" value={clock.value} focused={foco === 3} onFocusRequest={focar(3)} onInput={clock.set} placeholder="%" hint="% (padrão 250)" numeric="decimal" />
          <Field
            key={`fileiras-${filKey}-${formKey}`}
            label="Fileiras"
            value={fileiras.value}
            focused={foco === 4}
            onFocusRequest={focar(4)}
            onInput={fileiras.set}
            placeholder="ex: 2"
            hint={minFileiras !== null ? `mín. ${minFileiras}` : undefined}
            hintColor={filInsuficiente ? theme.warn : theme.ok}
            numeric="integer"
          />
        </Panel>

        {!dados ? (
          <text fg={theme.muted}>
            Preencha entrada total, entrada/100%, clock e fileiras.
            {minFileiras !== null ? ` Recomendo ao menos ${minFileiras} fileira(s).` : ""}
          </text>
        ) : !dados.ok ? (
          <Panel title="Não deu" borderColor={theme.err}>
            <text fg={theme.err}>{dados.erro}</text>
          </Panel>
        ) : (
          <Panel title="Layout mínimo" borderColor={theme.ok}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textDim}>Clock exato</text>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>{fmt(dados.base.clockExato, 4)}%</text>
            </box>
            <Row label="Total de máquinas" value={`${dados.base.totalMaquinas}`} strong />
            <Row label="Máquinas por fileira" value={`${dados.base.maquinasPorFileiraMinimas}`} />
            <Row label="Entrada por fileira (clock exato)" value={`${fmtFlex(dados.base.entradaPorFileiraNoClockExato)} /min`} strong />
            <Row label="Entrada por fileira (clock teto)" value={`${fmtFlex(dados.base.entradaPorFileiraNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label="Entrada total no clock teto" value={`${fmtFlex(dados.base.entradaTotalNoClockEscolhido)} /min`} color={theme.muted} />
            <Row label="Excesso no clock teto" value={`${fmtFlex(dados.base.excessoEntradaNoClockEscolhido)} /min`} color={theme.warn} />
            {dados.base.saidaTotalNoClockExato !== undefined ? (
              <Row label="Saída total (clock exato)" value={`${fmtFlex(dados.base.saidaTotalNoClockExato)} /min`} color={theme.over} />
            ) : null}
          </Panel>
        )}
      </scrollbox>
    </box>
  );
}
