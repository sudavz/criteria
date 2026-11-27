import { Criteria } from '@criteria-ts/core';
import { buildCursorStatements } from './helper/build-cursor-statements.helper.js';
import { buildField } from './helper/build-field.helper.js';
import { PostgresSQLAstVisitor } from './postgres-sql-ast-visitor.js';

export type FieldMap = Record<string, { field?: string; alias?: string }>;

export interface AdapterOptions {
  defaultAlias?: string;
  fieldMap?: FieldMap;
}

export function postgresSqlAdapter(
  criteria: Criteria,
  options?: AdapterOptions,
) {
  const { filterExpression, limit, orderBy, pagination } =
    criteria.toObjectPlain();

  const valuesParams: unknown[] = [];

  const postgresSQLAstVisitor = new PostgresSQLAstVisitor(
    valuesParams,
    (field: string) => buildField(field, options),
  );

  const whereStatements: string[] = [];

  if (filterExpression) {
    whereStatements.push(`(${filterExpression.accept(postgresSQLAstVisitor)})`);
  }

  let orderByFields: string[] = orderBy.map(
    ([field, sort]) => `${buildField(field, options)} ${sort}`,
  );

  let offset: number | null = null;

  if (Number.isInteger(limit) && pagination) {
    if (pagination?.kind === 'Cursor' && pagination.cursor !== null) {
      const cursorStatements = buildCursorStatements(
        pagination.cursor,
        valuesParams,
        options,
      );
      orderByFields = cursorStatements.orderByFields;
      whereStatements.push(cursorStatements.where);
    } else if (Number.isInteger(pagination.page)) {
      offset = ((pagination.page as number) - 1) * (limit as number);
    }
  }

  const whereStatement = whereStatements.join(' AND ');
  const orderByFieldsStatment = orderByFields.join(', ');

  const fullSql: string = [
    whereStatements.length > 0 ? `WHERE ${whereStatement}` : '',
    orderByFields.length > 0 ? `ORDER BY ${orderByFieldsStatment}` : '',
    Number.isInteger(offset) ? `OFFSET ${offset}` : '',
    Number.isInteger(limit) ? `LIMIT ${limit}` : '',
  ]
    .join(' ')
    .trim();

  return {
    fullSql,
    sql: {
      where: whereStatement,
      orderBy: orderByFieldsStatment,
      offset,
      limit,
    },
    values: valuesParams,
  };
}
