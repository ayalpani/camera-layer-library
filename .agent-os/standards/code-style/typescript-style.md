# TypeScript Style Guide

## Type Definitions
- Always provide explicit type annotations for function parameters and return types
- Use interfaces for object shapes, types for unions/intersections
- Prefer `interface` over `type` for object definitions
- Never use `any` - use `unknown` if type is truly unknown
- Use generics for reusable type-safe components

## Naming Conventions
- **Variables and Functions**: Use camelCase (e.g., `userProfile`, `calculateTotal`)
- **Classes and Interfaces**: Use PascalCase (e.g., `UserProfile`, `IPaymentProcessor`)
- **Type Aliases**: Use PascalCase (e.g., `UserRole`, `PaymentStatus`)
- **Enums**: Use PascalCase with UPPER_SNAKE_CASE members
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Private Properties**: Prefix with underscore (e.g., `_privateProperty`)

## Type Safety
- Enable strict mode in tsconfig.json
- Use `readonly` for immutable properties
- Leverage const assertions for literal types
- Use discriminated unions for complex state management
- Prefer `unknown` over `any` for unknown types

## Function Signatures
```typescript
// Good - explicit types
function processUser(user: User, options: ProcessOptions): Promise<Result> {
  // implementation
}

// Bad - implicit types
function processUser(user, options) {
  // implementation
}
```

## Interfaces and Types
```typescript
// Use interface for objects
interface User {
  id: string;
  name: string;
  email: string;
  readonly createdAt: Date;
}

// Use type for unions/intersections
type Status = 'pending' | 'active' | 'inactive';
type ExtendedUser = User & { role: UserRole };
```

## Enums
```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

// Prefer const enums when possible
const enum StatusCode {
  OK = 200,
  NOT_FOUND = 404,
  SERVER_ERROR = 500
}
```

## Generics
```typescript
// Use descriptive generic names
interface Repository<TEntity extends BaseEntity> {
  findById(id: string): Promise<TEntity | null>;
  save(entity: TEntity): Promise<TEntity>;
  delete(id: string): Promise<void>;
}

// Constrain generics when appropriate
function processArray<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}
```

## Null and Undefined
- Use strict null checks
- Prefer optional chaining (`?.`) and nullish coalescing (`??`)
- Use explicit `| null` or `| undefined` in types
```typescript
// Good
interface Config {
  apiUrl?: string;
  timeout: number | null;
}

const url = config.apiUrl ?? 'https://default.api.com';
const data = response?.data?.items ?? [];
```

## Type Guards
```typescript
// Use type predicates
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

// Use discriminated unions
type Response = 
  | { status: 'success'; data: User }
  | { status: 'error'; message: string };

function handleResponse(response: Response) {
  if (response.status === 'success') {
    // TypeScript knows response.data exists
    console.log(response.data);
  } else {
    // TypeScript knows response.message exists
    console.error(response.message);
  }
}
```

## Async/Await
- Always type Promise return values
- Use async/await over .then() chains
- Handle errors with try/catch
```typescript
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw new UserNotFoundError(`User ${id} not found`);
  }
}
```

## Module Imports
- Use named exports over default exports
- Group imports by external, internal, and type imports
- Use absolute imports with path aliases
```typescript
// External libraries
import { useState, useEffect } from 'react';
import { z } from 'zod';

// Internal modules
import { UserService } from '@/services/UserService';
import { formatDate } from '@/utils/date';

// Type imports
import type { User, UserRole } from '@/types/user';
```

## React Components (if using React)
```typescript
// Function components with explicit return type
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```

## Error Handling
```typescript
// Create custom error classes
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Use Result types for expected errors
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function parseConfig(input: string): Result<Config, ValidationError> {
  try {
    const config = JSON.parse(input) as Config;
    return { success: true, data: config };
  } catch (error) {
    return { 
      success: false, 
      error: new ValidationError('Invalid JSON', 'input', input)
    };
  }
}
```

## Best Practices
- Prefer immutability - use `readonly` and `const`
- Use utility types (Partial, Required, Pick, Omit, etc.)
- Leverage mapped types for transformations
- Use template literal types for string patterns
- Enable all strict compiler options
- Run type checking in CI/CD pipeline
- Document complex types with JSDoc comments