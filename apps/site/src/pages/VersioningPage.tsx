import { Link } from 'react-router';
import { useDocumentTitle } from '../layout/useDocumentTitle';

/** `/docs/versioning` — the semver policy (09 §7), so a consumer knows what a minor may change. */
export function VersioningPage() {
  useDocumentTitle('Versioning policy');

  return (
    <article className="site-prose">
      <h1>Versioning policy</h1>
      <p className="site-lead">
        react-tablekit follows semantic versioning. This page says exactly what counts as the public
        API, so you can tell which upgrades can change your table.
      </p>

      <h2>What the public API covers</h2>
      <p>
        More than the TypeScript exports. All of the following are public, and changing or removing
        any of them is a <strong>major</strong> release:
      </p>
      <ul>
        <li>Every name and signature in the API reference — props, types, hooks and utilities.</li>
        <li>
          The CSS class names (<code>tk-*</code>), so a stylesheet of yours that targets them keeps
          working.
        </li>
        <li>
          The CSS variable names (<code>--tk-*</code>), so your theme overrides keep applying.
        </li>
        <li>
          The <code>data-*</code> attributes the table puts on its elements, so selectors and tests
          that depend on state keep matching.
        </li>
        <li>Slot names, handler names and localization keys.</li>
      </ul>

      <h2>What a minor release may change</h2>
      <p>
        Token default <em>values</em>. A minor may retune a colour or a spacing step, so if you
        depend on an exact value, set it yourself with a theme or a CSS variable rather than relying
        on the default.
      </p>
      <p>
        The <strong>classic</strong> preset is the exception: its values are frozen. It exists to
        reproduce the original Skimmer tables pixel for pixel, and a retuned token would break that
        guarantee.
      </p>

      <h2>Deprecations</h2>
      <p>
        Nothing is removed without warning. A deprecated API is marked <code>@deprecated</code> in
        its TSDoc — so your editor shows it struck through — and warns once per session in
        development builds, never in production. It is removed in the next major release at the
        earliest.
      </p>

      <h2>Pre-releases</h2>
      <p>
        Pre-release versions are published under the <code>next</code> dist-tag, so{' '}
        <code>pnpm add react-tablekit</code> always installs a stable version.
      </p>

      <h2>Documentation</h2>
      <p>
        This site documents the current major version. When a v2 ships, the v1 documentation stays
        available under its own path. Every release is listed in the{' '}
        <Link to="/changelog">changelog</Link>.
      </p>
    </article>
  );
}
