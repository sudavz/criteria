import InvalidExpression from '../exceptions/invalid-expression.js';

const idExpressionRegex =
  /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

export function validateFieldExpression(field: string) {
  if (!idExpressionRegex.test(field)) {
    throw new InvalidExpression(
      `The field expression provided is invalid`,
      field,
    );
  }
}
