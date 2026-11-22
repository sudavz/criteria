import InvalidExpression from '../exceptions/invalid-expression.js';
import * as Ast from './ast.js';
import {
  buildArrayNode,
  buildBetweenNode,
  buildComparisonNode,
  buildFieldNode,
  buildInNode,
  buildIsNullNode,
  buildLiteralNode,
  buildLogicalNode,
  buildNotNode,
} from './node-builders.js';
import * as Grammar from './grammar.js';

const mapComparisonOperator: Record<
  Grammar.ComparisonOperator,
  Ast.NodeComparisonOperator
> = {
  equals: '==',
  diff: '!=',
  eq: '==',
  ne: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
};

const mapLogicalOperator: Record<
  Grammar.LogicalOperator,
  Ast.NodeLogicalOperator
> = {
  and: '&&',
  or: '||',
};

const nodesWithBooleanReturn = new Set<string>([
  'LogicalNode',
  'ComparisonNode',
  'InNode',
  'NotNode',
  'FieldNode',
  'IsNullNode',
  'BetweenNode',
]);

const nodesValidInArrayNode = new Set<string>([
  'LiteralNode',
  'FieldNode',
  'ArrayNode',
]);

const literalTypesValids = new Set<string>(['string', 'number', 'boolean']);

export const fieldNameRegex =
  /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

export interface ParseOptions {
  maxRecursionGrammarDepth?: number;
}

const MAX_DEFAULT_GRAMMAR_DEPTH = 32;

export function parse<T extends Record<string, Grammar.ValidValueTypes>>(
  input: Grammar.Expression<T>,
  parseOptions: ParseOptions = {},
  recursionDepth = 1,
): Ast.ExpressionNode {
  if (
    recursionDepth >
    (parseOptions.maxRecursionGrammarDepth ?? MAX_DEFAULT_GRAMMAR_DEPTH)
  ) {
    throw new InvalidExpression(
      'The expression exceded max recursion depth',
      recursionDepth,
    );
  }
  // Field expressions
  if (typeof input === 'string' && input.charAt(0) === '$') {
    const field: string = input.slice(1);
    validateFieldName(field);
    return buildFieldNode(field);
  }

  // Literal expressions
  if (input === null || literalTypesValids.has(typeof input)) {
    return buildLiteralNode(input as Grammar.LiteralExpression);
  }

  // Array Expression
  if (Array.isArray(input)) {
    const items = [];

    for (const item of input) {
      const expression = parse(item, parseOptions, recursionDepth + 1);
      if (!nodesValidInArrayNode.has(expression.kind)) {
        throw new InvalidExpression(
          'The Array expression requires a LiteralExpression, ArrayExpression, or FieldExpression',
          input,
        );
      }
      items.push(expression);
    }
    return buildArrayNode(items as Ast.ArrayNode['items']);
  }

  if (typeof input != 'object') {
    throw new InvalidExpression('Invalid input', input);
  }

  const keys = Object.keys(input);

  if (keys.length === 0)
    throw new InvalidExpression(
      'Object is not valid; it must contain at least one key',
      input,
    );

  const rootNodes: Ast.ExpressionNode[] = [];

  for (const key of keys) {
    // Logic operators

    if (key === 'and' || key === 'or') {
      const expressionsInput = (input as Grammar.LogicalExpression<T>)[key];

      if (!Array.isArray(expressionsInput))
        throw new InvalidExpression(
          `The Logic expression must be an array of expressions.`,
          input,
        );

      if (expressionsInput.length <= 1) {
        throw new InvalidExpression(
          'The Logic expression must contain at least two arguments.',
          input,
        );
      }

      const expressions: Ast.ExpressionNode[] = [];

      for (const expressionInput of expressionsInput) {
        const expression = parse(
          expressionInput,
          parseOptions,
          recursionDepth + 1,
        );
        if (!nodesWithBooleanReturn.has(expression.kind)) {
          throw new InvalidExpression(
            'The LogicExpression requires valid expressions',
            input,
          );
        }
        expressions.push(expression);
      }

      rootNodes.push(buildLogicalNode(mapLogicalOperator[key], expressions));
      continue;
    }

    // Not expression

    if (key === 'not') {
      const expressionInput = (input as Grammar.NotExpression<T>)['not'];

      const expression = parse(
        expressionInput,
        parseOptions,
        recursionDepth + 1,
      );

      if (!nodesWithBooleanReturn.has(expression.kind)) {
        throw new InvalidExpression(
          `The NOT expression requires a valid expression`,
          input,
        );
      }

      rootNodes.push(buildNotNode(expression as Ast.NotNode['expression']));
      continue;
    }

    validateFieldName(key);

    const operation = (input as T)[
      key
    ] as Grammar.RightSideOperand<Grammar.LiteralExpression>;

    const keysOperation = Object.keys(operation ?? {});

    if (keysOperation.length !== 1) {
      throw new InvalidExpression('The field requires an operand', input);
    }

    const operator: string = keysOperation[0];

    // Comparison operators
    if (
      typeof mapComparisonOperator[operator as Grammar.ComparisonOperator] ===
      'string'
    ) {
      const expressionInput = operation[operator as Grammar.ComparisonOperator];

      if (expressionInput === undefined) {
        throw new InvalidExpression(
          'The value in Comparison expression is invalid',
          input,
        );
      }

      if (
        (operator === 'gt' ||
          operator === 'gte' ||
          operator === 'lt' ||
          operator === 'lte') &&
        typeof expressionInput !== 'number' &&
        typeof expressionInput !== 'string'
      ) {
        throw new InvalidExpression(
          'The Comparison expression with greater and less operators requires number or string values',
          input,
        );
      }
      rootNodes.push(
        buildComparisonNode(
          buildFieldNode(key),
          mapComparisonOperator[operator as Grammar.ComparisonOperator],
          parse(expressionInput, parseOptions, recursionDepth + 1),
        ),
      );
      continue;
    }

    // In expression
    if (operator === 'in' || operator === 'nin') {
      const arrayInput = operation[operator];

      if (!Array.isArray(arrayInput) || arrayInput.length === 0) {
        throw new InvalidExpression(
          'The Array expression in IN expression must contain at least one item',
          input,
        );
      }

      const arrayNode = parse(arrayInput, parseOptions, recursionDepth + 1);

      if (arrayNode.kind !== 'ArrayNode') {
        throw new InvalidExpression(
          'The IN expression must contain an array of literal or field expressions.',
          arrayNode,
        );
      }
      const inNode = buildInNode(buildFieldNode(key), arrayNode);

      rootNodes.push(operator === 'nin' ? buildNotNode(inNode) : inNode);
      continue;
    }

    // IsNull expression
    if (operator === 'isNull') {
      const isNullValue = operation[operator];

      if (typeof isNullValue !== 'boolean') {
        throw new InvalidExpression(
          'The IsNull expression must contain a boolean value',
          input,
        );
      }

      const field = buildFieldNode(key);

      rootNodes.push(buildIsNullNode(isNullValue, field));
      continue;
    }

    // Between expression
    if (operator === 'between') {
      const betweenValue = operation[operator];

      if (!Array.isArray(betweenValue) || betweenValue.length !== 2) {
        throw new InvalidExpression(
          'The between expression must contain a array with start and end values',
          input,
        );
      }

      const leftExpression = parse(
        betweenValue[0],
        parseOptions,
        recursionDepth + 1,
      );
      const rightExpression = parse(
        betweenValue[1],
        parseOptions,
        recursionDepth + 1,
      );

      if (
        (leftExpression.kind !== 'LiteralNode' &&
          leftExpression.kind !== 'FieldNode') ||
        (rightExpression.kind !== 'LiteralNode' &&
          rightExpression.kind !== 'FieldNode')
      ) {
        throw new InvalidExpression(
          'The left or right expression must be a LiteralExpression or FieldExpression',
        );
      }

      rootNodes.push(
        buildBetweenNode(buildFieldNode(key), leftExpression, rightExpression),
      );
      continue;
    }

    throw new InvalidExpression('The input expression is invalid', input);
  }

  return rootNodes.length === 1
    ? rootNodes[0]
    : buildLogicalNode('&&', rootNodes);
}

function validateFieldName(field: string) {
  if (!fieldNameRegex.test(field)) {
    throw new InvalidExpression(`The field name provided is invalid`, field);
  }
}
