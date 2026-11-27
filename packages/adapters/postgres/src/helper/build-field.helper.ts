import { fieldNameRegex } from '@criteria-ts/core';
import { AdapterOptions } from '../postgres-sql.adapter.js';

export function buildField(field: string, options: AdapterOptions = {}) {
  const { defaultAlias, fieldMap } = options;

  let alias = defaultAlias ?? '';
  let finalField = field;

  if (typeof fieldMap === 'object') {
    const fieldOptions = fieldMap[field];
    alias = fieldOptions?.alias ?? alias;
    finalField = fieldOptions?.field ?? finalField;
  }

  finalField = finalField.trim();
  alias = alias.trim();

  if (!fieldNameRegex.test(finalField)) {
    throw new Error('The field name is invalid');
  }

  return `${alias === '' ? `"${finalField}"` : `${alias}."${finalField}"`}`;
}
