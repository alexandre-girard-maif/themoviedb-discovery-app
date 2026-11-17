import { parse } from 'csv-parse/sync';
import type { Genre } from './types/MoviesTypes';

/**
 * Parses a CSV document with `id` and `name` columns into genres.
 * @param csv The CSV content as a string
 * @returns An array of genres parsed from the CSV
 */
export function parseGenresCsv(csv: string): Genre[] {
  // Parse the CSV content into rows with 'id' and 'name' columns
  const rows = parse(csv, {
    bom: true,
    columns(headers: string[]) {
      const normalizedHeaders = headers.map((header) => header.toLowerCase());
      if (
        normalizedHeaders.length !== 2 ||
        !normalizedHeaders.includes('id') ||
        !normalizedHeaders.includes('name')
      ) {
        throw new Error('CSV must have exactly two columns: id and name');
      }
      return normalizedHeaders;
    },
    skip_empty_lines: true,
    trim: true,
  }) as Record<'id' | 'name', string>[];

  // Convert each row into a Genre object, validating the data along the way
  return rows.flatMap((row, index) => {
    if (row.id === '' && row.name === '') {
      return [];
    }

    const rowNumber = index + 2;
    const id = Number(row.id);
    if (!/^[1-9]\d*$/.test(row.id) || !Number.isSafeInteger(id)) {
      throw new Error(`CSV row ${rowNumber} has an invalid genre id`);
    }

    if (!row.name) {
      throw new Error(`CSV row ${rowNumber} has an empty genre name`);
    }

    return [{ id, name: row.name }];
  });
}
