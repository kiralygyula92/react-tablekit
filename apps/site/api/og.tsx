import { ImageResponse } from '@vercel/og';

/**
 * The social preview image for a page, drawn from its title and description.
 *
 * `PageMeta` points every page's `og:image` here, so a link to any of the 84 pages previews as
 * itself rather than as one generic card, and nobody has to draw 84 images.
 *
 * It runs on the edge because it is pure rendering: no data, no secrets, nothing to keep warm.
 */
export const config = { runtime: 'edge' };

const clamp = (value: string | null, max: number) =>
  !value ? '' : value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/** The favicon (`public/favicon.svg`, drawn on a 32-unit grid) at 1.5×. */
function Mark() {
  const bar = (top: number, height: number, opacity: number) => (
    <div
      style={{
        position: 'absolute',
        left: 10.5,
        top,
        width: 27,
        height,
        borderRadius: height / 3,
        background: `rgba(255, 255, 255, ${String(opacity)})`,
      }}
    />
  );
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: 48,
        height: 48,
        borderRadius: 10.5,
        background: '#2563eb',
      }}
    >
      {bar(12, 6.75, 1)}
      {bar(23.25, 4.125, 0.8)}
      {bar(31.875, 4.125, 0.8)}
    </div>
  );
}

export default function handler(request: Request): ImageResponse {
  const params = new URL(request.url).searchParams;
  const title = clamp(params.get('title'), 70) || 'React Tablekit';
  const description = clamp(params.get('description'), 180);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: '#0b1220',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mark />
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5, color: '#e2e8f0' }}>
          React Tablekit
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -1.5, fontWeight: 700 }}>
          {title}
        </div>
        {description ? (
          <div style={{ fontSize: 30, lineHeight: 1.4, color: '#cbd5e1' }}>{description}</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>
        npm install react-tablekit
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        // The image is a pure function of the query, so it can be cached for a long time.
        'cache-control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    },
  );
}
