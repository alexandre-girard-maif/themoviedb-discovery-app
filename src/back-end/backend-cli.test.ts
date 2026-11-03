import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_DATABASE_PATH = '/tmp/movies-default.sqlite';

const closeMock = vi.fn();
const getDatabaseMock = vi.fn(() => ({
  close: closeMock,
}));
const parseCountriesCsvMock = vi.fn(() => [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
]);
const upsertCountriesMock = vi.fn(() => 2);
const deleteUnusedCountriesMock = vi.fn(() => 1);

vi.mock('./database/schema.ts', () => ({
  DEFAULT_DATABASE_PATH,
  getDatabase: getDatabaseMock,
}));

vi.mock('./database/countries-csv.ts', () => ({
  parseCountriesCsv: parseCountriesCsvMock,
}));

vi.mock('./database/country-repository.ts', () => ({
  upsertCountries: upsertCountriesMock,
  deleteUnusedCountries: deleteUnusedCountriesMock,
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

  describe('countries commands', () => {
    it('imports countries with the default database and closes the connection', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['add-countries', './data/countries.csv']);

        expect(parseCountriesCsvMock).toHaveBeenCalledWith(
          './data/countries.csv',
        );
        expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
        expect(upsertCountriesMock).toHaveBeenCalledWith(expect.anything(), [
          { code: 'FR', name: 'France' },
          { code: 'BE', name: 'Belgique' },
        ]);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `2 countries imported from ${resolve('./data/countries.csv')} into ${resolve(DEFAULT_DATABASE_PATH)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('validates CSV before opening the database', async () => {
      parseCountriesCsvMock.mockImplementationOnce(() => {
        throw new Error('Invalid countries CSV');
      });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await expect(
          runCliWithArgs(['add-countries', './invalid.csv']),
        ).rejects.toThrow(/Invalid countries CSV/);
        expect(getDatabaseMock).not.toHaveBeenCalled();
      } finally {
        logSpy.mockRestore();
      }
    });

    it('closes the database when an import transaction fails', async () => {
      upsertCountriesMock.mockImplementationOnce(() => {
        throw new Error('Import transaction failed');
      });
      await expect(
        runCliWithArgs(['add-countries', './data/countries.csv']),
      ).rejects.toThrow(/Import transaction failed/);
      expect(closeMock).toHaveBeenCalledOnce();
    });

    it('uses a configurable path for country import', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs([
          '--path',
          customDatabasePath,
          'add-countries',
          './data/countries.csv',
        ]);
        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(upsertCountriesMock).toHaveBeenCalledOnce();
        expect(closeMock).toHaveBeenCalledOnce();
      } finally {
        logSpy.mockRestore();
      }
    });

    it('uses a configurable path for cleaning countries', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['--path', customDatabasePath, 'clean-countries']);
        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(deleteUnusedCountriesMock).toHaveBeenCalledOnce();
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `1 unused countries removed from ${resolve(customDatabasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('create-database', () => {
    it('creates the default database when invoked without arguments', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs([]);

        expect(getDatabaseMock).toHaveBeenCalledWith(DEFAULT_DATABASE_PATH);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(DEFAULT_DATABASE_PATH)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

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

    it('uses the custom path passed after create-database', async () => {
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

    it('uses the custom path passed before create-database', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['--path', customDatabasePath, 'create-database']);

        expect(getDatabaseMock).toHaveBeenCalledWith(customDatabasePath);
        expect(closeMock).toHaveBeenCalledOnce();
        expect(logSpy).toHaveBeenCalledWith(
          `Database available at ${resolve(customDatabasePath)}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('uses --path without create-database as the default action', async () => {
      const customDatabasePath = './data/custom-movies.sqlite';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runCliWithArgs(['--path', customDatabasePath]);

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
