import type { ReactNode } from 'react';

/** Info / warning callout. Anti-patterns are shown as marked wrong code inside a warning. */
export function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning';
  children: ReactNode;
}) {
  return (
    <aside className={`callout callout--${type}`} role={type === 'warning' ? 'note' : undefined}>
      <p className="callout__label">{type === 'warning' ? 'Careful' : 'Note'}</p>
      <div className="callout__body">{children}</div>
    </aside>
  );
}
