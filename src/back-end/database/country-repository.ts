import type { DatabaseSync } from 'node:sqlite';
import type { Country } from '../types/MoviesTypes.ts';

export type { Country } from '../types/MoviesTypes.ts';

export function findCountryByCode(
  database: DatabaseSync,
  code: string,
): Country | undefined {
  const row = database
    .prepare('SELECT code, name FROM countries WHERE code = ?')
    .get(code);

  return row ? (row as Country) : undefined;
}

export function listCountries(database: DatabaseSync): Country[] {
  return database
    .prepare('SELECT code, name FROM countries ORDER BY code ASC')
    .all() as Country[];
}

export function upsertCountries(
  database: DatabaseSync,
  countries: Iterable<Country>,
): number {
  const statement = database.prepare(`
    INSERT INTO countries (code, name)
    VALUES (?, ?)
    ON CONFLICT(code) DO UPDATE SET name = excluded.name
  `);
  const countriesByCode = new Map<string, Country>();

  for (const country of countries) {
    countriesByCode.set(country.code, {
      code: country.code,
      name: country.name,
    });
  }

  if (countriesByCode.size === 0) {
    return 0;
  }

  database.exec('BEGIN TRANSACTION');
  try {
    let importedCount = 0;
    for (const country of countriesByCode.values()) {
      statement.run(country.code, country.name);
      importedCount += 1;
    }
    database.exec('COMMIT');
    return importedCount;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export const getCountryByCode = findCountryByCode;
export const getCountries = listCountries;
export const insertOrUpdateCountries = upsertCountries;
export const saveCountries = upsertCountries;

export function deleteUnusedCountries(database: DatabaseSync): number {
  database.exec('BEGIN TRANSACTION');
  try {
    const result = database
      .prepare(`
        DELETE FROM countries
        WHERE NOT EXISTS (
          SELECT 1
          FROM production_countries
          WHERE production_countries.country_code = countries.code
        )
      `)
      .run();
    database.exec('COMMIT');
    return Number(result.changes);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export const cleanCountries = deleteUnusedCountries;
