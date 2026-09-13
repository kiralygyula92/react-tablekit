import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ViewContext } from './context';

/**
 * Portals floating UI (tooltips, menus, popovers) to `document.body` inside a `.tk-portal`
 * wrapper that carries the table's theme variables, so tokens and presets still apply.
 */
export function Portal({ children }: { children: ReactNode }) {
  const view = useContext(ViewContext);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="tk-portal"
      data-theme={
        view?.cssVars
          ? view.theme.name
          : (view?.props as { 'data-theme'?: string } | undefined)?.['data-theme']
      }
      data-color-scheme={view?.colorScheme}
      data-unstyled={view?.props.unstyled || undefined}
      dir={view?.props.dir}
      style={view?.cssVars}
    >
      {children}
    </div>,
    document.body,
  );
}
