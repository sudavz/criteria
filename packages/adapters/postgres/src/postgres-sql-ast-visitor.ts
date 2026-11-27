import { Ast, Visitor } from '@criteria-ts/core';

const mapComparisonOperatorsToSql: Record<Ast.NodeComparisonOperator, string> =
  {
    '==': '=',
    '!=': '!=',
    '<=': '<=',
    '>=': '>=',
    '<': '<',
    '>': '>',
  };

const mapLogicOperatorsToSql: Record<Ast.NodeLogicalOperator, string> = {
  '&&': 'AND',
  '||': 'OR',
};

const validNodesInLogicStatment = new Set<string>([
  'LogicalNode',
  'ComparisonNode',
  'InNode',
  'NotNode',
  'FieldNode',
  'IsNullNode',
  'BetweenNode',
]);

const withoutWrap = new Set<string>([
  'LiteralNode',
  'FieldNode',
  'ArrayNode',
  'InNode',
  'ExistsNode',
  'NotNode',
  'ComparisonNode',
]);

export type ResolveField = (field: string) => string;

export class PostgresSQLAstVisitor implements Visitor<string> {
  constructor(
    readonly valuesParams: unknown[] = [],
    readonly resolveField?: ResolveField,
  ) {}

  visitBetweenNode(betweenNode: Ast.BetweenNode): string {
    const value = betweenNode.value.accept(this);
    const start = betweenNode.start.accept(this);
    const end = betweenNode.end.accept(this);
    return `${value} BETWEEN ${start} AND ${end}`;
  }

  visitIsNullNode(existsNode: Ast.IsNullNode): string {
    const isNull = existsNode.isNull;
    const field = existsNode.value.accept(this);
    return `${field} is ${isNull ? 'NULL' : 'NOT NULL'}`;
  }

  visitLiteralNode(literalNode: Ast.LiteralNode): string {
    this.valuesParams.push(literalNode.value);
    return `$${this.valuesParams.length}`;
  }

  visitNotNode(notNode: Ast.NotNode): string {
    const notStatment: string = notNode.expression.accept(this);
    return `NOT (${notStatment})`;
  }

  visitComparisonNode(comparisonNode: Ast.ComparisonNode): string {
    const leftStatment: string = comparisonNode.left.accept(this);
    const rightStatment: string = comparisonNode.right.accept(this);
    const statment = `${leftStatment} ${mapComparisonOperatorsToSql[comparisonNode.operator]} ${rightStatment}`;

    return withoutWrap.has(comparisonNode.left.kind) &&
      withoutWrap.has(comparisonNode.right.kind)
      ? statment
      : wrappStatment(statment);
  }

  visitLogicalNode(logicalNode: Ast.LogicalNode): string {
    const statments: string[] = [];
    for (const operand of logicalNode.expressions) {
      validateOperandInLogicExp(operand);
      const statment = operand.accept(this);
      const finalStatment =
        withoutWrap.has(operand.kind) ||
        (operand.kind === 'LogicalNode' &&
          operand.operator === logicalNode.operator)
          ? statment
          : wrappStatment(statment);
      statments.push(finalStatment);
    }

    return `${statments.join(` ${mapLogicOperatorsToSql[logicalNode.operator]} `)}`;
  }

  visitArrayNode(arrayNode: Ast.ArrayNode): string {
    const itemStatments: string[] = [];
    for (const itemExpression of arrayNode.items) {
      const itemStatment = itemExpression.accept(this);
      itemStatments.push(itemStatment);
    }
    return `(${itemStatments.join(', ')})`;
  }

  visitInNode(inNode: Ast.InNode): string {
    const valueStatment = inNode.value.accept(this);
    const arrayStatment = inNode.arrayExpression.accept(this);
    return `${valueStatment} IN ${arrayStatment}`;
  }

  visitFieldNode(fieldNode: Ast.FieldNode): string {
    return typeof this.resolveField === 'function'
      ? this.resolveField(fieldNode.value)
      : fieldNode.value;
  }
}

function wrappStatment(statment: string) {
  return `(${statment})`;
}

function validateOperandInLogicExp(expression: Ast.ExpressionNode) {
  if (!validNodesInLogicStatment.has(expression.kind)) {
    const validTypes = Array.from(validNodesInLogicStatment.values());
    throw new SyntaxError(
      `Invalid operand in LogicNode: expected (${validTypes.join(', ')}), received: ${expression.kind}`,
    );
  }
}
