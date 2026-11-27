import { fieldNameRegex } from './filter/filter-parser.js';
import InvalidOrderBy from './exceptions/invalid-orderby.js';

export type Sort = 'ASC' | 'DESC';

type OrderByFromArray<T> = [T extends object ? keyof T : string, Sort][];

export type OrderByRaw<T> =
  | OrderByFromArray<T>
  | Partial<Record<T extends object ? keyof T : string, Sort>>
  | Map<T extends object ? keyof T : string, Sort>;

type ValueMap<T> = Map<T extends object ? keyof T : string, Sort>;

export class OrderBy<T = Record<string, unknown>> {
  private readonly value_: ValueMap<T>;

  constructor(value: OrderByRaw<T>) {
    this.value_ = this.validateOrderBy(value);
  }

  static create<T>(orderByRaw: OrderByRaw<T>) {
    return new OrderBy<T>(orderByRaw);
  }

  private validateOrderBy(orderBy: OrderByRaw<T>) {
    let orderBy_: OrderByFromArray<T> = [];
    if (Array.isArray(orderBy)) {
      orderBy_ = orderBy;
    } else if (orderBy instanceof Map) {
      orderBy_ = Array.from(orderBy);
    } else if (Object.getPrototypeOf(orderBy) === Object.prototype) {
      orderBy_ = Object.entries(orderBy) as OrderByFromArray<T>;
    } else {
      throw new InvalidOrderBy('The orderBy must be an array, object or Map');
    }

    const orderBySanitized: ValueMap<T> = new Map([]);

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
      if (typeof field !== 'string' || !fieldNameRegex.test(field)) {
        throw new InvalidOrderBy(
          'The field order must be a string valid',
          field,
        );
      }
      if (orderBySanitized.has(field)) {
        throw new InvalidOrderBy(`The field ${field} has multiple entries.`);
      }
      orderBySanitized.set(field, sort);
    }

    return orderBySanitized;
  }

  get size() {
    return this.value_.size;
  }

  get value() {
    return Object.freeze(Array.from(this.value_.entries()));
  }
}
