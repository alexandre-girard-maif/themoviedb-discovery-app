import type { DatabaseSync } from 'node:sqlite';
import type { Genre } from '../types/MoviesTypes';

/**
 * Get a genre by its ID from the database.
 */
export function getGenreById(
  database: DatabaseSync,
  id: number,
): Genre | undefined {
  return database
    .prepare('SELECT id, name FROM genres WHERE id = ?')
    .get(id) as Genre | undefined;
}

/**
 * Get genres from the database.
 * @param database The SQLite database to query.
 * @returns An array of genres.
 */
export function getGenres(database: DatabaseSync): Genre[] {
  return database
    .prepare('SELECT id, name FROM genres ORDER BY id')
    .all() as Genre[];
}

/**
 * Upserts the provided genres into the database.
 * If a genre with the same ID already exists, its name will be updated.
 * @param database The SQLite database to use for the operation.
 * @param genres An iterable of genres to upsert into the database.
 */
export function upsertGenres(
  database: DatabaseSync,
  genres: Iterable<Genre>,
): void {
  const upsertGenre = database.prepare(`
    INSERT INTO genres (id, name) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `);

  database.exec('BEGIN TRANSACTION;');
  try {
    for (const genre of genres) {
      upsertGenre.run(genre.id, genre.name);
    }
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}
