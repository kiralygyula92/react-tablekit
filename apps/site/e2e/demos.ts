import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const contentRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');

/** Every demo on disk, as the id the `<Demo>` component and the `/embed/` route use. */
export function allDemoIds(dir = contentRoot, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) allDemoIds(full, out);
    else if (/^demo-.+\.tsx$/.test(entry.name)) {
      out.push(
        path
          .relative(contentRoot, full)
          .split(path.sep)
          .join('/')
          .replace(/\.tsx$/, ''),
      );
    }
  }
  return out.sort();
}

/**
 * The chrome-less single-demo route. Tests drive demos through it so a test exercises the demo
 * rather than the page around it, and so a page being rewritten never breaks a feature test.
 */
export const demoUrl = (id: string, query = '?mockLatency=0') =>
  `/embed/react-tablekit/${id}${query}`;

/**
 * Demos that render the dense `classic` preset, whose header contrast is a documented exception
 * (see CLASSIC_HEADER_CONTRAST_EXCEPTION).
 */
export const CLASSIC_DEMOS = new Set([
  'demos/account-list/demo-basics',
  'demos/asset-list/demo-basics',
  'demos/reading-history/demo-basics',
  'demos/asset-picker/demo-basics',
]);
