import InvalidLimit from './exceptions/invalid-limit.js';
import InvalidOrderBy from './exceptions/invalid-orderby.js';
import InvalidPagination from './exceptions/invalid-pagination.js';
import { ExpressionNode } from './filter/ast.js';
import * as FilterParser from './filter/filter-parser.js';
import { Expression, ValidValueTypes } from './filter/grammar.js';
import Pagination from './pagination.js';

type OrderBy = Map<string, Sort>;

export type Sort = 'ASC' | 'DESC';

export type OrderByRaw<T> =
  | [T extends object ? keyof T : string, Sort][]
  | Partial<Record<T extends object ? keyof T : string, Sort>>
  | Map<T extends object ? keyof T : string, Sort>;

export interface CriteriaOptions<
  T extends Record<string, ValidValueTypes> = Record<string, ValidValueTypes>,
> {
  filter?: Expression<T> | null;
  pagination?: Pagination | null;
  /**
   * Sorts by the listed fields, in priority order.
   *
   * @remarks
   * Accepts an object, array of pairs, or Map. Use `ASC` or `DESC` for each field.
   * Objects may reorder numeric field names; use an array or Map to preserve
   * their priority. Repeated field names in an array throw `InvalidOrderBy`.
   *
   * @example
   * ```typescript
   * type Fields = { id: number; name: string };
   *
   * const withObject: OrderByRaw<Fields> = { id: 'DESC', name: 'ASC' };
   * const withArray: OrderByRaw<Fields> = [['id', 'DESC'], ['name', 'ASC']];
   * const withMap: OrderByRaw<Fields> = new Map(withArray);
   * ```
   */
  orderBy?: OrderByRaw<T> | null;
  limit?: number | null;
}

export class Criteria<
  T extends Record<string, ValidValueTypes> = Record<string, ValidValueTypes>,
> {
  private orderBy_: OrderBy;

  private constructor(
    private filterExpression_: ExpressionNode | null,
    private pagination_: Pagination | null,
    orderBy: OrderByRaw<T>,
    private limit_: number | null,
  ) {
    this.validateLimit(limit_);
    this.validatePaginationIntegrity(pagination_, limit_);
    this.orderBy_ = this.validateOrderBy(orderBy);
    Object.freeze(this);
  }

  static create<
    T extends Record<string, ValidValueTypes> = Record<string, ValidValueTypes>,
  >(criteriaOptions: CriteriaOptions<NoInfer<T>> = {}) {
    const { filter, limit, orderBy, pagination } = criteriaOptions;

    const filterExpression = filter ? FilterParser.parse(filter) : null;

    const criteria = new Criteria<T>(
      filterExpression,
      pagination ?? null,
      orderBy ?? [],
      limit ?? null,
    );

    return criteria;
  }

  private validateOrderBy(orderBy: OrderByRaw<T>): OrderBy {
    let orderBy_: [string, unknown][] = [];

    if (Array.isArray(orderBy)) {
      orderBy_ = orderBy;
    } else if (orderBy instanceof Map) {
      orderBy_ = Array.from(orderBy);
    } else if (
      orderBy !== null &&
      Object.getPrototypeOf(orderBy) === Object.prototype
    ) {
      orderBy_ = Object.entries(orderBy);
    } else {
      throw new InvalidOrderBy('The orderBy must be an array, object or Map');
    }

    const orderBySanitized: OrderBy = new Map<string, Sort>([]);

    for (const criterion of orderBy_) {
      if (!Array.isArray(criterion)) {
        throw new InvalidOrderBy(
          'The criterion of orderBy must be an array',
          criterion,
        );
      }

      if (criterion.length !== 2) {
        throw new InvalidOrderBy(
          'The criterion must contain only two elements, field and sort',
          criterion,
        );
      }

      const [field, sort] = criterion;

      if (sort !== 'DESC' && sort !== 'ASC') {
        throw new InvalidOrderBy('The sort value must be ASC or DESC', sort);
      }
      if (typeof field !== 'string') {
        throw new InvalidOrderBy('The field order must be a string', field);
      }
      if (orderBySanitized.has(field)) {
        throw new InvalidOrderBy(`The field ${field} has multiple entries.`);
      }
      orderBySanitized.set(field, sort);
    }

    return orderBySanitized;
  }

  private validatePaginationIntegrity(
    pagination: Pagination | null,
    limit: number | null,
  ) {
    if (pagination !== null && !(pagination instanceof Pagination)) {
      throw new InvalidPagination(
        'The pagination must be an object of the type Pagination',
        pagination,
      );
    }

    if (pagination !== null && !Number.isInteger(limit)) {
      throw new InvalidPagination(
        'To apply pagination you must provide a limit',
      );
    }
  }

  private validateLimit(limit: number | null) {
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      throw new InvalidLimit(limit);
    }
  }

  get orderBy() {
    return Object.freeze(Array.from(this.orderBy_.entries()));
  }

  get limit(): Readonly<number | null> {
    return this.limit_;
  }

  get pagination(): Readonly<Pagination | null> {
    return Object.freeze(this.pagination_);
  }

  get filterExpression(): Readonly<ExpressionNode | null> {
    return Object.freeze(this.filterExpression_);
  }

  toObjectPlain() {
    return Object.freeze({
      filterExpression: this.filterExpression,
      pagination: this.pagination_?.toObjectPlain() ?? null,
      orderBy: this.orderBy,
      limit: this.limit,
    });
  }
}
