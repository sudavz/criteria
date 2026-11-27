import InvalidCursorPayload from './exceptions/invalid-cursor-payload.js';
import InvalidPage from './exceptions/invalid-page.js';
import InvalidPagination from './exceptions/invalid-pagination.js';
import { fieldNameRegex } from './filter/filter-parser.js';

export type CursorSort = 'ASC' | 'DESC';

export type CursorCriterion = [string, unknown, CursorSort];

export type CursorPayload = CursorCriterion[];

export type PaginationFromOptions =
  | {
      cursor: CursorPayload;
      page?: never;
    }
  | { page: number; cursor?: never };

export default class Pagination {
  private constructor(
    readonly kind: 'Page' | 'Cursor',
    private readonly page_: number | null,
    private readonly cursor_: readonly Readonly<CursorCriterion>[] | null,
  ) {
    Object.freeze(this);
  }

  static byPage(page = 1) {
    this.validatePage(page);
    return new Pagination('Page', page, null);
  }

  static byCursor(cursor: CursorPayload) {
    const cursor_ = this.validateCursorPayload(cursor);
    return new Pagination('Cursor', null, cursor_);
  }

  static validatePage(page: number) {
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidPage(page);
    }
  }

  static fromOptions(objectPlain: PaginationFromOptions): Pagination {
    if (
      objectPlain === null ||
      objectPlain === undefined ||
      Object.getPrototypeOf(objectPlain) !== Object.prototype
    ) {
      throw new InvalidPagination(
        'Pagination by options must be an object with "cursor" or "page" propierty',
        objectPlain,
      );
    }
    const keys = Object.keys(objectPlain);
    if (keys.length !== 1) {
      throw new InvalidPagination(
        'Pagination by options must be an object with "cursor" or "page" propierty',
        objectPlain,
      );
    }
    if (keys[0] === 'cursor')
      return Pagination.byCursor(
        (objectPlain as { cursor: CursorPayload }).cursor,
      );
    if (keys[0] === 'page') {
      const page = (objectPlain as { page: number }).page;
      if (page === undefined)
        throw new InvalidPagination(
          'Pagination by options with "page" must be a number',
          page,
        );
      return Pagination.byPage(page);
    }
    throw new InvalidPagination(
      'Pagination by options has invalid key',
      objectPlain,
    );
  }

  private static isUndefinedOrNull(value: unknown) {
    return value === undefined || value === null;
  }

  private static validateCursorPayload(payload: unknown) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new InvalidCursorPayload(
        'payload must be a non-empty array',
        payload,
      );
    }

    const finalPayload: Readonly<CursorCriterion>[] = [];
    for (const criterion of payload) {
      if (!Array.isArray(criterion) || criterion.length != 3) {
        throw new InvalidCursorPayload(
          'criterion must be a non-empty array with field name, value and sort',
          criterion,
        );
      }

      const [field, value, sort] = criterion as unknown[];

      if (
        typeof field !== 'string' ||
        !fieldNameRegex.test(field) ||
        this.isUndefinedOrNull(value) ||
        (sort !== 'DESC' && sort !== 'ASC')
      ) {
        throw new InvalidCursorPayload('criterion malformed', criterion);
      }
      finalPayload.push(Object.freeze([field, value, sort]));
    }
    return Object.freeze(finalPayload);
  }

  get page(): number | null {
    return this.page_;
  }

  get cursor() {
    return this.cursor_;
  }

  toObjectPlain() {
    return Object.freeze({
      kind: this.kind,
      page: this.page_,
      cursor: this.cursor_,
    });
  }
}
