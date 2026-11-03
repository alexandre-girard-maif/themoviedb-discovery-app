// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from './schema.ts';
import { findGenreById, listGenres, upsertGenres } from './genre-repository.ts';

describe('genre-repository.ts', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeSchema(database);
  });

  afterEach(() => {
    database.close();
  });

  it('finds a present genre, returns undefined for an absent genre, and lists genres by id', () => {
    // Arrange
    upsertGenres(database, [
      { id: 28, name: 'Action' },
      { id: 18, name: 'Drama' },
    ]);

    // Act
    const present = findGenreById(database, 18);
    const absent = findGenreById(database, 99);
    const genres = listGenres(database);

    // Assert
    expect(present).toEqual({ id: 18, name: 'Drama' });
    expect(absent).toBeUndefined();
    expect(genres).toEqual([
      { id: 18, name: 'Drama' },
      { id: 28, name: 'Action' },
    ]);
  });

  it('inserts and updates iterables without duplicates and ignores empty input', () => {
    // Arrange
    function genresIterable() {
      return new Set([
        { id: 18, name: 'Drama' },
        { id: 28, name: 'Action' },
      ]);
    }

    // Act
    const inserted = upsertGenres(database, genresIterable());
    const updated = upsertGenres(
      database,
      new Map([[18, { id: 18, name: 'Drame' }]]).values(),
    );
    const unchanged = upsertGenres(database, []);

    // Assert
    expect(inserted).toBe(2);
    expect(updated).toBe(1);
    expect(unchanged).toBe(0);
    expect(findGenreById(database, 18)?.name).toBe('Drame');
    expect(listGenres(database)).toEqual([
      { id: 18, name: 'Drame' },
      { id: 28, name: 'Action' },
    ]);
  });

  it('keeps the last name when an id appears more than once and rejects an empty name', () => {
    // Arrange
    const duplicatedGenres = [
      { id: 18, name: 'Drama' },
      { id: 18, name: 'Drame' },
    ];

    // Act
    upsertGenres(database, duplicatedGenres);

    // Assert
    expect(findGenreById(database, 18)?.name).toBe('Drame');
    expect(() => upsertGenres(database, [{ id: 20, name: '' }])).toThrow(
      /CHECK constraint failed/,
    );
  });
});
