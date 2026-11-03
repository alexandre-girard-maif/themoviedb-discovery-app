import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { initializeSchema, getDatabase } from './schema';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('schema.ts', () => {
  describe('getDatabase', () => {
    it('returns a DatabaseSync instance connected to the specified database', () => {
      const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
      const databasePath = join(directory, 'nested', 'movies.sqlite');

      const database = getDatabase(databasePath);

      // Verify that the returned object is a DatabaseSync instance
      expect(database).toBeInstanceOf(DatabaseSync);

      // Verify that foreign key constraints are enabled
      expect(database.prepare('PRAGMA foreign_keys').get()).toEqual({
        foreign_keys: 1,
      });

      // Verify that foreign key for movie_genres table is enforced when inserting a non-existent genre ID
      expect(() =>
        database.prepare('INSERT INTO movie_genres VALUES (?, ?)').run(1, 18),
      ).toThrow(/FOREIGN KEY constraint failed/);

      // Verify that foreign key for production_countries table is enforced when inserting a non-existent country code
      expect(() =>
        database
          .prepare('INSERT INTO production_countries VALUES (?, ?)')
          .run(1, 'US'),
      ).toThrow(/FOREIGN KEY constraint failed/);

      database.close();
    });

    it('rolls back schema initialization and rethrows when initialization fails', () => {
      const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
      const databasePath = join(directory, 'movies.sqlite');
      const existingDatabase = new DatabaseSync(databasePath);

      // Create an existing movies table to simulate a schema initialization failure
      existingDatabase.exec('CREATE TABLE movies (id INTEGER PRIMARY KEY)');
      existingDatabase.close();

      // Attempt to get the database, which should fail due to the missing release_year column
      expect(() => getDatabase(databasePath)).toThrow(
        /no such column: release_year/,
      );

      // Verify that the schema initialization was rolled back and the movies table remains unchanged
      const database = new DatabaseSync(databasePath);
      const tables = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name);
      expect(tables).toEqual(['movies']);
      database.close();
    });

    it('recreates the schema and removes existing data when forced', () => {
      const directory = mkdtempSync(join(tmpdir(), 'movies-database-'));
      const databasePath = join(directory, 'movies.sqlite');

      const existingDatabase = getDatabase(databasePath);

      existingDatabase
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(18, 'Drama');
      existingDatabase.close();

      // Force recreate the schema, which should remove existing data
      const database = getDatabase(databasePath, true);

      expect(database.prepare('SELECT * FROM genres').all()).toEqual([]);
      expect(
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
          )
          .all()
          .map((row) => row.name),
      ).toEqual([
        'countries',
        'genres',
        'movie_genres',
        'movies',
        'production_countries',
      ]);
      database.close();
    });
  });

  describe('initializeSchema', () => {
    it('creates every table, index and optional movie column in the initial schema', () => {
      const database = new DatabaseSync(':memory:');
      try {
        // Initialize the database schema
        initializeSchema(database);

        // Verify that all expected tables are created
        const tables = database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
          )
          .all()
          .map((row) => row.name);
        expect(tables).toEqual([
          'countries',
          'genres',
          'movie_genres',
          'movies',
          'production_countries',
        ]);

        // Verify that all expected indexes are created
        const indexes = database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
          .all()
          .map((row) => row.name);
        expect(indexes).toEqual(
          expect.arrayContaining([
            'movies_release_year',
            'movie_genres_genre_id',
          ]),
        );
      } finally {
        database.close();
      }
    });

    it('enforces data constraints and unique movie associations', () => {
      // Arrange
      const database = new DatabaseSync(':memory:');
      initializeSchema(database);

      database
        .prepare(`
          INSERT INTO movies (
            id, title, original_title, original_language, overview,
            release_date, popularity, vote_average, vote_count,
            runtime_minutes, budget, revenue, collected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          1,
          'Dune',
          'Dune',
          'en',
          'Overview',
          '2021-09-15',
          null,
          null,
          null,
          155,
          null,
          null,
          '2026-11-03T00:00:00Z',
        );
      database
        .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
        .run(18, 'Drame');
      database
        .prepare('INSERT INTO countries (code, name) VALUES (?, ?)')
        .run('US', 'United States');

      try {
        // Act and Assert: unknown TMDB values remain nullable.
        expect(
          database
            .prepare(
              'SELECT popularity, vote_average, vote_count FROM movies WHERE id = 1',
            )
            .get(),
        ).toEqual({ popularity: null, vote_average: null, vote_count: null });

        // Act and Assert: invalid numeric values, names and country codes are rejected.
        expect(() =>
          database
            .prepare('INSERT INTO genres (id, name) VALUES (?, ?)')
            .run(2, ''),
        ).toThrow(/CHECK constraint failed/);
        expect(() =>
          database
            .prepare('INSERT INTO countries (code, name) VALUES (?, ?)')
            .run('usa', 'USA'),
        ).toThrow(/CHECK constraint failed/);
        expect(() =>
          database
            .prepare('UPDATE movies SET vote_average = ? WHERE id = 1')
            .run(11),
        ).toThrow(/CHECK constraint failed/);
        expect(() =>
          database
            .prepare('UPDATE movies SET vote_count = ? WHERE id = 1')
            .run(-1),
        ).toThrow(/CHECK constraint failed/);

        // Act: create genre and country associations.
        database
          .prepare(
            'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
          )
          .run(1, 18);
        database
          .prepare(
            'INSERT INTO production_countries (movie_id, country_code) VALUES (?, ?)',
          )
          .run(1, 'US');

        // Assert: repeated associations are rejected by the composite primary keys.
        expect(() =>
          database
            .prepare(
              'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
            )
            .run(1, 18),
        ).toThrow(/UNIQUE constraint failed/);
        expect(() =>
          database
            .prepare(
              'INSERT INTO production_countries (movie_id, country_code) VALUES (?, ?)',
            )
            .run(1, 'US'),
        ).toThrow(/UNIQUE constraint failed/);
      } finally {
        database.close();
      }
    });
  });
});
