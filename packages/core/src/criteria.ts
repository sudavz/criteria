import InvalidLimit from './exceptions/invalid-limit.js';
import InvalidPagination from './exceptions/invalid-pagination.js';
import { ExpressionNode } from './filter/ast.js';
import filterParser from './filter/filter-parser.js';
import {
  DefaultExpressionType,
  ExpressionWithBooleanReturn,
} from './filter/grammar.js';
import { OrderBy, OrderByRaw } from './order-by.js';
import Pagination, { PaginationFromOptions } from './pagination.js';

export interface CriteriaOptions<
  T extends DefaultExpressionType<T> = DefaultExpressionType,
> {
  filter?: ExpressionWithBooleanReturn<T> | null;
  /**
   * Sorts by the listed fields, in priority order.
   *
   * @remarks
   * Accepts an object, array of pairs, or Map. Use `ASC` or `DESC` for each field.
   * Repeated field names in an array throw `InvalidOrderBy`.
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
  /**
   * Paginates results by page or cursor.
   *
   * @remarks
   * Pagination requires a limit. Cursor pagination uses the sort order in the
   * cursor. Combining it with a non-empty `orderBy` throws `InvalidPagination`.
   */
  pagination?: Pagination | PaginationFromOptions | null;
}

export class Criteria<
  T extends DefaultExpressionType<T> = DefaultExpressionType,
> {
  private orderBy_: OrderBy<T>;
  private pagination_: Pagination | null;

  private constructor(
    private filterExpression_: ExpressionNode | null,
    pagination: Pagination | PaginationFromOptions | null,
    orderBy: OrderByRaw<T> | null,
    private limit_: number | null,
  ) {
    this.validateLimit(limit_);
    this.orderBy_ = OrderBy.create(orderBy ?? []);
    this.pagination_ = this.validatePaginationIntegrity(
      pagination,
      limit_,
      this.orderBy_,
    );
    Object.freeze(this);
  }

  static create<T extends DefaultExpressionType<T> = DefaultExpressionType>(
    criteriaOptions: CriteriaOptions<NoInfer<T>> = {},
  ) {
    const { filter, limit, orderBy, pagination } = criteriaOptions;

    const filterExpression = filter ? filterParser(filter) : null;

    const criteria = new Criteria<T>(
      filterExpression,
      pagination ?? null,
      orderBy ?? null,
      limit ?? null,
    );

    return criteria;
  }

  private validatePaginationIntegrity(
    pagination: Pagination | PaginationFromOptions | null,
    limit: number | null,
    orderBy: OrderBy<T>,
  ): Pagination | null {
    let validPagination;

    if (pagination instanceof Pagination || pagination === null) {
      validPagination = pagination;
    } else {
      validPagination = Pagination.fromOptions(pagination);
    }

    if (validPagination !== null && !Number.isInteger(limit)) {
      throw new InvalidPagination(
        'To apply pagination you must provide a limit',
      );
    }

    if (validPagination?.kind === 'Cursor' && orderBy.size > 0) {
      throw new InvalidPagination(
        'Cursor pagination cannot be combined with a non-empty orderBy',
      );
    }
    return validPagination;
  }

  private validateLimit(limit: number | null) {
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      throw new InvalidLimit(limit);
    }
  }

  get orderBy() {
    return this.orderBy_.value;
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
