# PostgreSQL adapter

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

The PostgreSQL adapter converts a `Criteria` object into a SQL valid to postgres

## Install

```bash
npm install @criteria-ts/core @criteria-ts/postgres-adapter
```

## Quick Start

```typescript
import { Criteria } from '@criteria-ts/core';
import postgresSqlAdapter from '@criteria-ts/postgres-adapter';

type Book = {
  author: string;
  rate: number;
};

const criteria = Criteria.create<Book>({
  filter: {
    author: { eq: 'Ursula K. Le Guin' },
    rate: { gte: 4 },
    status: { in: ['published', 'active'] },
  },
  orderBy: { rate: 'DESC' },
  limit: 10,
});

const result = postgresSqlAdapter(criteria, { defaultAlias: 'b' });
```

The adapter output is:

```typescript
{
  fullSql: 'WHERE (b."author" = $1 AND b."rate" >= $2) ORDER BY b."rate" DESC  LIMIT 10',
  sql: {
    where: '(b."author" = $1 AND b."rate" >= $2)',
    orderBy: 'b."rate" DESC',
    offset: null,
    limit: 10
  },
  values: [ 'Ursula K. Le Guin', 4 ]
}
```
