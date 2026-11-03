import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import type { Country } from '../types/MoviesTypes.ts';

export function parseCountriesCsv(filePath: string): Country[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read countries CSV: ${filePath}`, {
      cause: error,
    });
  }

  let rows: string[][];
  try {
    rows = parse(content, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as string[][];
  } catch (error) {
    throw new Error('Invalid countries CSV syntax', { cause: error });
  }

  if (rows.length === 0) {
    throw new Error('Invalid countries CSV headers: expected code and name');
  }

  const headers = rows[0].map((header) => header.toLowerCase());
  if (
    headers.length !== 2 ||
    new Set(headers).size !== 2 ||
    !headers.includes('code') ||
    !headers.includes('name')
  ) {
    throw new Error(
      'Invalid countries CSV headers: expected exactly code and name',
    );
  }

  const countries: Country[] = [];
  const codeIndex = headers.indexOf('code');
  const nameIndex = headers.indexOf('name');

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.length !== 2) {
      throw new Error(
        `Invalid countries CSV row ${index + 1}: expected 2 values`,
      );
    }

    const code = row[codeIndex].trim().toUpperCase();
    const name = row[nameIndex].trim();

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new Error(`Invalid country code at CSV row ${index + 1}: ${code}`);
    }
    if (!name) {
      throw new Error(`Invalid country name at CSV row ${index + 1}`);
    }

    countries.push({ code, name });
  }

  return countries;
}
