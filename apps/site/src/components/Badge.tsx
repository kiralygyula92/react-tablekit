import type { NavNode } from '../nav/nav';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * The only place a badge is rendered. Its state comes from the nav node, so the
 * sidebar, the page heading and the features index can never disagree.
 */
export function Badge({ node }: { node: Pick<NavNode, 'plan' | 'lifecycle'> }) {
  const labels: string[] = [];
  if (node.lifecycle) labels.push(capitalize(node.lifecycle));
  if (node.plan && node.plan !== 'free') labels.push(capitalize(node.plan));
  if (labels.length === 0) return null;
  return (
    <>
      {labels.map((label) => (
        <span key={label} className={`badge badge--${label.toLowerCase()}`}>
          {label}
        </span>
      ))}
    </>
  );
}
