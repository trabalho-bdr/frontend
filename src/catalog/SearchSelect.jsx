import { createPortal } from 'react-dom';
import { useId, useState, useRef, useEffect } from 'react';
const clean = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export default function SearchSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Todos',
}) {
  const id = useId(),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [active, setActive] = useState(0),
    [position, setPosition] = useState({}),
    search = useRef(null),
    trigger = useRef(null),
    popup = useRef(null);
  const all = options.map((item) =>
      typeof item === 'object'
        ? { ...item, value: String(item.value) }
        : { value: String(item), label: String(item) },
    ),
    rows = all.filter((row) =>
      clean(row.label + ' ' + (row.description || '')).includes(clean(query)),
    ),
    selected = all.find((row) => row.value === String(value));
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect(),
        width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24),
        below = window.innerHeight - rect.bottom - 16,
        above = rect.top - 16,
        up = below < 230 && above > below;
      setPosition({
        position: 'fixed',
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
        maxWidth: 'none',
        top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 370)),
        bottom: 'auto',
        maxHeight: 'calc(100dvh - 24px)',
        overflowY: 'auto',
        '--choice-height': Math.max(100, Math.min(280, (up ? above : below) - 70)) + 'px',
      });
    };
    place();
    search.current?.focus();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  const choose = (row) => {
    if (row.disabled) return;
    onChange(row.value);
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  };
  const key = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      setActive((n) =>
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? rows.length - 1
            : Math.max(0, Math.min(rows.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[active]) choose(rows[active]);
    }
  };
  useEffect(() => {
    if (open) document.getElementById(id + '-' + active)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);
  return (
    <div
      className="party-select search-select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget) && !popup.current?.contains(e.relatedTarget))
          setOpen(false);
      }}
    >
      <span id={id + '-label'} className="choice-label">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        className="party-select-trigger"
        aria-labelledby={id + '-label ' + id + '-value'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
          setActive(0);
        }}
      >
        <span id={id + '-value'}>{selected?.label || value || placeholder}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            className="party-select-popover"
            style={position}
            onBlur={(e) => {
              if (
                !e.currentTarget.contains(e.relatedTarget) &&
                !trigger.current?.contains(e.relatedTarget)
              )
                setOpen(false);
            }}
          >
            <input
              ref={search}
              type="search"
              role="combobox"
              aria-label={'Buscar: ' + label}
              placeholder="Digite para encontrar…"
              value={query}
              aria-expanded="true"
              aria-controls={id + '-list'}
              aria-autocomplete="list"
              aria-activedescendant={rows[active] ? id + '-' + active : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={key}
            />
            <div
              className="party-select-list"
              id={id + '-list'}
              role="listbox"
              aria-labelledby={id + '-label'}
            >
              {rows.map((row, i) => (
                <button
                  type="button"
                  role="option"
                  id={id + '-' + i}
                  key={row.value}
                  aria-selected={row.value === String(value)}
                  aria-disabled={!!row.disabled}
                  className={i === active ? 'is-active' : ''}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(row)}
                >
                  {row.color && (
                    <span
                      className="party-select-dot"
                      style={{ '--party-color': row.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="choice-option-text">
                    <strong>{row.label}</strong>
                    {row.description && <small>{row.description}</small>}
                  </span>
                  {row.value === String(value) && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
            {!rows.length && <p role="status">Nenhuma opção encontrada.</p>}
          </div>,
          document.body,
        )}
    </div>
  );
}
