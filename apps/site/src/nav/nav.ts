import config from '../../content/react-tablekit/plugin.config.json';
import navData from '../../content/react-tablekit/nav.json';
import titles from '../../content/react-tablekit/titles.json';

/**
 * The plugin descriptor, `content/react-tablekit/plugin.config.json`. Declared as a type rather
 * than inferred from the JSON so an optional field stays optional in the code: the site has to
 * keep working when one is actually absent.
 */
export interface PluginConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  categoryId?: string;
  urlPrefix?: string;
  repo: string;
  currentVersion: string;
  versions?: { label: string; href: string; current?: boolean; supported?: boolean }[];
  tiers?: { id: string; name: string; badge?: string | null }[];
  links?: { issues?: string; support?: string; changelog?: string; roadmap?: string };
  taxonomy?: string[];
  sections?: { id: string; enabled?: boolean }[];
  branding?: { accentColor?: string; ogImageTemplate?: string };
}

export interface NavNode {
  pathname: string;
  title?: string;
  subheader?: string;
  icon?: string;
  plan?: 'free' | 'pro' | 'premium' | 'enterprise';
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  children?: NavNode[];
}

export const pluginConfig: PluginConfig = config;
export const nav = navData as NavNode[];
const titleMap = titles as Record<string, string>;

/** Titles live in one map so a rename touches one file. */
export const titleFor = (pathname: string): string =>
  titleMap[pathname] ?? pathname.replace(/\/$/, '').split('/').pop() ?? pathname;

export const isGroup = (node: NavNode) => node.pathname.endsWith('-group');

/** Every real page in sidebar order — the order used for prev/next and for llms.txt. */
export function flattenPages(nodes: NavNode[] = nav, out: NavNode[] = []): NavNode[] {
  for (const node of nodes) {
    if (!isGroup(node)) out.push(node);
    if (node.children) flattenPages(node.children, out);
  }
  return out;
}

/** The section a path belongs to, used to highlight the sidebar and pick the layout. */
export function sectionFor(pathname: string): NavNode | undefined {
  return nav.find((section) =>
    flattenPages(section.children ?? []).some((p) => p.pathname === pathname),
  );
}

export const orderedPages = flattenPages();
