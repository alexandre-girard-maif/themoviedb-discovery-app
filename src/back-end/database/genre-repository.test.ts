import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Genre } from '../types/MoviesTypes';
import { getGenreById, getGenres, upsertGenres } from './genre-repository';
import { initializeGenresSchema } from './schema';

describe('genre-repository', () => {
  describe('getGenreById', () => {
    let database: DatabaseSync;

    beforeEach(() => {
      database = new DatabaseSync(':memory:');
      initializeGenresSchema(database);
    });

    afterEach(() => {
      database.close();
    });

    it('returns the genre with the specified ID', () => {
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(1, 'Action');
      expect(getGenreById(database, 1)).toEqual({ id: 1, name: 'Action' });
    });

    it('returns undefined if the genre does not exist', () => {
      expect(getGenreById(database, 999)).toBeUndefined();
    });
  });

  describe('getGenres', () => {
    let database: DatabaseSync;

    beforeEach(() => {
      database = new DatabaseSync(':memory:');
      initializeGenresSchema(database);
    });

    afterEach(() => {
      database.close();
    });

    it('returns all genres in the database', () => {
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(1, 'Action');
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(2, 'Comedy');
      expect(getGenres(database)).toEqual([
        { id: 1, name: 'Action' },
        { id: 2, name: 'Comedy' },
      ]);
    });
  });

  describe('upsertGenres', () => {
    let database: DatabaseSync;

    beforeEach(() => {
      database = new DatabaseSync(':memory:');
      initializeGenresSchema(database);
    });

    afterEach(() => {
      database.close();
    });

    it('inserts every genre provided in an array', () => {
      const genres: Genre[] = [
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ];

      upsertGenres(database, genres);

      expect(getGenres(database)).toEqual([
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ]);
    });

    it('updates the name of an existing genre without creating a duplicate', () => {
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(18, 'Old name');

      upsertGenres(database, [{ id: 18, name: 'Updated name' }]);

      expect(getGenres(database)).toEqual([{ id: 18, name: 'Updated name' }]);
    });

    it('accepts any iterable of genres', () => {
      function* genreIterable(): Iterable<Genre> {
        yield { id: 12, name: 'Adventure' };
        yield { id: 16, name: 'Animation' };
      }

      upsertGenres(database, genreIterable());

      expect(getGenres(database)).toEqual([
        { id: 12, name: 'Adventure' },
        { id: 16, name: 'Animation' },
      ]);
    });

    it('does not change the database when given an empty iterable', () => {
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(99, 'Existing');

      upsertGenres(database, []);

      expect(getGenres(database)).toEqual([{ id: 99, name: 'Existing' }]);
    });

    it('keeps the last value when an ID appears more than once', () => {
      upsertGenres(database, [
        { id: 14, name: 'Action' },
        { id: 14, name: 'Animation' },
      ]);

      expect(getGenres(database)).toEqual([{ id: 14, name: 'Animation' }]);
    });

    it('rolls back all changes when an upsert fails', () => {
      database.exec(`
        CREATE TRIGGER reject_genre
        BEFORE INSERT ON genres
        WHEN NEW.name = 'Rejected'
        BEGIN
          SELECT RAISE(ABORT, 'Rejected genre');
        END;
      `);

      // Confirm a failed genre does not leave earlier genres from the same batch inserted.
      expect(() =>
        upsertGenres(database, [
          { id: 1, name: 'Action' },
          { id: 2, name: 'Rejected' },
        ]),
      ).toThrow('Rejected genre');

      expect(getGenres(database)).toEqual([]);
    });

    it('rejects a genre without a name', () => {
      expect(() =>
        database.prepare('INSERT INTO genres (id) VALUES (?)').run(21),
      ).toThrow(/NOT NULL constraint failed: genres.name/);
    });
  });
});
