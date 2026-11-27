import filterParser from '../src/filter/filter-parser';
import { Expression } from '../src/filter/grammar';
import InvalidExpression from '../src/exceptions/invalid-expression';
import { describe, expect, it, test } from 'vitest';

describe('FilterParser', () => {
  describe('general expressions', () => {
    it('should parse valid logical and comparison expressions', () => {
      const parserResult = filterParser({
        and: [{ username: { diff: 'jazzz' } }, { age: { lte: '$parentAage' } }],
      });

      expect(parserResult).toMatchObject({
        kind: 'LogicalNode',
        operator: '&&',
        expressions: [
          {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'username' },
            operator: '!=',
            right: { kind: 'LiteralNode', value: 'jazzz' },
          },
          {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'age' },
            operator: '<=',
            right: { kind: 'FieldNode', value: 'parentAage' },
          },
        ],
      });
    });

    it('should throw InvalidExpression when input object contains an invalid key', () => {
      const badExpression = {
        wrongKey: [1, 2],
      };
      expect(() => filterParser(badExpression as any)).toThrow(
        InvalidExpression,
      );
    });
  });

  describe('Recursion depth', () => {
    test('should throw InvalidExpression when the input depth is exceded', () => {
      const expression: Expression = {
        and: [
          { some: { eq: 'some' } },
          {
            or: [
              { some: { eq: 'some' } },
              { and: [{ some: { eq: 'some' } }, { some: { eq: 'some' } }] },
            ],
          },
        ],
      }; // Depth recursion is 5

      expect(() =>
        filterParser(expression, { maxRecursionGrammarDepth: 3 }),
      ).toThrow(InvalidExpression);
      expect(() =>
        filterParser(expression, { maxRecursionGrammarDepth: 4 }),
      ).toThrow(InvalidExpression);
      expect(
        filterParser(expression, { maxRecursionGrammarDepth: 5 }),
      ).toMatchObject({ kind: 'LogicalNode' });
      expect(
        filterParser(expression, { maxRecursionGrammarDepth: 6 }),
      ).toMatchObject({ kind: 'LogicalNode' });
    });
  });

  describe('Literal expressions', () => {
    it.for([null, 123, true, false, "somebody's watching me"])(
      'should parse %s as a LiteralNode',
      (input) => {
        expect(filterParser(input)).toMatchObject({
          kind: 'LiteralNode',
          value: input,
        });
      },
    );
  });

  describe('Array expressions', () => {
    it('should parse a valid ArrayExpression', () => {
      expect(filterParser([1, 2, 3, 4, '5', '$nextNumber'])).toMatchObject({
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
      expect(filterParser([-1, true])).toMatchObject({
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
        expect(() => filterParser(expression as any)).toThrow(
          InvalidExpression,
        );
      },
    );
  });

  describe('logical expressions', () => {
    describe.for(['and', 'or'])(
      'shoul pass when "%s" is used and ',
      (operator) => {
        it.for([
          undefined,
          null,
          [null],
          [undefined],
          [],
          [{}],
          [{}, 1],
          {},
          { or: [true] },
          [false, false, 1, 3],
          [new Date(), { x: { equals: 1 } }],
          [false, false, 1, 3],
        ])(
          'should throw InvalidExpression when logical expression is %s',
          (input) => {
            expect(() => filterParser({ [operator]: input })).toThrow(
              InvalidExpression,
            );
          },
        );
      },
    );

    const expressionTest = [
      {
        expr: { role: { equals: 'admin' } },
        node: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'role' },
          operator: '==',
          right: { kind: 'LiteralNode', value: 'admin' },
        },
      },
      {
        expr: { points: { lt: 2 } },
        node: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'points' },
          operator: '<',
          right: { kind: 'LiteralNode', value: 2 },
        },
      },
      {
        expr: { age: { between: [1, 3] } },
        node: {
          kind: 'BetweenNode',
          value: { kind: 'FieldNode', value: 'age' },
          start: {
            kind: 'LiteralNode',
            value: 1,
          },
          end: {
            kind: 'LiteralNode',
            value: 3,
          },
        },
      },
    ];

    test.for(['and', 'or'])(
      'should pass when "%s" is used and ',
      (operator) => {
        const result = filterParser({
          [operator]: expressionTest.map((i) => i.expr),
        });
        expect(result).toMatchObject({
          kind: 'LogicalNode',
          operator: operator === 'and' ? '&&' : '||',
          expressions: expressionTest.map((i) => i.node),
        });
      },
    );

    test('should pass and parse in LogicalExpression (and) when input has multiple keys', () => {
      expect(
        filterParser({
          ...expressionTest[0].expr,
          ...expressionTest[1].expr,
          ...expressionTest[2].expr,
        } as any),
      ).toMatchObject({
        kind: 'LogicalNode',
        operator: '&&',
        expressions: expressionTest.map((i) => i.node),
      });
    });

    test('should pass and parse in LogicalExpression (and) when field has multiple operands', () => {
      const exp = {
        field: { eq: 1, lt: 2, gt: 3 },
      };
      expect(filterParser(exp)).toMatchObject({
        kind: 'LogicalNode',
        operator: '&&',
        expressions: [
          {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'field' },
            operator: '==',
            right: { kind: 'LiteralNode', value: 1 },
          },
          {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'field' },
            operator: '<',
            right: { kind: 'LiteralNode', value: 2 },
          },
          {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'field' },
            operator: '>',
            right: { kind: 'LiteralNode', value: 3 },
          },
        ],
      });
    });
  });

  describe('comparison expressions', () => {
    const mapComparisonOperator: Record<string, string> = {
      equals: '==',
      diff: '!=',
      eq: '==',
      ne: '!=',
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
    };

    describe.for(['eq', 'ne', 'equals', 'diff', 'gt', 'lt', 'lte', 'gte'])(
      'when using %s with an invalid operand',
      (operator) => {
        it.for([
          {},
          undefined,
          () => {},
          [undefined],
          [() => {}],
          new Date(),
          new Set(),
          new Map(),
          new Error(),
        ])('should throw InvalidExpression for %s', (input) => {
          expect(() =>
            filterParser({ field: { [operator]: input } } as any),
          ).toThrow(InvalidExpression);
        });
      },
    );

    const fieldAndLiteralToTest = [
      {
        input: -1,
        node: { kind: 'LiteralNode', value: -1 },
      },
      {
        input: 351,
        node: { kind: 'LiteralNode', value: 351 },
      },
      {
        input: 33.233333,
        node: { kind: 'LiteralNode', value: 33.233333 },
      },
      {
        input: Infinity,
        node: { kind: 'LiteralNode', value: Infinity },
      },
      {
        input: 'hello',
        node: { kind: 'LiteralNode', value: 'hello' },
      },
      {
        input: '$field',
        node: { kind: 'FieldNode', value: 'field' },
      },
    ];

    describe.concurrent.for(['lt', 'lte', 'gt', 'gte'])(
      'when using the ordering operator %s',
      (operator) => {
        it.for([null, [], [1, 2, 3], true, false])(
          'should throw InvalidExpression for %s',
          (input) => {
            expect(() =>
              filterParser({ field: { [operator]: input } } as any),
            ).toThrow(InvalidExpression);
          },
        );

        it.for(fieldAndLiteralToTest)(
          'should parse $input as a ComparisonNode',
          ({ input, node }) => {
            expect(
              filterParser({ field: { [operator]: input } } as any),
            ).toMatchObject({
              kind: 'ComparisonNode',
              left: { kind: 'FieldNode', value: 'field' },
              operator: mapComparisonOperator[operator],
              right: node,
            });
          },
        );
      },
    );

    describe.concurrent.for(['eq', 'equals', 'diff', 'ne'])(
      'when using the equality operator %s',
      (operator) => {
        it.for([
          ...fieldAndLiteralToTest,
          { input: [], node: { kind: 'ArrayNode', items: [] } },
          {
            input: [23],
            node: {
              kind: 'ArrayNode',
              items: [{ kind: 'LiteralNode', value: 23 }],
            },
          },
          { input: null, node: { kind: 'LiteralNode', value: null } },
          { input: true, node: { kind: 'LiteralNode', value: true } },
          { input: false, node: { kind: 'LiteralNode', value: false } },
        ])('should parse $input as a ComparisonNode', ({ input, node }) => {
          expect(
            filterParser({ field: { [operator]: input } } as any),
          ).toMatchObject({
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'field' },
            operator: mapComparisonOperator[operator],
            right: node,
          });
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
      new Map(),
      new Set(),
      new Error(),
    ])('should throw InvalidExpression when not wraps %s', (expression) => {
      expect(() => filterParser({ not: expression } as any)).toThrow(
        InvalidExpression,
      );
    });

    it.for([
      {
        expression: { status: { equals: 'inactive' } },
        node: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'status' },
          operator: '==',
          right: { kind: 'LiteralNode', value: 'inactive' },
        },
      },
      {
        expression: { status: { in: ['active', 'inactive'] } },
        node: {
          kind: 'InNode',
          value: { kind: 'FieldNode', value: 'status' },
          arrayExpression: {
            kind: 'ArrayNode',
            items: [
              { kind: 'LiteralNode', value: 'active' },
              { kind: 'LiteralNode', value: 'inactive' },
            ],
          },
        },
      },
      {
        expression: { not: { field: { equals: 'inactive' } } },
        node: {
          kind: 'NotNode',
          expression: {
            kind: 'ComparisonNode',
            left: { kind: 'FieldNode', value: 'field' },
            operator: '==',
            right: { kind: 'LiteralNode', value: 'inactive' },
          },
        },
      },
      {
        expression: { limit: { between: [0, 100] } },
        node: {
          kind: 'BetweenNode',
          value: { kind: 'FieldNode', value: 'limit' },
          start: { kind: 'LiteralNode', value: 0 },
          end: { kind: 'LiteralNode', value: 100 },
        },
      },
      {
        expression: { limit: { isNull: true } },
        node: {
          kind: 'IsNullNode',
          isNull: true,
          value: { kind: 'FieldNode', value: 'limit' },
        },
      },
      {
        expression: '$field',
        node: {
          kind: 'FieldNode',
          value: 'field',
        },
      },
      {
        expression: { and: ['$field1', '$field2'] },
        node: {
          kind: 'LogicalNode',
          operator: '&&',
          expressions: [
            {
              kind: 'FieldNode',
              value: 'field1',
            },
            {
              kind: 'FieldNode',
              value: 'field2',
            },
          ],
        },
      },
    ])(
      'should parse not wrapping $expression as a NotNode',
      ({ expression, node }) => {
        expect(filterParser({ not: expression } as any)).toMatchObject({
          kind: 'NotNode',
          expression: node,
        });
      },
    );
  });

  describe('in expressions', () => {
    describe.for(['in', 'nin'])(
      'when using %s with an invalid operand',
      (operator) => {
        it.for([
          1,
          0,
          -23,
          true,
          false,
          null,
          undefined,
          () => {},
          new Date(),
          new Set(),
          new Map(),
          [],
          [undefined],
          [() => {}, null],
          [1, [1, 2, 1, 1, {}]],
        ])('should throw InvalidExpression for %s', (input) => {
          expect(() =>
            filterParser({ field: { [operator]: input } } as any),
          ).toThrow(InvalidExpression);
        });
      },
    );

    const toTest = [
      {
        expression: [1, 2, 3, '$field'],
        node: {
          kind: 'ArrayNode',
          items: [
            { kind: 'LiteralNode', value: 1 },
            { kind: 'LiteralNode', value: 2 },
            { kind: 'LiteralNode', value: 3 },
            { kind: 'FieldNode', value: 'field' },
          ],
        },
      },
      {
        expression: ['dog', '$animal', ['$dog', ['duck']]],
        node: {
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
      },
    ];

    describe.for(toTest)(
      'when using the membership list $expression',
      ({ expression, node }) => {
        it('should parse in as an InNode', () => {
          const resultParse = filterParser({
            field: { in: expression },
          });
          expect(resultParse).toMatchObject({
            kind: 'InNode',
            arrayExpression: node,
          });
        });

        it('should parse nin as a NotNode wrapping an InNode', () => {
          const resultParse = filterParser({
            field: { nin: expression },
          });
          expect(resultParse).toMatchObject({
            kind: 'NotNode',
            expression: {
              kind: 'InNode',
              arrayExpression: node,
            },
          });
        });
      },
    );
  });

  describe('field identifier expressions', () => {
    it.for([
      {
        input: { field: { eq: '$_column1' } },
        expected: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'field' },
          right: { kind: 'FieldNode', value: '_column1' },
        },
      },
      {
        input: {
          _3st: { equals: '....' },
        },
        expected: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: '_3st' },
        },
      },
      {
        input: {
          user_23: { equals: '...' },
        },
        expected: {
          kind: 'ComparisonNode',
          left: { kind: 'FieldNode', value: 'user_23' },
        },
      },
      {
        input: '$username_02',
        expected: { kind: 'FieldNode', value: 'username_02' },
      },
      {
        input: '$_3st',
        expected: { kind: 'FieldNode', value: '_3st' },
      },
      {
        input: '$t3s_t',
        expected: { kind: 'FieldNode', value: 't3s_t' },
      },
      {
        input: '$username',
        expected: { kind: 'FieldNode', value: 'username' },
      },
      {
        input: '$field1.field2.field_3',
        expected: { kind: 'FieldNode', value: 'field1.field2.field_3' },
      },
    ])('should parse a valid field with $input', ({ input, expected }) => {
      const resultParse = filterParser(input as any);
      expect(resultParse).toMatchObject(expected);
    });

    it.for([
      '$',
      '$%4f_',
      '$%4f_e_t',
      '$34_test',
      '$@_l',
      '$s&?da34',
      '$field1.field2...',
      '$field1.field2.',
      '$field..',
      '$field1..field2',
      '$field1.field2..',
      { '"="" OR "': { eq: '....' } },
      { some: { eq: '$"="" OR "' } },
      { 'some1.some_2.': { eq: '....' } },
      { 'f1.f2..': { eq: '....' } },
      { 'f1..f2': { eq: '....' } },
      { 'some1.1some': { eq: '....' } },
      { 'some1.$23some': { eq: '....' } },
    ])(
      'should throw InvalidExpression when field identifier is %s',
      (expression) => {
        expect(() => filterParser(expression)).toThrow(InvalidExpression);
      },
    );
  });

  describe('IsNull expression', () => {
    it.for([true, false])(
      'should parse isNull with %s as an IsNullNode',
      (input) => {
        expect(filterParser({ fear: { isNull: input } } as any)).toMatchObject({
          kind: 'IsNullNode',
          value: {
            kind: 'FieldNode',
            value: 'fear',
          },
          isNull: input,
        });
      },
    );
    it('should parse a not expression wrapping an isNull expression', () => {
      expect(filterParser({ not: { email: { isNull: true } } })).toMatchObject({
        kind: 'NotNode',
        expression: {
          kind: 'IsNullNode',
          isNull: true,
          value: { kind: 'FieldNode', value: 'email' },
        },
      });
    });
    it.for([
      1,
      0,
      -43,
      'true',
      'false',
      () => {},
      null,
      undefined,
      [],
      new Date(),
      new Map(),
      new Set(),
      new Error(),
    ])(
      'should throw InvalidExpression when isNull receives %s',
      (expression) => {
        expect(() =>
          filterParser({ field: { isNull: expression } } as any),
        ).toThrow(InvalidExpression);
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
      'should parse $input as a BetweenNode',
      ({ input, field, start, end }) => {
        expect(filterParser(input as any)).toMatchObject({
          kind: 'BetweenNode',
          value: { kind: 'FieldNode', value: field },
          start,
          end,
        });
      },
    );

    it.for([
      null,
      undefined,
      [{}],
      [{}, {}],
      [undefined, undefined],
      [{}, () => {}],
      [true, () => {}],
      [undefined, undefined],
      [],
      [1],
      [new Date('1999-01-01'), new Date('2020-01-01')],
      [1, new Date('2020-01-01')],
      [3, [1, 2, 3, 4]],
      [3, 1, 2, 3, 4],
      new Date(),
      new Map(),
      new Set(),
      new Error(),
    ])(
      'should throw InvalidExpression when between receives %s',
      (expression) => {
        expect(() =>
          filterParser({ field: { between: expression } } as any),
        ).toThrow(InvalidExpression);
      },
    );
  });
});
