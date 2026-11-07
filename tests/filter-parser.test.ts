import * as FilterParser from '../src/filter/filter-parser';
import { Expression } from '../src/filter/grammar';
import InvalidExpression from '../src/exceptions/invalid-expression';
import { describe, expect, it } from 'vitest';

describe('FilterParser', () => {
  describe('general expressions', () => {
    it('should parse valid logical and comparison expressions', () => {
      const parserResult = FilterParser.parse({
        and: [{ username: { diff: 'jazzz' } }, { age: { lte: '$parentAage' } }],
      });

      expect(parserResult).toMatchObject({
        kind: 'LogicalNode',
        left: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'username' },
          operator: '!=',
          right: { kind: 'LiteralNode', value: 'jazzz' },
        },
        operator: '&&',
        right: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'age' },
          operator: '<=',
          right: { kind: 'FieldNode', value: 'parentAage' },
        },
      });
    });

    it('should throw InvalidExpression when input object contains an invalid key', () => {
      const badExpression = {
        wrongKey: [1, 2],
      };
      expect(() => FilterParser.parse(badExpression as any)).toThrow(
        InvalidExpression,
      );
    });
  });

  describe('Literal expressions', () => {
    it.for([null, 123, true, false, "somebody's watching me"])(
      'should parse %s as a LiteralNode',
      (input) => {
        expect(FilterParser.parse(input)).toMatchObject({
          kind: 'LiteralNode',
          value: input,
        });
      },
    );
  });

  describe('Array expressions', () => {
    it('should parse a valid ArrayExpression', () => {
      expect(
        FilterParser.parse([1, 2, 3, 4, '5', '$nextNumber']),
      ).toMatchObject({
        kind: 'ArrayNode',
        items: [
          { kind: 'LiteralNode', value: 1 },
          { kind: 'LiteralNode', value: 2 },
          { kind: 'LiteralNode', value: 3 },
          { kind: 'LiteralNode', value: 4 },
          { kind: 'LiteralNode', value: '5' },
          { kind: 'FieldNode', value: 'nextNumber' },
        ],
      });
      expect(FilterParser.parse([-1, true])).toMatchObject({
        kind: 'ArrayNode',
        items: [
          { kind: 'LiteralNode', value: -1 },
          { kind: 'LiteralNode', value: true },
        ],
      });
    });

    it.for([
      [() => {}, () => {}],
      [{}],
      [undefined, undefined],
      [new Date()],
      [{ name: { equals: 'David' } }],
      [{ not: { x: { equals: 2 } } }],
      [{ not: { y: { gt: 2 } } }, { a: { in: [1, 3, 4, 5] } }],
    ])(
      'should throw InvalidExpression when array contains %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );
  });

  describe('logical expressions (and / or)', () => {
    it.for([
      { and: [] },
      { not: { or: [true] } },
      { and: [{}, 1] },
      { and: {} },
      { and: null },
    ])(
      'should throw InvalidExpression when logical expression is %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );

    it('should parse an or expression with multiple conditions', () => {
      const expression: Expression = {
        or: [
          { role: { equals: 'admin' } },
          { role: { equals: 'editor' } },
          { role: { equals: 'viewer' } },
        ],
      };

      const result = FilterParser.parse(expression);

      expect(result).toMatchObject({
        kind: 'LogicalNode',
        operator: '||',
        left: {
          kind: 'LogicalNode',
          operator: '||',
          left: {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'role' },
            operator: '==',
            right: { kind: 'LiteralNode', value: 'admin' },
          },
          right: {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'role' },
            operator: '==',
            right: { kind: 'LiteralNode', value: 'editor' },
          },
        },
        right: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'role' },
          operator: '==',
          right: { kind: 'LiteralNode', value: 'viewer' },
        },
      });
    });
  });

  describe('comparison expressions', () => {
    it.for([
      { dog: { equals: {} } },
      { age: { gt: 10, lt: 20 } },
      { score: { gt: true } },
      { some: { lt: {} } },
      { 1: { gt: () => {} } },
      { username: { gt: {} } },
      { cat: { diff: [() => {}, undefined] } },
      { age: { badOperator: {} } },
    ])(
      'should throw InvalidExpression when comparison expression is %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );

    it.for([
      {
        input: { startDate: { lte: '$endDate' } },
        field: 'startDate',
        operator: '<=',
        right: { kind: 'FieldNode', value: 'endDate' },
      },
      {
        input: { rate: { gte: 23 } },
        field: 'rate',
        operator: '>=',
        right: { kind: 'LiteralNode', value: 23 },
      },
      {
        input: { name: { lte: 'another day in paradise' } },
        field: 'name',
        operator: '<=',
        right: { kind: 'LiteralNode', value: 'another day in paradise' },
      },
      {
        input: { field: { eq: '$field2' } },
        field: 'field',
        operator: '==',
        right: { kind: 'FieldNode', value: 'field2' },
      },
      {
        input: {
          phoneNumbers: { equals: ['+56 30000000', '+51 70000000'] },
        },
        field: 'phoneNumbers',
        operator: '==',
        right: {
          kind: 'ArrayNode',
          items: [
            {
              kind: 'LiteralNode',
              value: '+56 30000000',
            },
            {
              kind: 'LiteralNode',
              value: '+51 70000000',
            },
          ],
        },
      },

      {
        input: { username: { equals: 'jaax' } },
        field: 'username',
        operator: '==',
        right: { kind: 'LiteralNode', value: 'jaax' },
      },
      {
        input: { username: { diff: 'pomni' } },
        field: 'username',
        operator: '!=',
        right: { kind: 'LiteralNode', value: 'pomni' },
      },
      {
        input: { username: { ne: 'pomni' } },
        field: 'username',
        operator: '!=',
        right: { kind: 'LiteralNode', value: 'pomni' },
      },
      {
        input: { points: { lt: 32.64 } },
        field: 'points',
        operator: '<',
        right: { kind: 'LiteralNode', value: 32.64 },
      },
      {
        input: { points: { gt: 32.64 } },
        field: 'points',
        operator: '>',
        right: { kind: 'LiteralNode', value: 32.64 },
      },
    ])(
      'should parse comparison with operator $operator for field $field',
      ({ input, field, operator, right }) => {
        const result = FilterParser.parse(input);
        expect(result).toMatchObject({
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: field },
          operator,
          right,
        });
      },
    );
  });

  describe('not expressions', () => {
    it.for([
      {},
      () => {},
      true,
      false,
      1,
      3,
      3.4,
      -1,
      [1, 2, '3', '5', true, 'turing'],
      undefined,
      null,
      new Date(),
    ])(
      'should throw InvalidExpression when not expression receive %s',
      (expression) => {
        expect(() => FilterParser.parse({ not: expression } as any)).toThrow(
          InvalidExpression,
        );
      },
    );

    it('should parse a valid not expression wrapping a comparison', () => {
      const expression: Expression = {
        not: { status: { equals: 'inactive' } },
      };

      const result = FilterParser.parse(expression);

      expect(result).toMatchObject({
        kind: 'NotNode',
        expression: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'status' },
          operator: '==',
          right: { kind: 'LiteralNode', value: 'inactive' },
        },
      });
    });

    it('should parse a valid not expression wrapping a between expression', () => {
      const expression: Expression = {
        not: { limit: { between: [0, 100] } },
      };

      const result = FilterParser.parse(expression);

      expect(result).toMatchObject({
        kind: 'NotNode',
        expression: {
          kind: 'BetweenNode',
          value: { kind: 'FieldNode', value: 'limit' },
          start: { kind: 'LiteralNode', value: 0 },
          end: { kind: 'LiteralNode', value: 100 },
        },
      });
    });
  });

  describe('in expressions', () => {
    it.for([
      { role: { in: [] } },
      { in: [() => {}, null] },
      { role: { in: [{ and: [true, true] }] } },
      { in: [{ and: [true, true] }, [1, 2]] },
      { some: { in: [1, [1, 2, 1, 1, {}]] } },
      { some: { in: [() => {}, { user: 'daaa' }] } },
    ])(
      'should throw InvalidExpression when in expression is %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );

    it('should parse a valid in expression with a field and literal list', () => {
      const expression: Expression = {
        cat: { in: ['dog', 'cat'] },
      };

      const resultParse = FilterParser.parse(expression);
      expect(resultParse).toMatchObject({
        kind: 'InNode',
        value: {
          kind: 'FieldNode',
          value: 'cat',
        },
      });
    });

    it('should parse a valid in expression containing nested array and field expressions', () => {
      const expression: Expression = {
        cat: { in: ['dog', '$animal', ['$dog', ['duck']]] },
      };

      const resultParse = FilterParser.parse(expression);
      expect(resultParse).toMatchObject({
        kind: 'InNode',
        value: {
          kind: 'FieldNode',
          value: 'cat',
        },
        arrayExpression: {
          kind: 'ArrayNode',
          items: [
            { kind: 'LiteralNode', value: 'dog' },
            { kind: 'FieldNode', value: 'animal' },
            {
              kind: 'ArrayNode',
              items: [
                { kind: 'FieldNode', value: 'dog' },
                {
                  kind: 'ArrayNode',
                  items: [
                    {
                      kind: 'LiteralNode',
                      value: 'duck',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
    });
  });

  describe('field identifier expressions', () => {
    it('should parse a field identifier as the target of an in operator', () => {
      const expression: Expression = {
        cat: { in: ['dog', 'cat'] },
      };

      const resultParse = FilterParser.parse(expression);
      expect(resultParse).toMatchObject({
        kind: 'InNode',
        value: {
          kind: 'FieldNode',
          value: 'cat',
        },
      });
    });

    it('should parse a valid field reference matching identifier regex', () => {
      const expression: Expression = {
        t3s_t: { equals: '$_sd_a_3_4' },
      };
      const resultParse = FilterParser.parse(expression);

      expect(resultParse).toMatchObject({
        kind: 'ComparisonNode',
      });
    });

    it('should parse a direct value', () => {
      const resultParse = FilterParser.parse('$username');
      expect(resultParse).toMatchObject({
        kind: 'FieldNode',
        value: 'username',
      });
    });

    it('should parse a valid field name matching identifier regex', () => {
      const expression: Expression = {
        _3st: { equals: 'clean_code' },
      };
      const resultParse = FilterParser.parse(expression);

      expect(resultParse).toMatchObject({
        kind: 'ComparisonNode',
      });
    });

    it.for([
      { indira_: { equals: '$' } },
      { '$%4f_': { equals: 'wtf' } },
      { '%4f_e_t': { gt: 3.14159 } },
      { '34_test': { gt: 0.57721 } },
      { '@_l': { in: [0.57721, 3.14159] } },
      { '"="" OR "': { equals: 'SQLi' } },
      { paganotto: { equals: '$s&?da34' } },
    ])(
      'should throw InvalidExpression when field identifier is invalid in %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );
  });

  describe('IsNull expression', () => {
    it.for([
      {
        input: { infinite: { isNull: true } },
        field: 'infinite',
        isNull: true,
      },
      { input: { fear: { isNull: false } }, field: 'fear', isNull: false },
    ])(
      'should parse isNull expression for field $field with isNull=$isNull',
      ({ input, field, isNull }) => {
        expect(FilterParser.parse(input)).toMatchObject({
          kind: 'IsNullNode',
          isNull,
          value: {
            kind: 'FieldNode',
            value: field,
          },
        });
      },
    );
    it('should parse a not expression wrapping an isNull expression', () => {
      expect(
        FilterParser.parse({ not: { email: { isNull: true } } }),
      ).toMatchObject({
        kind: 'NotNode',
        expression: {
          kind: 'IsNullNode',
          isNull: true,
          value: { kind: 'FieldNode', value: 'email' },
        },
      });
    });
    it.for([
      { love: { isNull: 1 } },
      { feelings: { isNull: 'true' } },
      { hate: { isNull: () => {} } },
      { blame: { isNull: null } },
      { money: { isNull: undefined } },
    ])(
      'should throw InvalidExpression when isNull receives non-boolean in %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );
  });

  describe('Between expression', () => {
    it.for([
      {
        input: { score: { between: [100, '$max_score'] } },
        field: 'score',
        start: { kind: 'LiteralNode', value: 100 },
        end: { kind: 'FieldNode', value: 'max_score' },
      },
      {
        input: { age: { between: [18, 30] } },
        field: 'age',
        start: { kind: 'LiteralNode', value: 18 },
        end: { kind: 'LiteralNode', value: 30 },
      },
      {
        input: { score: { between: ['$min_score', '$max_score'] } },
        field: 'score',
        start: { kind: 'FieldNode', value: 'min_score' },
        end: { kind: 'FieldNode', value: 'max_score' },
      },
    ])(
      'should parse between expression for field $field',
      ({ input, field, start, end }) => {
        expect(FilterParser.parse(input as any)).toMatchObject({
          kind: 'BetweenNode',
          value: { kind: 'FieldNode', value: field },
          start,
          end,
        });
      },
    );

    it.for([
      { age: { between: null } },
      { age: { between: [{}, () => {}] } },
      { age: { between: [true, () => {}] } },
      { age: { between: [undefined, undefined] } },
      { age: { between: [] } },
      { age: { between: [1] } },
      {
        date: { between: [new Date('1999-01-01'), new Date('2020-01-01')] },
      },
      {
        between: [{ not: { result: { equals: 'fail' } } }, 1],
      },
      {
        date: { between: [3, [1, 2, 3, 4]] },
      },
    ])(
      'should throw InvalidExpression when between expression is %s',
      (expression) => {
        expect(() => FilterParser.parse(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );
  });
});
