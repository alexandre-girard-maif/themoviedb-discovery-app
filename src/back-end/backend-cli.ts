#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';
import { parseCountriesCsv } from './database/countries-csv.ts';
import {
  deleteUnusedCountries,
  upsertCountries,
} from './database/country-repository.ts';

/** Command-line interface for movie database operations. */
const program = new Command().description('CLI for movie database operations');

function createDatabase(path: string): void {
  const database = getDatabase(path);
  database.close();
  console.log(`Database available at ${resolve(path)}`);
}

program
  .option(
    '-p, --path <path>',
    'path to the SQLite database file',
    DEFAULT_DATABASE_PATH,
  )
  .action(() => {
    createDatabase(program.opts<{ path: string }>().path);
  });

program
  .command('create-database')
  .description('Create and initialize the movies database schema')
  .option('-p, --path <path>', 'path to the SQLite database file')
  .action((options: { path?: string }, command) => {
    const globalOptions = command.optsWithGlobals<{ path: string }>();
    createDatabase(options.path ?? globalOptions.path);
  });

program
  .command('add-countries <csv-file>')
  .description('Import or update countries from a CSV file')
  .option('-p, --path <path>', 'path to the SQLite database file')
  .action((csvFile: string, options: { path?: string }, command) => {
    const countries = parseCountriesCsv(csvFile);
    const globalOptions = command.optsWithGlobals<{ path: string }>();
    const databasePath = options.path ?? globalOptions.path;
    const database = getDatabase(databasePath);
    try {
      const importedCount = upsertCountries(database, countries);
      console.log(
        `${importedCount} countries imported from ${resolve(csvFile)} into ${resolve(databasePath)}`,
      );
    } finally {
      database.close();
    }
  });

program
  .command('clean-countries')
  .description('Remove countries not associated with any film')
  .option('-p, --path <path>', 'path to the SQLite database file')
  .action((options: { path?: string }, command) => {
    const globalOptions = command.optsWithGlobals<{ path: string }>();
    const databasePath = options.path ?? globalOptions.path;
    const database = getDatabase(databasePath);
    try {
      const removedCount = deleteUnusedCountries(database);
      console.log(
        `${removedCount} unused countries removed from ${resolve(databasePath)}`,
      );
    } finally {
      database.close();
    }
  });

program.parse();
