import { CursorSort } from '@criteria-ts/core';
import { buildField } from './build-field.helper.js';
import { AdapterOptions } from '../postgres-sql.adapter.js';

export function buildCursorStatements(
  cursor: readonly Readonly<[string, unknown, CursorSort]>[],
  valuesParams: unknown[],
  adapterOptions: AdapterOptions = {},
) {
  const orderByFields = [];

  const fieldsWithParams: [string, string, string][] = [];

  for (const [fieldName, value, sort] of cursor) {
    const fieldNameWithAlias = buildField(fieldName, adapterOptions);

    valuesParams.push(value);

    fieldsWithParams.push([
      fieldNameWithAlias,
      resolveOperator(sort),
      `$${valuesParams.length}`,
    ]);

    orderByFields.push(`${fieldNameWithAlias} ${sort}`);
  }

  const lastCombination: [string, string, string][] = [fieldsWithParams[0]];

  const output: string[] = [fieldsWithParams[0].join(' ')];

  for (const currentField of fieldsWithParams.slice(1)) {
    const lastField = lastCombination[lastCombination.length - 1];

    lastField[1] = '=';

    lastCombination.push(currentField);

    output.push(`(${lastCombination.map((m) => m.join(' ')).join(' AND ')})`);
  }

  return { where: `(${output.join(' OR ')})`, orderByFields };
}

function resolveOperator(operator: CursorSort): '>' | '<' {
  if (operator === 'ASC') {
    return '>';
  } else if (operator === 'DESC') {
    return '<';
  }
  throw new Error('Sort type is not supported');
}
