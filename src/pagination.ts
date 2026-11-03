import InvalidCursorPayload from './exceptions/invalid-cursor-payload.js';
import InvalidPage from './exceptions/invalid-page.js';

export type CursorSort = 'ASC' | 'DESC';

export type CursorCriterion = [string, unknown, CursorSort];

export type CursorPayload = CursorCriterion[];

export default class Pagination {
  private constructor(
    readonly kind: 'Page' | 'Cursor',
    private readonly page_: number | null,
    private readonly cursor_: CursorPayload | null,
  ) {
    Object.freeze(this);
  }

  static byPage(page = 1) {
    this.validatePage(page);
    return new Pagination('Page', page, null);
  }

  static byCursor(cursor: CursorPayload) {
    this.validateCursorPayload(cursor);

    return new Pagination('Cursor', null, cursor);
  }

  static validatePage(page: number) {
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidPage(page);
    }
  }

  private static isUndefinedOrNull(value: unknown) {
    return value === undefined || value === null;
  }

  private static validateCursorCriterion(criterion: unknown) {
    if (!Array.isArray(criterion)) {
      throw new InvalidCursorPayload(
        'criterion must be a non-empty array',
        criterion,
      );
    }

    const [field, value, sort] = criterion as unknown[];

    if (
      this.isUndefinedOrNull(field) ||
      this.isUndefinedOrNull(value) ||
      (sort !== 'DESC' && sort !== 'ASC')
    ) {
      throw new InvalidCursorPayload('criterion malformed', criterion);
    }
  }

  private static validateCursorPayload(payload: unknown) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new InvalidCursorPayload(
        'payload must be a non-empty array',
        payload,
      );
    }
    Object.freeze(payload);
    for (const element of payload) {
      this.validateCursorCriterion(element);
      Object.freeze(element);
    }
  }
  get page(): Readonly<number | null> {
    return this.page_;
  }

  get cursor(): Readonly<CursorPayload | null> {
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
