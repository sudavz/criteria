import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ast, Visitor } from '../src';
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
} from '../src/filter/node-builders';

describe('Visitor suit test', () => {
  const visitLiteralNode = vi.fn(
    (literalNode: Ast.LiteralNode) => literalNode.kind,
  );

  const visitFieldNode = vi.fn((fieldNode: Ast.FieldNode) => fieldNode.kind);

  const visitLogicalNode = vi.fn(
    (logicNode: Ast.LogicalNode) => logicNode.kind,
  );

  const visitComparisonNode = vi.fn(
    (comparisonNode: Ast.ComparisonNode) => comparisonNode.kind,
  );
  const visitArrayNode = vi.fn((arrayNode: Ast.ArrayNode) => arrayNode.kind);

  const visitNotNode = vi.fn((notNode: Ast.NotNode) => notNode.kind);

  const visitInNode = vi.fn((inNode: Ast.InNode) => inNode.kind);

  const visitIsNullNode = vi.fn(
    (isNullNode: Ast.IsNullNode) => isNullNode.kind,
  );

  const visitBetweenNode = vi.fn(
    (betweenNode: Ast.BetweenNode) => betweenNode.kind,
  );

  const visitorTest: Visitor<string> = {
    visitLiteralNode,
    visitFieldNode,
    visitLogicalNode,
    visitComparisonNode,
    visitArrayNode,
    visitNotNode,
    visitInNode,
    visitIsNullNode,
    visitBetweenNode,
  };

  beforeEach(() => {
    visitLiteralNode.mockClear();
    visitFieldNode.mockClear();
    visitLogicalNode.mockClear();
    visitComparisonNode.mockClear();
    visitArrayNode.mockClear();
    visitNotNode.mockClear();
    visitInNode.mockClear();
    visitIsNullNode.mockClear();
    visitBetweenNode.mockClear();
  });

  const input = [
    {
      node: buildLogicalNode(
        buildFieldNode('isValid'),
        '&&',
        buildFieldNode('status'),
      ),
      visitMethod: visitLogicalNode,
      description: 'AndNode',
    },
    {
      node: buildLiteralNode(1),
      visitMethod: visitLiteralNode,
      description: 'LiteralNode',
    },
    {
      node: buildFieldNode('username'),
      visitMethod: visitFieldNode,
      description: 'FieldNode',
    },
    {
      node: buildInNode(
        buildLiteralNode(1),
        buildArrayNode([
          buildLiteralNode(1),
          buildLiteralNode(2),
          buildLiteralNode(3),
          buildLiteralNode(4),
        ]),
      ),
      visitMethod: visitInNode,
      description: 'InNode',
    },
    {
      node: buildArrayNode([
        buildLiteralNode(1),
        buildLiteralNode(2),
        buildLiteralNode(3),
        buildLiteralNode(4),
      ]),
      visitMethod: visitArrayNode,
      description: 'ArrayNode',
    },
    {
      node: buildNotNode(
        buildComparisonNode(buildLiteralNode(1), '==', buildLiteralNode(2)),
      ),
      visitMethod: visitNotNode,
      description: 'NotNode',
    },
    {
      node: buildComparisonNode(buildLiteralNode(1), '<=', buildLiteralNode(2)),
      visitMethod: visitComparisonNode,
      description: 'ComparisonNode',
    },
    {
      node: buildIsNullNode(true, buildFieldNode('email')),
      visitMethod: visitIsNullNode,
      description: 'IsNullNode',
    },
    {
      node: buildBetweenNode(
        buildFieldNode('age'),
        buildLiteralNode(0),
        buildFieldNode('max_age'),
      ),
      visitMethod: visitBetweenNode,
      description: 'BetweenNode',
    },
  ];

  it.for(input)('should pass with $description', ({ node, visitMethod }) => {
    expect(node.accept(visitorTest)).toEqual(node.kind);
    expect(() => node.accept({} as any)).toThrow(TypeError);
    expect(visitMethod).toHaveBeenCalledOnce();
    expect(visitMethod).toHaveBeenCalledWith(node);
  });
});
