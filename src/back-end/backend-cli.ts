#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { upsertGenres } from './database/genre-repository.ts';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';
import { parseGenresCsv } from './genre-csv.ts';

/** Command-line interface for movie database operations. */
const program = new Command().description('CLI for movie database operations');
const DEFAULT_GENRES_CSV_PATH = resolve('data/genres.csv');

program
  .command('create-database')
  .description('Create and initialize the movies database schema')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(({ path }: { path: string }) => {
    const database = getDatabase(path);
    database.close();
    console.log(`Database available at ${resolve(path)}`);
  });

program
  .command('add-genres')
  .description('Add or update genres from a CSV file')
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .option(
    '-c, --csv <path>',
    'path to the genres CSV file',
    DEFAULT_GENRES_CSV_PATH,
  )
  .action(({ path, csv }: { path: string; csv: string }) => {
    const genres = parseGenresCsv(readFileSync(csv, 'utf8'));
    const database = getDatabase(path);
    try {
      upsertGenres(database, genres);
    } finally {
      database.close();
    }
    console.log(
      `Added or updated ${genres.length} ${
        genres.length === 1 ? 'genre' : 'genres'
      } in ${resolve(path)}`,
    );
  });

program.parse();
