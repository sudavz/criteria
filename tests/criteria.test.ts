import { describe, it, expect } from 'vitest';
import { Criteria } from '../src/criteria';
import InvalidLimit from '../src/exceptions/invalid-limit';
import InvalidOrderBy from '../src/exceptions/invalid-orderby';
import InvalidPagination from '../src/exceptions/invalid-pagination';
import Pagination from '../src/pagination';

describe('Criteria', () => {
  it('should create a Criteria object', () => {
    const criteria: Criteria = Criteria.create({
      filter: {
        and: [{ username: { equals: 'suanfansoon' } }, { age: { gt: 25 } }],
      },
      pagination: Pagination.byPage(23),
      limit: 23,
    });

    const criteriPlainObject = criteria.toObjectPlain();

    expect(criteria).toBeInstanceOf(Criteria);
    expect(criteria.limit).toBe(23);
    expect(criteria.pagination).toBeInstanceOf(Pagination);
    expect(criteria.pagination?.toObjectPlain()).toStrictEqual({
      kind: 'Page',
      page: 23,
      cursor: null,
    });
    expect(criteria.orderBy).toEqual([]);
    expect(criteria.orderBy).toHaveLength(0);
    expect(criteriPlainObject).toMatchObject({
      filterExpression: {
        kind: 'LogicalNode',
        left: {
          kind: 'ComparisonNode',
          left: {
            kind: 'FieldNode',
            value: 'username',
          },
          operator: '==',
          right: {
            kind: 'LiteralNode',
            value: 'suanfansoon',
          },
        },
        operator: '&&',
        right: {
          kind: 'ComparisonNode',
          left: {
            kind: 'FieldNode',
            value: 'age',
          },
          operator: '>',
          right: {
            kind: 'LiteralNode',
            value: 25,
          },
        },
      },
      pagination: { kind: 'Page', page: 23, cursor: null },
      orderBy: [],
      limit: 23,
    });
  });

  it('should create a Criteria object with only expression filters', () => {
    const criteria: Criteria = Criteria.create({
      filter: {
        mood: { equals: 'push it to the limit !!' },
      },
    });

    const criteriPlainObject = criteria.toObjectPlain();

    expect(criteria).toBeInstanceOf(Criteria);
    expect(criteria.limit).toBeNull();
    expect(criteria.pagination).toBeNull();
    expect(criteria.orderBy).toEqual([]);
    expect(criteria.orderBy).toHaveLength(0);
    expect(criteriPlainObject).toMatchObject({
      filterExpression: {
        kind: 'ComparisonNode',
        left: {
          kind: 'FieldNode',
          value: 'mood',
        },
        operator: '==',
        right: {
          kind: 'LiteralNode',
          value: 'push it to the limit !!',
        },
      },
      pagination: null,
      orderBy: [],
      limit: null,
    });
  });

  it('should create a Criteria object without data', () => {
    const criteria: Criteria = Criteria.create();

    const criteriaPlainObject = criteria.toObjectPlain();

    expect(criteria).toBeInstanceOf(Criteria);
    expect(criteria.limit).toBeNull();
    expect(criteria.pagination).toBeNull();
    expect(criteria.orderBy).toEqual([]);
    expect(criteria.orderBy).toHaveLength(0);
    expect(criteriaPlainObject).toStrictEqual({
      filterExpression: null,
      pagination: null,
      orderBy: [],
      limit: null,
    });
  });

  describe('Limit criteria', () => {
    it.for([
      -1,
      -431,
      Infinity,
      -Infinity,
      1003.32,
      467.32,
      -1.32,
      0,
      'hello!!',
      'hello world',
      true,
      false,
      {},
      () => {},
      new Date(),
    ])('should throw InvalidLimit when limit is $0', (limit) => {
      expect(() => Criteria.create({ limit } as any)).toThrow(InvalidLimit);
    });

    it.for([
      { limit: null, expected: null },
      { limit: undefined, expected: null },
      { limit: 1, expected: 1 },
      { limit: 2, expected: 2 },
      { limit: 34, expected: 34 },
      { limit: 50, expected: 50 },
      { limit: 60, expected: 60 },
      { limit: 603, expected: 603 },
      { limit: 30e4, expected: 30e4 },
      { limit: 90e23, expected: 90e23 },
    ])('should pass when limit is $limit', ({ limit, expected }) => {
      expect(Criteria.create({ limit }).limit).toBe(expected);
    });
  });

  describe('orderBy criteria', () => {
    it.for([
      { orderBy: [] as any[] },
      { orderBy: [['name', 'DESC']] },
      { orderBy: [['username', 'ASC']] },
      {
        orderBy: [
          ['age', 'DESC'],
          ['createdAt', 'ASC'],
        ],
      },
    ])('should pass when orderBy is $orderBy', ({ orderBy }) => {
      expect(Criteria.create({ orderBy } as any).orderBy).toStrictEqual(
        orderBy,
      );
    });

    it.for([
      '[[]]',
      344,
      344,
      true,
      false,
      () => {},
      ['[[]]'],
      [344, null],
      [true],
      [false],
      [() => {}],
      [[null, 'DSec']],
      [['null', null]],
      [[]],
      [
        ['field', 'DESC'],
        ['field', 'ASC'],
        ['field', 34],
      ],
      [
        ['field', 'DESC'],
        ['field', 'ASC'],
        ['field', 'ASI'],
      ],
      [['field', 'DESC'], ['field', 'ASC'], ['ASI']],
      [['field', null, 'DESC', '2', true]],
      [['field', 'ASC', 'DESC', '2', true]],
      [[2, 'ASC']],
      [[true, 'ASC']],
      [[false, 'ASC']],
      [[null, 'ASC']],
      [[() => {}, 'ASC']],
      [['id', 23, 'DESC', 'extra1', 'extra2', 'extra3', 'extra4']],
    ])('should throw InvalidOrderBy when orderBy is %s', (orderBy) => {
      expect(() => Criteria.create({ orderBy } as any)).toThrow(InvalidOrderBy);
    });
  });

  describe('Pagination criteria', () => {
    it.for([
      { pagination: Pagination.byPage(14), limit: 10 },
      { pagination: Pagination.byPage(34), limit: 100 },
      { pagination: Pagination.byPage(32345), limit: 103 },
      { pagination: Pagination.byPage(234544), limit: 343434 },
      { pagination: Pagination.byCursor([['id', 1, 'ASC']]), limit: 103 },
      { pagination: Pagination.byCursor([['id', 3, 'DESC']]), limit: 23788 },
    ])(
      'should pass when pagination is $pagination and limit is $limit',
      ({ pagination, limit }) => {
        const criteria = Criteria.create({
          pagination,
          limit,
        });

        expect(criteria.pagination).toBeInstanceOf(Pagination);
        expect(criteria.toObjectPlain()).toStrictEqual({
          filterExpression: null,
          pagination: pagination.toObjectPlain(),
          orderBy: [],
          limit,
        });
        expect(criteria.limit).toBe(limit);
      },
    );

    it.for([
      { pagination: Pagination.byPage(34), limit: undefined },
      { pagination: Pagination.byPage(45), limit: undefined },
      { pagination: Pagination.byPage(34), limit: null },
      { pagination: Pagination.byPage(45), limit: null },
      {
        pagination: Pagination.byCursor([['field', 0, 'ASC']]),
        limit: undefined,
      },
      {
        pagination: Pagination.byCursor([['field', 0, 'ASC']]),
        limit: null,
      },
      { pagination: 'pagination', limit: 2 },
      { pagination: true, limit: 3 },
      { pagination: false, limit: 4 },
      { pagination: () => {}, limit: 4 },
      { pagination: { test: 'test' }, limit: 4 },
      { pagination: new Date(), limit: 4 },
      { pagination: new Map([['hello', 'world']]), limit: 4 },
      { pagination: [[]], limit: 4 },
    ])(
      'should throw InvalidPagination when pagination is $pagination and limit is $limit',
      ({ pagination, limit }) => {
        expect(() => Criteria.create({ pagination, limit } as any)).toThrow(
          InvalidPagination,
        );
      },
    );
  });
});
