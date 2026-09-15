import { describe, expect, it } from 'vitest';
import { ACCOUNT_COUNT, formatAccountName, generateAccounts, getAccountAssets } from './accounts';

describe('account generator', () => {
  it('is deterministic: the same seed produces the same data', () => {
    expect(generateAccounts(20)).toEqual(generateAccounts(20));
  });

  it('produces 235 accounts by default, which is 24 pages at size 10', () => {
    const accounts = generateAccounts();
    expect(accounts).toHaveLength(ACCOUNT_COUNT);
    expect(Math.ceil(accounts.length / 10)).toBe(24);
  });

  it('gives every account a unique, stable id', () => {
    const ids = generateAccounts(50).map((a) => a.identifiers.id);
    expect(new Set(ids).size).toBe(50);
    expect(ids[0]).toBe('a_0001');
    expect(ids[10]).toBe('a_0011');
  });

  it('leaves optional fields missing on some rows, so the fallbacks are exercised', () => {
    const accounts = generateAccounts(120);
    expect(accounts.some((a) => a.billingAddress === undefined)).toBe(true);
    expect(accounts.some((a) => a.displayName.companyName === undefined)).toBe(true);
    const assets = accounts.flatMap(getAccountAssets);
    expect(assets.some((asset) => asset.notes === undefined)).toBe(true);
    expect(assets.some((asset) => asset.vendor === undefined)).toBe(true);
  });

  it('includes diacritics, so folded search can be tested', () => {
    const names = generateAccounts(200).map(formatAccountName).join(' ');
    expect(names).toMatch(/[ëéíöøü]/i);
  });

  it('collects the assets of every site of an account', () => {
    const account = generateAccounts(60).find((a) => (a.sites?.length ?? 0) > 1);
    expect(account).toBeDefined();
    const expected = (account?.sites ?? []).reduce((n, s) => n + s.assets.length, 0);
    expect(getAccountAssets(account!)).toHaveLength(expected);
  });
});
