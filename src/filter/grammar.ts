export type LiteralExpression = number | boolean | null | string;

type StringAndNumberValid<T> = T extends string | number
  ? T | FieldExpression
  : never;

export type ComparisonOperand<T> = Partial<{
  equals: T;
  diff: T;
  /**
   * @description experimental alias to **equals**
   */
  eq: T;
  /**
   * @description experimental alias to **diff**
   */
  ne: T;
  lte: StringAndNumberValid<T>;
  lt: StringAndNumberValid<T>;
  gte: StringAndNumberValid<T>;
  gt: StringAndNumberValid<T>;
}>;

export type ComparisonOperator = keyof ComparisonOperand<ValidValueTypes>;

export type FieldExpression = `$${string}`;

export type ComparisonExpression<T> = Partial<{
  [K in keyof T]: ComparisonOperand<T extends object ? T[K] : ValidValueTypes>;
}>;

export type ArrayExpression = (LiteralExpression | ArrayExpression)[];

export type InOperand = Partial<{
  in: ArrayExpression;
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
}>;

export type InExpression<T> = Partial<{
  [K in keyof T]: InOperand;
}>;

export type LogicalOperator = 'and' | 'or';

export type LogicalExpression<T> = Partial<
  Record<LogicalOperator, OperationExpression<T>[]>
>;

export interface NotExpression<T> {
  not: OperationExpression<T>;
}

export interface IsNullOperand {
  isNull: boolean;
}

export type IsNullExpression<T> = Partial<{
  [K in keyof T]: IsNullOperand;
}>;

export interface BetweenOperand<T> {
  between: [T, T];
}

export type BetweenExpression<T> = Partial<{
  [K in keyof T]: BetweenOperand<
    T[K] extends undefined ? LiteralExpression : T[K]
  >;
}>;

export type ValidValueTypes = LiteralExpression | ArrayExpression;

export type RightSideOperand<T> = Partial<
  InOperand & ComparisonOperand<T> & IsNullOperand & BetweenOperand<T>
>;

export type OperationExpression<T> =
  | LogicalExpression<T>
  | ComparisonExpression<T>
  | InExpression<T>
  | NotExpression<T>
  | IsNullExpression<T>
  | BetweenExpression<T>;

export type Expression<
  T extends Record<string, ValidValueTypes> = Record<string, ValidValueTypes>,
> = OperationExpression<T> | ValidValueTypes;
