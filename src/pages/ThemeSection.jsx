import { themeExplorations } from '../data/themeExplorations.js';
import './money-section.css';
export default function ThemeSection({ topic, active, onGo, children }) {
  const theme = themeExplorations[topic],
    selected = theme.items.find((item) => item.id === active) || theme.items[0];
  return (
    <section className="money-section theme-section">
      <header className="money-section-heading">
        <span>{theme.title.toUpperCase()}</span>
        <h1>{theme.heading}</h1>
        <p>{theme.description}</p>
      </header>
      <nav
        className="money-threads"
        style={{ '--thread-count': theme.items.length }}
        aria-label={'Explorações de ' + theme.title}
      >
        {theme.items.map((item) => (
          <button
            key={item.id}
            aria-current={item.id === selected.id ? 'page' : undefined}
            onClick={() => onGo(item.page, item.id, topic)}
          >
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </nav>
      <aside className="theme-reading-guide" aria-label="Como esta exploração responde à pergunta">
        <p>
          {selected.question && <b>Pergunta {String(selected.question).padStart(2, '0')} · </b>}
          {selected.guide}
        </p>
        <p>
          <b>Limite desta leitura: </b>
          {selected.limit}
        </p>
      </aside>
      {children}
    </section>
  );
}
