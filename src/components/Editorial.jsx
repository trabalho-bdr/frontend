export function PrintLabel({ children, tone = 'green', className = '' }) {
  return <span className={`br-label br-label-${tone} ${className}`}>{children}</span>;
}
export function EditorialHeading({ number, kicker, title, children, aside }) {
  return (
    <header className="br-heading">
      <div className="br-heading-title">
        <span className="br-folio">{number}</span>
        <div>
          <PrintLabel>{kicker}</PrintLabel>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="br-heading-copy">
        {children}
        {aside}
      </div>
    </header>
  );
}
export function SourceNote({ children }) {
  return <p className="br-source-note">{children}</p>;
}
