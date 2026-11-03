#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { DEFAULT_DATABASE_PATH, getDatabase } from './database/schema.ts';

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

program.parse();
