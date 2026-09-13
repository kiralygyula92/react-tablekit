/**
 * Converts any cell value to display/search text without ever producing `[object Object]`:
 * primitives via `String`, dates as ISO, arrays joined, plain objects as JSON.
 */
export function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (Array.isArray(value)) return value.map(toText).join(', ');
  if (typeof value === 'symbol') return value.description ?? '';
  if (typeof value === 'function') return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
