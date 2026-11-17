import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readFileSyncMock, upsertGenresMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(() => 'id,name\n28,Action'),
  upsertGenresMock: vi.fn(),
}));

const DEFAULT_DATABASE_PATH = '/tmp/movies-default.sqlite';

const closeMock = vi.fn();
const getDatabaseMock = vi.fn(() => ({
  close: closeMock,
}));

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal()),
  readFileSync: readFileSyncMock,
}));

vi.mock('./database/genre-repository.ts', () => ({
  upsertGenres: upsertGenresMock,
}));

/**
 * Executes the backend CLI with the specified command-line arguments
 * @param args The command-line arguments to pass to the CLI
 */
async function runCliWithArgs(args: string[]): Promise<void> {
  const originalArgv = process.argv;
  process.argv = ['node', 'src/back-end/backend-cli.ts', ...args];
  try {
    await import('./backend-cli.ts');
  } finally {
    process.argv = originalArgv;
  }
}

describe('backend-cli.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('add-genres', () => {
    it('loads the default CSV and database and closes the database', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['add-genres']);

        expect(readFileSyncMock).toHaveBeenCalledWith(
          resolve('data/genres.csv'),
          'utf8',
        );
        expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
        expect(upsertGenresMock).toHaveBeenCalledWith(
          getDatabaseMock.mock.results[0].value,
          [{ id: 28, name: 'Action' }],
        );
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Added or updated 1 genre in ${resolve(DEFAULT_DATABASE_PATH)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('uses the database and CSV paths passed as options', async () => {
      const databasePath = './data/custom-movies.sqlite';
      const csvPath = './data/custom-genres.csv';
      readFileSyncMock.mockReturnValue('id,name\n28,Action\n35,Comedy');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs([
          'add-genres',
          '--path',
          databasePath,
          '--csv',
          csvPath,
        ]);

        expect(readFileSyncMock).toHaveBeenCalledWith(csvPath, 'utf8');
        expect(getDatabaseMock).toHaveBeenCalledWith(databasePath);
        expect(upsertGenresMock).toHaveBeenCalledWith(
          getDatabaseMock.mock.results[0].value,
          [
            { id: 28, name: 'Action' },
            { id: 35, name: 'Comedy' },
          ],
        );
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Added or updated 2 genres in ${resolve(databasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('create-database', () => {
    it('uses the default database path when the subcommand has no path option', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['create-database']);

        expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(DEFAULT_DATABASE_PATH)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('uses the path passed in --path', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['create-database', '--path', customDatabasePath]);

        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(customDatabasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
