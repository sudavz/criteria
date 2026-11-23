import Pagination, { type CursorPayload } from '../src/pagination';
import InvalidPage from '../src/exceptions/invalid-page';
import InvalidCursorPayload from '../src/exceptions/invalid-cursor-payload';
import { describe, expect, it, test } from 'vitest';

describe('Pagination', () => {
  describe('by page', () => {
    it.for([
      () => {},
      false,
      true,
      null,
      { test: 'test' },
      0,
      -234,
      -1,
      23.12,
      Infinity,
      -Infinity,
    ])('should throw InvalidPage when page is %s', (page) => {
      expect(() => Pagination.byPage(page as any)).toThrow(InvalidPage);
    });

    it.for([
      { page: undefined, expected: 1 },
      { page: 1, expected: 1 },
      { page: 2, expected: 2 },
      { page: 34, expected: 34 },
      { page: 50, expected: 50 },
      { page: 60, expected: 60 },
      { page: 603, expected: 603 },
      { page: 30e4, expected: 30e4 },
      { page: 90e23, expected: 90e23 },
    ])('should create pagination with $page page', ({ page, expected }) => {
      const pagination = Pagination.byPage(page);
      expect(pagination).toBeInstanceOf(Pagination);
      expect(pagination.page).toEqual(expected);
      expect(pagination.toObjectPlain()).toStrictEqual({
        kind: 'Page',
        page: expected,
        cursor: null,
      });
    });
  });

  describe('by cursor', () => {
    it.for([
      [[null, null, 'a']],
      [null, {}],
      [{}],
      [],
      null,
      undefined,
      [[1, 1, 'DESC']],
      [[true, false, 'DESC']],
      [['', false, 'DESC']],
      [['field', false, 'ASC', 'extra1', 'extra2', 'extra3']],
    ])('should throw InvalidCursorPayload when cursor is $0', (cursor) => {
      expect(() => {
        Pagination.byCursor(cursor as any);
      }).toThrow(InvalidCursorPayload);
    });

    it.for([
      [['field1', 'value1', 'DESC']],
      [['field2', 567, 'ASC']],
      [['field3', 'value3', 'DESC']],
    ])('should create a valid pagination instance with $0', (cursor) => {
      const result = Pagination.byCursor(cursor as any);
      expect(result).toBeInstanceOf(Pagination);
      expect(result.toObjectPlain()).toStrictEqual({
        kind: 'Cursor',
        page: null,
        cursor,
      });
      expect(result.page).toBeNull();
      expect(result.cursor).toStrictEqual(cursor);
    });
  });
});
