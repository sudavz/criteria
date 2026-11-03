import Pagination, { type CursorPayload } from '../src/pagination';
import InvalidPage from '../src/exceptions/invalid-page';
import InvalidCursorPayload from '../src/exceptions/invalid-cursor-payload';
import { describe, expect, it } from 'vitest';

describe('Pagination', () => {
  describe('Pagination by page', () => {
    it('should throw an error when page is null', () => {
      expect(() => Pagination.byPage(null as any)).toThrow(InvalidPage);
    });

    it('should throw an error when page is an object', () => {
      expect(() => Pagination.byPage({ test: 'test' } as any)).toThrow(
        InvalidPage,
      );
    });

    it('should throw an error when page is zero', () => {
      expect(() => Pagination.byPage(0)).toThrow(InvalidPage);
    });

    it('should throw an error when page is negative', () => {
      expect(() => Pagination.byPage(-234)).toThrow(InvalidPage);
    });

    it('should throw an error when page is a decimal', () => {
      expect(() => Pagination.byPage(23.12)).toThrow(InvalidPage);
    });

    it('should throw an error when page is Infinity', () => {
      expect(() => Pagination.byPage(Infinity)).toThrow(InvalidPage);
    });

    it('should throw an error when page is -Infinity', () => {
      expect(() => Pagination.byPage(-Infinity)).toThrow(InvalidPage);
    });

    it('should create pagination with integer greater than 1', () => {
      const pagination = Pagination.byPage(46);
      expect(pagination).toBeInstanceOf(Pagination);
      expect(pagination.toObjectPlain()).toStrictEqual({
        kind: 'Page',
        page: 46,
        cursor: null,
      });
    });

    it('should create pagination object without page value', () => {
      const pagination = Pagination.byPage();
      expect(pagination).toBeInstanceOf(Pagination);
      expect(pagination.toObjectPlain()).toStrictEqual({
        kind: 'Page',
        page: 1,
        cursor: null,
      });
    });
  });

  describe('Pagination by cursor', () => {
    it('should throw an error when cursor criterion has invalid input', () => {
      expect(() => {
        Pagination.byCursor([[null, null, 'a']] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([null, {}] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([{}] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor(null as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([[1, 1, 'DESC']] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([[true, false, 'DESC']] as any);
      }).toThrow(InvalidCursorPayload);

      expect(() => {
        Pagination.byCursor([['', false, 'DESC']] as any);
      }).toThrow(InvalidCursorPayload);
    });

    it('should create a valid pagination instance with DESC sort', () => {
      const cursorTest: CursorPayload = [['field', 'value', 'DESC']];
      const result = Pagination.byCursor(cursorTest);

      expect(result).toBeInstanceOf(Pagination);
      expect(result.toObjectPlain()).toStrictEqual({
        kind: 'Cursor',
        page: null,
        cursor: [['field', 'value', 'DESC']],
      });
      expect(result.page).toBeNull();
      expect(result.cursor).toStrictEqual([['field', 'value', 'DESC']]);
    });

    it('should create a valid pagination instance with ASC sort', () => {
      const cursorTest: CursorPayload = [['field', 567, 'ASC']];

      const result = Pagination.byCursor(cursorTest);

      expect(result).toBeInstanceOf(Pagination);
      expect(result.toObjectPlain()).toStrictEqual({
        kind: 'Cursor',
        page: null,
        cursor: [['field', 567, 'ASC']],
      });
      expect(result.page).toBeNull();
      expect(result.cursor).toStrictEqual([['field', 567, 'ASC']]);
    });
  });
});
