// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCountriesCsv } from './countries-csv.ts';

const temporaryDirectories: string[] = [];

function writeCsv(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'countries-csv-'));
  temporaryDirectories.push(directory);
  const filePath = join(directory, 'countries.csv');
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('countries-csv.ts', () => {
  it('accepts headers in either order, case-insensitively, with BOM, CRLF and quoted commas', () => {
    // Arrange
    const filePath = writeCsv(
      '\uFEFFName,Code\r\n"France, métropolitaine",FR\r\nBelgique,BE\r\n',
    );

    // Act
    const countries = parseCountriesCsv(filePath);

    // Assert
    expect(countries).toEqual([
      { code: 'FR', name: 'France, métropolitaine' },
      { code: 'BE', name: 'Belgique' },
    ]);
  });

  it('ignores blank lines and returns an empty list for a headers-only document', () => {
    // Arrange
    const filePath = writeCsv('\ncode,name\n\r\nFR,France\n\n');

    // Act and Assert
    expect(parseCountriesCsv(filePath)).toEqual([
      { code: 'FR', name: 'France' },
    ]);

    const headersOnlyPath = writeCsv('code,name\n');
    expect(parseCountriesCsv(headersOnlyPath)).toEqual([]);
  });

  it('rejects invalid headers, values, row shapes and malformed CSV', () => {
    // Arrange and Act
    expect(() =>
      parseCountriesCsv(writeCsv('country,name\nFR,France')),
    ).toThrow(/Invalid countries CSV headers/);
    expect(() => parseCountriesCsv(writeCsv('code,name\nFRA,France'))).toThrow(
      /Invalid country code/,
    );
    expect(() => parseCountriesCsv(writeCsv('code,name\nFR,""'))).toThrow(
      /Invalid country name/,
    );
    expect(() => parseCountriesCsv(writeCsv('code,name\nFR'))).toThrow(
      /expected 2 values/,
    );
    expect(() => parseCountriesCsv(writeCsv('code,name\nFR,"France'))).toThrow(
      /Invalid countries CSV syntax/,
    );
    expect(() => parseCountriesCsv('/tmp/file-does-not-exist.csv')).toThrow(
      /Unable to read countries CSV/,
    );
    expect(() => parseCountriesCsv(writeCsv(''))).toThrow(
      /Invalid countries CSV headers/,
    );
    expect(() => parseCountriesCsv(writeCsv('code\nFR'))).toThrow(
      /Invalid countries CSV headers/,
    );
  });
});
