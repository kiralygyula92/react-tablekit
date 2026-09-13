import { expectTypeOf, test } from 'vitest';
import { version } from '../../src';

test('version is a string', () => {
  expectTypeOf(version).toBeString();
});
