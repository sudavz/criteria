export type LiteralExpression = number | boolean | null | string;

export type ValidValueTypes = LiteralExpression | ArrayExpression;

export type ArrayExpression = (LiteralExpression | ArrayExpression)[];

export type FieldExpression = `$${string}`;

type StringAndNumberValid<T> = T extends string | number
  ? T | FieldExpression
  : never;

export type ComparisonOperand<T> = Partial<{
  equals: T;
  diff: T;
  /**
   * Experimental alias to `equals` operator,
   * aligned with the MongoDB syntax.
   *
   * @remarks
   * This API is experimental: it may change or be removed without notice.
   * Its formal inclusion is being considered to align with the MongoDB syntax.
   * @experimental
   */
  eq: T;
  /**
   * Experimental alias to `diff` operator,
   * aligned with the MongoDB syntax.
   *
   * @remarks
   * This API is experimental: it may change or be removed without notice.
   * Its formal inclusion is being considered to align with the MongoDB syntax.
   * @experimental
   */
  ne: T;
  lte: StringAndNumberValid<T>;
  lt: StringAndNumberValid<T>;
  gte: StringAndNumberValid<T>;
  gt: StringAndNumberValid<T>;
}>;

export type ComparisonOperator = keyof ComparisonOperand<ValidValueTypes>;

export type InOperand = Partial<{
  /**
   * Experimental shorthand to negate an `in` expression,
   * aligned with the MongoDB syntax.
   *
   * @remarks
   * This API is experimental: it may change or be removed without notice.
   * Its formal inclusion is being considered to align with the MongoDB syntax.
   *
   * @example
   * ```ts
   * // with not/in
   * {
   *   not: {
   *     y: { in: [1, 2, 3, 4] },
   *   },
   * }
   *
   * // equivalent with nin
   * {
   *   y: { nin: [1, 2, 3, 4] },
   * }
   * ```
   *
   * @experimental
   */
  nin: ArrayExpression;
  in: ArrayExpression;
}>;

export interface IsNullOperand {
  isNull: boolean;
}

export interface BetweenOperand<T> {
  between: [T, T];
}

export type RightSideOperand<T> = Partial<
  InOperand & ComparisonOperand<T> & IsNullOperand & BetweenOperand<T>
>;

export type OperationFieldExpression<T> = Partial<{
  [K in keyof T]:
    | BetweenOperand<T[K] extends undefined ? LiteralExpression : T[K]>
    | ComparisonOperand<T extends object ? T[K] : ValidValueTypes>
    | IsNullOperand
    | InOperand;
}>;

export type ExpressionWithBooleanReturn<T> =
  OperationFieldExpression<T> | LogicalExpression<T> | NotExpression<T>;

export type LogicalExpression<T> = Partial<{
  and: ExpressionWithBooleanReturn<T>[];
  or: ExpressionWithBooleanReturn<T>[];
}>;

export type LogicalOperator = keyof LogicalExpression<ValidValueTypes>;

export interface NotExpression<T> {
  not: ExpressionWithBooleanReturn<T>;
}

export type DefaultExpressionType<T = string> = Record<
  T extends string ? T : keyof T,
  ValidValueTypes
>;

export type Expression<
  T extends DefaultExpressionType<T> = DefaultExpressionType,
> = ExpressionWithBooleanReturn<T> | LiteralExpression | ArrayExpression;
