import { lazy, Suspense, type ComponentType } from 'react';
import { ClientOnly } from './ClientOnly';

/**
 * The interactive surfaces, loaded on demand so a prose page never pays for the playground.
 * They are components rather than routes, so a page composes them like any other block.
 */
const load = (factory: () => Promise<{ default: ComponentType }>) => {
  const Loaded = lazy(factory);
  return function Interactive() {
    return (
      <ClientOnly placeholder={<p className="site-muted">Loading…</p>}>
        <Suspense fallback={<p className="site-muted">Loading…</p>}>
          <Loaded />
        </Suspense>
      </ClientOnly>
    );
  };
};

export const Playground = load(() =>
  import('../interactive/Playground').then((m) => ({ default: m.PlaygroundPage })),
);
export const ThemeEditor = load(() =>
  import('../interactive/ThemeEditor').then((m) => ({ default: m.ThemeEditorPage })),
);

const referencePages: Record<string, () => Promise<{ default: ComponentType }>> = {
  'data-table-props': () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiDataTablePage })),
  'column-def': () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiColumnDefPage })),
  'table-instance': () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiInstancePage })),
  'table-state': () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiStatePage })),
  hooks: () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiHooksPage })),
  utilities: () =>
    import('../interactive/api/generatedPages').then((m) => ({ default: m.ApiUtilitiesPage })),
  slots: () => import('../interactive/api/ApiSlotsPage').then((m) => ({ default: m.ApiSlotsPage })),
  handlers: () =>
    import('../interactive/api/ApiHandlersPage').then((m) => ({ default: m.ApiHandlersPage })),
  'theme-tokens': () =>
    import('../interactive/api/ApiTokensPage').then((m) => ({ default: m.ApiTokensPage })),
  'localization-keys': () =>
    import('../interactive/api/ApiLocalizationPage').then((m) => ({
      default: m.ApiLocalizationPage,
    })),
  icons: () => import('../interactive/api/ApiIconsPage').then((m) => ({ default: m.ApiIconsPage })),
};

// Wrapped once at module scope: a component created during render would remount on every
// re-render and lose the table's own state.
const referenceComponents: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(referencePages).map(([id, factory]) => [id, load(factory)]),
);

/** Renders one generated reference table. The content is generated; only the id is authored. */
export function ApiReference({ id }: { id: string }) {
  const Loaded = referenceComponents[id];
  if (!Loaded) return <p role="alert">Unknown reference page “{id}”.</p>;
  return <Loaded />;
}
