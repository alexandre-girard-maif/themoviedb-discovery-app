import type { DatabaseSync } from 'node:sqlite';
import type { Genre } from '../types/MoviesTypes.ts';

export type { Genre } from '../types/MoviesTypes.ts';

export function findGenreById(
  database: DatabaseSync,
  id: number,
): Genre | undefined {
  const row = database
    .prepare('SELECT id, name FROM genres WHERE id = ?')
    .get(id);

  return row ? (row as Genre) : undefined;
}

export function listGenres(database: DatabaseSync): Genre[] {
  return database
    .prepare('SELECT id, name FROM genres ORDER BY id ASC')
    .all() as Genre[];
}

export function upsertGenres(
  database: DatabaseSync,
  genres: Iterable<Genre>,
): number {
  const statement = database.prepare(`
    INSERT INTO genres (id, name)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `);
  const genresById = new Map<number, Genre>();

  for (const genre of genres) {
    genresById.set(genre.id, { id: genre.id, name: genre.name });
  }

  if (genresById.size === 0) {
    return 0;
  }

  database.exec('BEGIN TRANSACTION');
  try {
    let importedCount = 0;
    for (const genre of genresById.values()) {
      statement.run(genre.id, genre.name);
      importedCount += 1;
    }
    database.exec('COMMIT');
    return importedCount;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export const getGenreById = findGenreById;
export const getGenres = listGenres;
export const insertOrUpdateGenres = upsertGenres;
export const saveGenres = upsertGenres;
