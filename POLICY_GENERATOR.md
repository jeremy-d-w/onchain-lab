# Tarobase Policy Parser and Generator

This document explains how our Tarobase policy parser and generator system works. This system allows you to provide a schema in JSON format and dynamically generate TypeScript code to enforce the rules defined in that schema.

## Architecture Overview

The system consists of several key components:

1. **SchemaParser**: Parses a JSON policy schema into a structured `DeploymentConfig` object
2. **ExpressionParser**: Parses rule expressions like `@user.address == @newData.createdBy`
3. **RuleEngine**: Compiles and evaluates rule expressions against a context
4. **PolicyGenerator**: Generates TypeScript code from the parsed schema

## How It Works

### 1. Schema Parsing

The `SchemaParser` takes a JSON policy schema and converts it to a structured object:

```typescript
// Input: JSON policy schema
const policySchema = {
  "user": { ... },
  "post/$postId": { ... },
  "access/$postId/$walletAddress": { ... },
  "functions": { ... }
};

// Output: Structured deployment config
const config = {
  entities: { ... },
  rules: { ... },
  hooks: { ... },
  functions: { ... }
};
```

This structured object contains:
- Entity definitions with fields and storage options
- Rule definitions for various operations (read, write, etc.)
- Hook definitions for operations like create, update, delete
- Custom function definitions for rule evaluation

### 2. Rule Parsing and Evaluation

The `ExpressionParser` and `RuleEngine` handle rule expressions:

```typescript
// Parse a rule expression into a syntax tree
const parsedRule = expressionParser.parse('@user.address == @newData.createdBy');

// Evaluate a rule against a context
const result = ruleEngine.checkPermission(
  '@user.address == @newData.createdBy',
  { user: { address: '0x123' }, newData: { createdBy: '0x123' } }
);
```

The rule parser handles:
- Reference paths with `@` prefix (e.g., `@user.address`)
- Comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`)
- Logical operators (`&&`, `||`)
- Function calls (e.g., `@hasAccess(@user.address, $postId)`)

### 3. Code Generation

The `PolicyGenerator` generates TypeScript code from the parsed schema:

```typescript
// Generate TypeScript code from deployment config
const generatedCode = policyGenerator.generatePolicyCode(config);

// Save generated code to a file
fs.writeFileSync('generated-policy.ts', generatedCode);
```

The generated code includes:
- The policy constant with rules, fields, hooks
- Helper functions for path resolution and policy lookup
- Authorization functions for checking user permissions
- API functions for data operations (get, set, remove)

## Key Features

1. **Dynamic Policy Parsing**: Processes user-provided policy schemas
2. **Rule Expression Evaluation**: Parses and evaluates complex rule expressions
3. **Code Generation**: Generates TypeScript code from the policy schema
4. **On-Chain vs Off-Chain Storage**: Automatically handles different storage strategies
5. **Entity-Aware Paths**: Supports wildcard paths like `post/$postId`

## Using the System

1. **Define your policy schema** in a JSON file (see example in `tarobase-policy.json`)
2. **Parse the schema** using the `SchemaParser`
3. **Generate code** using the `PolicyGenerator`
4. **Import and use** the generated policy code in your application

## Example Policy Schema

Here's a simplified version of a policy schema:

```json
{
  "user": {
    "rules": {
      "read": "true",
      "write": "@newData.walletAddress == @user.address"
    },
    "fields": { ... },
    "onchain": false
  },
  "post/$postId": {
    "rules": {
      "read": "true",
      "create": "@newData.createdBy == @user.address",
      "delete": "@resource.data.createdBy == @user.address"
    },
    "fields": { ... },
    "onchain": true,
    "hooks": { ... }
  }
}
```

## Demonstration

Check out the `demo.ts` file for a working example that:
1. Loads a policy schema from a file
2. Parses the schema
3. Generates TypeScript code
4. Tests rule evaluation

To run the demo:
```
npm run ts-node src/demo.ts
```

## Next Steps and Improvements

1. **Advanced Rule Parsing**: Support more complex rule expressions and functions
2. **Optimized Code Generation**: Generate more efficient and optimized code
3. **Type Safety**: Improve type checking for rule expressions
4. **Hook Integration**: Better support for custom hooks and actions
5. **Real-time Validation**: Validate schema integrity before code generation 