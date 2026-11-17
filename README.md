# Criteria

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

`Criteria` is a TypeScript library that implements the Criteria pattern to specify, validate, and transport complex search, filtering, and pagination intent across application layers.

## Installation

```bash
npm install @criteria-ts/core
```

## Quick Start

```typescript
import { Criteria } from '@criteria-ts/core';

const criteria = Criteria.create({
  filter: {
    firstName: { equals: 'Alan' },
    lastName: { equals: 'Turing' },
  },
});
```

## Usage

### Filters

#### Operations

Operations are actions performed on a field or value, such as comparing values for equality, evaluating logical conditions, or checking whether an item belongs to a list.

#### Field Operators

**Basic syntax:**

```json
{
  "<field>": { "<operator>": "<field or value or expression>" }
}
```

> **Note:** To reference another field as a value, prefix the string with `$`, e.g., `"$username"`

You can combine multiple fields in the same filter object. They are joined with an implicit `and`, so all conditions must be true.

| Operator  |                                              Description                                              |
| :-------: | :---------------------------------------------------------------------------------------------------: |
| `between` |                             Checks if a value is within a specific range                              |
| `isNull`  |                                   Checks if a value is null or not                                    |
| `equals`  |                                  Checks that a value equals another                                   |
|  `diff`   |                              Checks that a value is not equal to another                              |
|   `eq`    |                Checks that a value equals another. **Experimental alias to** `equals`                 |
|   `ne`    |             Checks that a value is not equal to another. **Experimental alias to** `diff`             |
|   `gte`   |                        Checks that a value is greater than or equal to another                        |
|   `gt`    |                              Checks that a value is greater than another                              |
|   `lte`   |                         Checks that a value is less than or equal to another                          |
|   `lt`    |                               Checks that a value is less than another                                |
|   `in`    |                        Checks if a value is contained within a list of values                         |
|   `nin`   | Checks if a value is not contained within a list of values. **Experimental shorthand to negate** `in` |

**Examples:**

```typescript
{
  email: { equals: 'wtf@example.com' },
}
```

```typescript
{
  age: { gte: 18 },
}
```

```typescript
{
  pilotName: { in: ['leclerc', 'hammilton', 'alonso', 'perez'] },
}
```

```typescript
{
  trackId: { isNull: true },
}
```

```typescript
{
  score: { between: [1.3, 90] },
}
```

```typescript
{
  lapTime: { lt: '$personalBest' },
}
```

#### Logical Operators

| Operator |                  Description                  |
| :------: | :-------------------------------------------: |
|   and    |    Evaluates that all conditions are true     |
|    or    | Evaluates that at least one condition is true |
|   not    |             Negates an expression             |

**Examples:**

```typescript
{
  and: [
    { pilotName: { equals: 'alonso' } },
    { finishPosition: { lte: 3 } },
  ],
}
```

```typescript
{
  or: [
    { username: { in: ['daana', 'blasteer'] } },
    { role: { equals: 'maintainer' } },
  ],
}
```

```typescript
{
  not: {
    or: [
      { username: { equals: 'torlvals' } },
      { username: { equals: 'robCMartin' } },
    ],
  },
}
```

### Pagination

You can configure result pagination using either page-number or cursor-based strategies. Instantiate a `Pagination` object using the static factory methods `Pagination.byPage` or `Pagination.byCursor` depending on your strategy:

#### Using Page Number

```typescript
import { Criteria, Pagination } from '@criteria-ts/core';

const criteria = Criteria.create({
  filter: {
    programmingLanguage: { in: ['C', 'Lisp'] },
    age: { gte: 18 },
  },
  pagination: Pagination.byPage(3),
  orderBy: {
    age: 'ASC',
    id: 'DESC',
  },
  limit: 15,
});
```

> **Note:** If you specify pagination, you also need a page size (`limit`); otherwise, `Criteria` throws an exception. In your query adapter, use the page number and limit to calculate the offset (`OFFSET = (page - 1) * limit`), or use the cursor criteria to select the next results. Apply `limit` to control how many results each query returns.

#### Using Cursor

When using cursor-based pagination, `Pagination` relies on the `CursorPayload` type, which represents a list of field criteria with values and sort orders.

`Pagination` validates and stores your cursor criteria. To use them in a query, translate them into conditions and apply their sort order in your query adapter.

```typescript
import { Criteria, Pagination, type CursorPayload } from '@criteria-ts/core';

const cursor: CursorPayload = [
  ['isPinned', true, 'DESC'],
  ['publishedAt', '1989-02-25 11:56:26.472 -0500', 'DESC'],
  ['authorUsername', 'richstallman', 'ASC'],
  ['id', 32, 'DESC'],
];

const postsCriteria = Criteria.create({
  filter: {
    status: { equals: 'published' },
    topic: { in: ['programming', 'free-software'] },
    deletedAt: { isNull: true },
  },
  pagination: Pagination.byCursor(cursor),
  limit: 30,
});
```

> **Note:** If you serialize the cursor before exposing it to external layers, you must remember to deserialize it before constructing your Criteria object.

## Filter interpretation

Filter expressions are parsed into an Abstract Syntax Tree (AST) composed of strongly-typed nodes. Each node implements the double-dispatch `accept` method to support AST traversal, interpretation, and transformation into target query formats (such as SQL or query dialect generators).

The `Visitor<T>` interface defines visit methods for each AST node:

```typescript
export interface Visitor<T = void> {
  visitLiteralNode(literalNode: LiteralNode): T;
  visitNotNode(notNode: NotNode): T;
  visitComparisonNode(comparisonNode: ComparisonNode): T;
  visitLogicalNode(logicalNode: LogicalNode): T;
  visitArrayNode(arrayNode: ArrayNode): T;
  visitInNode(inNode: InNode): T;
  visitFieldNode(fieldNode: FieldNode): T;
  visitIsNullNode(isNullNode: IsNullNode): T;
  visitBetweenNode(betweenNode: BetweenNode): T;
}
```

> **Note:** All AST node interfaces extend the base `Node` interface and are available under the `Ast` namespace.

## Development

This library is currently under active development. If you encounter any bugs or areas for improvement, feel free to open an issue or submit a Pull Request.
