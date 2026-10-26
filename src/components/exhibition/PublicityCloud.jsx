import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CLOUD_FONT_STACK,
  CLOUD_LIMIT,
  CLOUD_STOPS,
  layoutCloud,
  rankCategories,
  rowKey,
  rowLabel,
  selectCloudWords,
} from './publicityCloud.js';
import './publicity-cloud.css';

const money = (value) =>
  value == null
    ? '—'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
const percent = (value) =>
  value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

let canvas;
const measureText = (text, size, weight) => {
  canvas ||= document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${weight} ${size}px ${CLOUD_FONT_STACK}`;
  return context.measureText(text).width;
};

/** Largura do próprio componente (não da janela), atualizada ao redimensionar. */
function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    setWidth(Math.floor(node.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(Math.floor(entry.contentRect.width)));
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

/** Libera o layout depois que a Manrope carrega e o recalcula se novas fontes chegarem. */
function useCloudFont() {
  const [state, setState] = useState({ ready: false, epoch: 0 });
  useEffect(() => {
    let alive = true;
    const fonts = document.fonts;
    if (!fonts?.load) {
      setState({ ready: true, epoch: 1 });
      return undefined;
    }
    const settle = () => alive && setState((s) => ({ ready: true, epoch: s.epoch + 1 }));
    const timeout = setTimeout(settle, 2500);
    Promise.all([600, 700, 800].map((weight) => fonts.load(`${weight} 32px Manrope`))).then(
      settle,
      settle,
    );
    const again = () => alive && setState((s) => (s.ready ? { ...s, epoch: s.epoch + 1 } : s));
    fonts.addEventListener?.('loadingdone', again);
    return () => {
      alive = false;
      clearTimeout(timeout);
      fonts.removeEventListener?.('loadingdone', again);
    };
  }, []);
  return state;
}

export default function PublicityCloud({ rows, selectedKey, onSelect }) {
  const id = useId();
  const stage = useRef(null);
  const width = useElementWidth(stage);
  const font = useCloudFont();
  const [hover, setHover] = useState(null);
  const [focused, setFocused] = useState(null);
  const selection = useMemo(() => selectCloudWords(rows, CLOUD_LIMIT), [rows]);
  const everything = useMemo(() => {
    const ranked = rankCategories(rows);
    const rest = rows.filter((row) => !ranked.includes(row));
    return [...ranked, ...rest];
  }, [rows]);
  const maximum = selection.shown[0]?.valor || 1;
  const layout = useMemo(
    () =>
      font.ready && width > 0
        ? layoutCloud(selection.shown, {
            width,
            measure: measureText,
            minHeight: width < 520 ? 240 : 300,
          })
        : { height: width < 520 ? 240 : 300, items: [] },
    // epoch força o recálculo quando a fonte exibida muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, width, font.ready, font.epoch],
  );
  const previewKey = hover || focused;
  const activeKey = previewKey || selectedKey;
  const active = activeKey ? rows.find((row) => rowKey(row) === activeKey) : null;
  const keys = layout.items.map((item) => rowKey(item.row));

  const move = (index, delta) => {
    const next = (index + delta + keys.length) % keys.length;
    document.getElementById(`${id}-w${next}`)?.focus();
  };
  const toggle = (row) => onSelect(rowKey(row) === selectedKey ? null : row);

  return (
    <div className="q9-cloud">
      <div className="q9-cloud-stage" ref={stage}>
        <svg
          className="q9-cloud-svg"
          width={width || '100%'}
          height={layout.height}
          viewBox={`0 0 ${width || 1} ${layout.height}`}
          role="group"
          aria-label={`Nuvem com as ${layout.items.length} categorias de maior valor contratado`}
          data-dimmed={activeKey ? (previewKey ? 'preview' : 'selected') : undefined}
        >
          {layout.items.map((item, index) => {
            const key = rowKey(item.row);
            const isSelected = key === selectedKey;
            const isPreview = key === previewKey;
            const label = rowLabel(item.row);
            const block = item.lines.length * item.lineHeight;
            return (
              <g
                key={key}
                className="q9-word-slot"
                style={{
                  transform: `translate(${item.cx}px, ${item.cy}px)`,
                  animationDelay: `${Math.min(index, 12) * 18}ms`,
                }}
              >
                <g
                  id={`${id}-w${index}`}
                  className="q9-word"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${label}, ${item.row.grupo}: ${money(item.row.valor)} contratados, ${percent(item.row.participacao)} da publicidade identificada`}
                  data-selected={isSelected || undefined}
                  data-preview={isPreview || undefined}
                  data-active={key === activeKey || undefined}
                  onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(key)}
                  onPointerLeave={() => setHover((current) => (current === key ? null : current))}
                  onFocus={(event) =>
                    event.currentTarget.matches(':focus-visible') && setFocused(key)
                  }
                  onBlur={() => setFocused((current) => (current === key ? null : current))}
                  onClick={() => toggle(item.row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle(item.row);
                    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      move(index, 1);
                    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      move(index, -1);
                    }
                  }}
                >
                  <rect
                    className="q9-word-hit"
                    x={-item.hw / 2}
                    y={-item.hh / 2}
                    width={item.hw}
                    height={item.hh}
                    rx="3"
                  />
                  <g className="q9-word-body" color={item.color} style={{ color: item.color }}>
                    {item.lines.map((line, lineIndex) => (
                      <text
                        key={lineIndex}
                        x="0"
                        y={-block / 2 + item.lineHeight * (lineIndex + 0.5)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={item.font}
                        fontWeight={item.weight}
                        fill={item.color}
                      >
                        {line}
                      </text>
                    ))}
                    <rect
                      className="q9-word-mark"
                      x={-item.textW / 2}
                      y={block / 2 + 1}
                      width={item.textW}
                      height="3"
                      fill={item.color}
                    />
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
        {!layout.items.length && (
          <p className="q9-cloud-wait" role="status">
            {font.ready ? 'Organizando as palavras…' : 'Carregando a tipografia da nuvem…'}
          </p>
        )}
      </div>

      <div
        className="q9-cloud-readout"
        data-mode={active ? (previewKey ? 'preview' : 'selected') : 'idle'}
        aria-live={previewKey ? 'off' : 'polite'}
      >
        {active ? (
          <>
            <span className="q9-cloud-mode">{previewKey ? 'Em destaque' : 'Selecionada'}</span>
            <strong>{rowLabel(active)}</strong>
            <span className="q9-cloud-group">{active.grupo}</span>
            <span className="q9-cloud-figures">
              <b>{money(active.valor)}</b> contratados · <b>{percent(active.participacao)}</b> da
              publicidade identificada
            </span>
          </>
        ) : (
          <span className="q9-cloud-hint">
            Passe o mouse, use as setas do teclado ou toque em uma palavra para ver o valor. Clique
            ou toque para selecionar.
          </span>
        )}
      </div>

      <div className="q9-cloud-legend">
        <div className="q9-cloud-ramp" aria-hidden="true">
          <span>menor</span>
          <i style={{ background: `linear-gradient(90deg, ${CLOUD_STOPS.join(', ')})` }} />
          <span>maior valor</span>
        </div>
        <p className="q9-cloud-legend-main">
          Tamanho e intensidade da cor indicam maior valor contratado.
        </p>
        <p className="q9-cloud-legend-note">
          A cor segue um mapa de calor (azul = menor, vermelho = maior) e mede o peso financeiro,
          não o partido. As dimensões seguem a raiz quadrada do valor
          (maior categoria = {money(maximum)}); a escala preserva a ordem, mas a área das palavras
          não é proporcional ao valor.
        </p>
        <p className="q9-cloud-count" role="status">
          {selection.eligible
            ? `Mostrando ${selection.shown.length} de ${selection.eligible} categorias com valor positivo.`
            : 'Nenhuma categoria com valor positivo neste recorte.'}
          {selection.hidden > 0 && ` As ${selection.hidden} menores estão no detalhamento.`}
          {selection.excluded > 0 &&
            ` ${selection.excluded} com saldo não positivo ficam fora da nuvem, mas contam nas somas e no detalhamento.`}
        </p>
      </div>

      <details className="q9-cloud-detail">
        <summary>Detalhamento das {everything.length} categorias</summary>
        <ol>
          {everything.map((row) => {
            const key = rowKey(row);
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={key === selectedKey}
                  onClick={() => toggle(row)}
                >
                  <strong>{rowLabel(row)}</strong>
                  <small>{row.grupo}</small>
                  <b>{money(row.valor)}</b>
                  <em>{percent(row.participacao)}</em>
                </button>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
