import Pagination, { type CursorPayload } from '../src/pagination';
import InvalidPage from '../src/exceptions/invalid-page';
import InvalidCursorPayload from '../src/exceptions/invalid-cursor-payload';
import { describe, expect, it, test } from 'vitest';
import InvalidPagination from '../src/exceptions/invalid-pagination';

describe('Pagination', () => {
  const invalidToPage = [
    () => {},
    false,
    true,
    null,
    { test: 'test' },
    0,
    -234,
    -1,
    '1',
    '2',
    23.12,
    Infinity,
    -Infinity,
    new Date(),
    new Set(),
    new Map(),
    new Error(),
  ];

  const validToPage = [
    { page: 1, expected: 1 },
    { page: 2, expected: 2 },
    { page: 34, expected: 34 },
    { page: 50, expected: 50 },
    { page: 60, expected: 60 },
    { page: 603, expected: 603 },
    { page: 30e4, expected: 30e4 },
    { page: 90e23, expected: 90e23 },
  ];

  describe('by page', () => {
    it.concurrent.for(invalidToPage)(
      'should throw InvalidPage when page is %s',
      (page) => {
        expect(() => Pagination.byPage(page as any)).toThrow(InvalidPage);
      },
    );

    it('should create pagination without page', () => {
      const pagination = Pagination.byPage();
      expect(pagination).toBeInstanceOf(Pagination);
      expect(pagination.page).toEqual(1);
      expect(pagination.toObjectPlain()).toStrictEqual({
        kind: 'Page',
        page: 1,
        cursor: null,
      });
    });

    it.concurrent.for(validToPage)(
      'should create pagination with $page page',
      ({ page, expected }) => {
        const pagination = Pagination.byPage(page);
        expect(pagination).toBeInstanceOf(Pagination);
        expect(pagination.page).toEqual(expected);
        expect(pagination.toObjectPlain()).toStrictEqual({
          kind: 'Page',
          page: expected,
          cursor: null,
        });
      },
    );
  });

  const invalidToCursor = [
    null,
    undefined,
    true,
    false,
    -1,
    1,
    0,
    '1',
    [[null, null, 'a']],
    [null, {}],
    [{}],
    [],
    [[1, 1, 'DESC']],
    [[true, false, 'DESC']],
    [['', false, 'DESC']],
    [['field', false, 'ASC', 'extra1', 'extra2', 'extra3']],
    new Date(),
    new Set(),
    new Map(),
    new Error(),
  ];

  const validToCursor = [
    [['field1', 'value1', 'DESC']],
    [['field2', 567, 'ASC']],
    [['field3', 'value3', 'DESC']],
  ];

  describe('by cursor', () => {
    it.for(invalidToCursor)(
      'should throw InvalidCursorPayload when cursor is $0',
      (cursor) => {
        expect(() => {
          Pagination.byCursor(cursor as any);
        }).toThrow(InvalidCursorPayload);
      },
    );

    it.for(validToCursor)(
      'should create a valid pagination instance with $0',
      (cursor) => {
        const result = Pagination.byCursor(cursor as any);
        expect(result).toBeInstanceOf(Pagination);
        expect(result.toObjectPlain()).toStrictEqual({
          kind: 'Cursor',
          page: null,
          cursor,
        });
        expect(result.page).toBeNull();
        expect(result.cursor).toStrictEqual(cursor);
      },
    );
  });

  describe('from options', () => {
    const invalidToFromOptions = [
      null,
      undefined,
      1,
      0,
      -1,
      Infinity,
      true,
      false,
      'good',
      [],
      [undefined],
      [null],
      {},
      {
        key: 'value',
      },
      () => {},
      {
        cursor: [['field1', 'value1', 'DESC']],
        page: 1,
      },
      new Date(),
      new Set(),
      new Map(),
      new Error(),
    ];

    it.concurrent.for(invalidToFromOptions)(
      'should throw InvalidPagination when fromOptions receives %s',
      (input) => {
        expect(() => Pagination.fromOptions(input as any)).toThrow(
          InvalidPagination,
        );
      },
    );

    describe('page', () => {
      it.concurrent.for(invalidToPage)(
        'should throw InvalidPage when fromOptions receives %s in page option',
        (page) => {
          expect(() => Pagination.fromOptions({ page } as any)).toThrow(
            InvalidPage,
          );
        },
      );

      it('should reject an undefined page option with InvalidPagination', (page) => {
        expect(() =>
          Pagination.fromOptions({ page: undefined } as any),
        ).toThrow(InvalidPagination);
      });

      it.concurrent.for(validToPage)(
        'should pass when fromOptions receives %s in page option',
        ({ page, expected }) => {
          const pagination = Pagination.fromOptions({ page } as any);
          expect(pagination).toBeInstanceOf(Pagination);
          expect(pagination.page).toEqual(expected);
          expect(pagination.toObjectPlain()).toStrictEqual({
            kind: 'Page',
            page: expected,
            cursor: null,
          });
        },
      );
    });

    describe('cursor', () => {
      it.concurrent.for(invalidToCursor)(
        'should throw InvalidCursorPayload when fromOptions receives %s in cursor option',
        (cursor) => {
          expect(() => Pagination.fromOptions({ cursor } as any)).toThrow(
            InvalidCursorPayload,
          );
        },
      );

      it.concurrent.for(validToCursor)(
        'should pass when fromOptions receives %s in cursor option',
        (cursor) => {
          const result = Pagination.fromOptions({ cursor } as any);
          expect(result).toBeInstanceOf(Pagination);
          expect(result.toObjectPlain()).toStrictEqual({
            kind: 'Cursor',
            page: null,
            cursor,
          });
          expect(result.page).toBeNull();
          expect(result.cursor).toStrictEqual(cursor);
        },
      );
    });
  });
});
