import { describe, expect, it } from 'vitest';
import { parseGenresCsv } from './genre-csv';

describe('parseGenresCsv', () => {
  it('parses genre rows with headers in either order', () => {
    expect(parseGenresCsv('id,name\r\n28,Action\r\n35,Comedy\r\n')).toEqual([
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
    ]);
    expect(parseGenresCsv('name,id\n"Science, Fiction",878')).toEqual([
      { id: 878, name: 'Science, Fiction' },
    ]);
  });

  it('supports escaped quotes and a UTF-8 byte order mark', () => {
    expect(
      parseGenresCsv('\uFEFFid,name\n10749,"Romance ""Classic"""'),
    ).toEqual([{ id: 10749, name: 'Romance "Classic"' }]);
  });

  it('ignores blank rows', () => {
    expect(parseGenresCsv('id,name\n\n28,Action\n,')).toEqual([
      { id: 28, name: 'Action' },
    ]);
  });

  it('rejects invalid headers and row values', () => {
    expect(() => parseGenresCsv('genre_id,name\n28,Action')).toThrow(
      'CSV must have exactly two columns: id and name',
    );
    expect(() => parseGenresCsv('id,name\n0,Action')).toThrow(
      'CSV row 2 has an invalid genre id',
    );
    expect(() => parseGenresCsv('id,name\n28,')).toThrow(
      'CSV row 2 has an empty genre name',
    );
    expect(() => parseGenresCsv('id,name\n28,Action,extra')).toThrow();
  });

  it('rejects malformed CSV quoting', () => {
    expect(() => parseGenresCsv('id,name\n28,"Action')).toThrow();
    expect(() => parseGenresCsv('id,name\n28,"Action"x')).toThrow();
  });
});
