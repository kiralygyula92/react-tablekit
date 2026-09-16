import { createRandom } from '@/mock/prng';

/** A node of the demo organisation tree. */
export interface OrgNode {
  id: string;
  name: string;
  role: string;
  headcount: number;
  location: string;
  children?: OrgNode[];
}

const DIVISIONS = ['Product', 'Platform', 'Revenue', 'Operations'];
const TEAMS = ['Core', 'Growth', 'Billing', 'Insights', 'Mobile', 'Data'];
const ROLES = ['Engineer', 'Designer', 'Analyst', 'Manager'];
const CITIES = ['Budapest', 'Berlin', 'Austin', 'Lisbon', 'Toronto'];
const NAMES = ['Ava', 'Ben', 'Chloé', 'Dev', 'Emma', 'Finn', 'Gyula', 'Hana', 'Ivan', 'Júlia'];

/** Deterministic three-level tree: divisions → teams → people. */
export function buildOrgTree(seed = 7): OrgNode[] {
  const r = createRandom(seed);
  return DIVISIONS.map((division, d) => {
    const teams = TEAMS.slice(0, 2 + (d % 3)).map((team, t) => {
      const people = Array.from({ length: 2 + r.int(0, 3) }, (_, p): OrgNode => ({
        id: `d${d}-t${t}-p${p}`,
        name: `${r.pick(NAMES)} ${String.fromCharCode(65 + p)}.`,
        role: r.pick(ROLES),
        headcount: 1,
        location: r.pick(CITIES),
      }));
      return {
        id: `d${d}-t${t}`,
        name: `${division} · ${team}`,
        role: 'Team',
        headcount: people.length,
        location: r.pick(CITIES),
        children: people,
      } satisfies OrgNode;
    });
    return {
      id: `d${d}`,
      name: division,
      role: 'Division',
      headcount: teams.reduce((n, t) => n + t.headcount, 0),
      location: 'Global',
      children: teams,
    } satisfies OrgNode;
  });
}

/** Flat lookup by parent id, for the lazily loaded tree demo. */
export function childrenOf(id: string | null, tree = buildOrgTree()): OrgNode[] {
  // The lazy demo serves one level at a time, so the children are stripped off.
  const flat = ({ children: _children, ...node }: OrgNode): OrgNode => node;
  if (id === null) return tree.map(flat);
  const find = (nodes: OrgNode[]): OrgNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = n.children ? find(n.children) : undefined;
      if (hit) return hit;
    }
    return undefined;
  };
  return (find(tree)?.children ?? []).map(flat);
}

/** Whether a node has children (the lazy tree cannot infer it from the row itself). */
export function hasChildren(id: string, tree = buildOrgTree()): boolean {
  return childrenOf(id, tree).length > 0;
}
