/** Page frontmatter (PPDS §8.3). `title` and `description` are written once and reused. */
export interface Frontmatter {
  title: string;
  description: string;
  /** Archetype from PPDS §6. Drives which blocks the conformance check requires. */
  archetype:
    'overview' | 'capability' | 'features-index' | 'reference' | 'getting-started' | 'editorial';
  capabilityId?: string;
  /** Library symbols this page documents. Drives `## API` links and the reverse `usedBy` list. */
  symbols?: string[];
  group?: string;
  /**
   * Drop the right-hand table of contents and give the page the full content width. For pages
   * whose subject is a wide thing — the playground's table, the theme editor's preview — where
   * 220px of rail costs more than the three headings it would list.
   */
  wide?: boolean;
  plan?: 'free';
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  /** Resource chips, rendered from data rather than written per page. */
  links?: { issues?: string; source?: string; spec?: string };
}

/** One heading in the right-rail table of contents (PPDS §7.4). */
export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** A page as `scripts/build-content.mjs` recorded it. The body is loaded separately. */
export interface ContentPage {
  /** Canonical route, always with a trailing slash. */
  pathname: string;
  /** Path under `content/`, e.g. `react-tablekit/features/sorting/index.mdx`. */
  file: string;
  frontmatter: Frontmatter;
  headings: Heading[];
  /** Ids of the demos this page embeds, verified to exist at build time. */
  demos: string[];
}
