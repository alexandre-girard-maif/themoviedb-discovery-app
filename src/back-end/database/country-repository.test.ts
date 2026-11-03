// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from './schema.ts';
import {
  findCountryByCode,
  listCountries,
  upsertCountries,
} from './country-repository.ts';

describe('country-repository.ts', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeSchema(database);
  });

  afterEach(() => {
    database.close();
  });

  it('returns an empty list, finds present countries, and lists countries by code', () => {
    // Arrange
    expect(listCountries(database)).toEqual([]);
    upsertCountries(database, [
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
    ]);

    // Act
    const present = findCountryByCode(database, 'FR');
    const absent = findCountryByCode(database, 'BE');
    const countries = listCountries(database);

    // Assert
    expect(present).toEqual({ code: 'FR', name: 'France' });
    expect(absent).toBeUndefined();
    expect(countries).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'US', name: 'United States' },
    ]);
  });

  it('inserts and updates iterables without duplicates and ignores empty input', () => {
    // Arrange
    function countriesIterable() {
      return new Set([
        { code: 'FR', name: 'France' },
        { code: 'BE', name: 'Belgique' },
      ]);
    }

    // Act
    const inserted = upsertCountries(database, countriesIterable());
    const updated = upsertCountries(
      database,
      new Map([['FR', { code: 'FR', name: 'République française' }]]).values(),
    );
    const unchanged = upsertCountries(database, []);

    // Assert
    expect(inserted).toBe(2);
    expect(updated).toBe(1);
    expect(unchanged).toBe(0);
    expect(findCountryByCode(database, 'FR')?.name).toBe(
      'République française',
    );
    expect(listCountries(database)).toEqual([
      { code: 'BE', name: 'Belgique' },
      { code: 'FR', name: 'République française' },
    ]);
  });

  it('keeps the last name for repeated codes and rejects invalid countries', () => {
    // Arrange
    const repeatedCountries = [
      { code: 'BE', name: 'Belgium' },
      { code: 'BE', name: 'Belgique' },
    ];

    // Act
    upsertCountries(database, repeatedCountries);

    // Assert
    expect(findCountryByCode(database, 'BE')?.name).toBe('Belgique');
    expect(() =>
      upsertCountries(database, [{ code: 'usa', name: 'USA' }]),
    ).toThrow(/CHECK constraint failed/);
    expect(() => upsertCountries(database, [{ code: 'CA', name: '' }])).toThrow(
      /CHECK constraint failed/,
    );
  });
});
