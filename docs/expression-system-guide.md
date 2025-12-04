# Expression System Guide

A comprehensive guide to the expression system in Flow Creator, covering workflow data, step references, catalog entries, entity lookups, and summary fields.

---

## Table of Contents

1. [Overview](#overview)
2. [Expression Syntax](#expression-syntax)
3. [Expression Types](#expression-types)
   - [Workflow Data](#1-workflow-data-workflow)
   - [Step References](#2-step-references-steps)
   - [Catalog Entries](#3-catalog-entries-catalog)
   - [Entity Lookups](#4-entity-lookups-entity)
4. [Summary Fields](#summary-fields)
5. [UI Components](#ui-components)
   - [Expression Input](#1-expression-input)
   - [Expression Builder](#2-expression-builder)
   - [Expression Helper](#3-expression-helper)
6. [Validation](#validation)
7. [Entity Integration](#entity-integration)
   - [Base Entity Contract](#base-entity-contract)
   - [Entity Search UI](#entity-search-ui)
   - [Entity Type Validation](#entity-type-validation)
8. [Data Sources](#data-sources)
9. [API Integration](#api-integration)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)

---

## Overview

The expression system allows dynamic data binding in workflow templates. Expressions are wrapped in double curly braces `{{ }}` and resolve at runtime to actual values from workflow context, previous steps, catalogs, or entities.

### Supported Prefixes

| Prefix      | Description               | Example                                  |
| ----------- | ------------------------- | ---------------------------------------- |
| `$workflow` | Workflow metadata         | `{{$workflow.initiator}}`                |
| `$steps`    | Step data and form inputs | `{{$steps.step_0.output.formData.name}}` |
| `$catalog`  | Catalog entries           | `{{$catalog.Countries[DE].label}}`       |
| `$entity`   | Entity instances          | `{{$entity.employee.{id}.displayName}}`  |

---

## Expression Syntax

### Basic Format

```
{{$prefix.path.to.value}}
```

### Rules

1. Expressions must be wrapped in `{{ }}`
2. Must start with a valid prefix (`$workflow`, `$steps`, `$catalog`, `$entity`)
3. Brackets must be balanced
4. Dynamic IDs use nested expressions: `{{$entity.employee.{{$steps.step_0.output.id}}.name}}`

### Examples

```javascript
// Simple field access
{{$workflow.initiator}}

// Nested path
{{$steps.step_0.output.formData.employeeName}}

// Dynamic lookup
{{$catalog.assets[{{$steps.step_0.output.formData.assetId}}].location}}

// Entity with dynamic ID
{{$entity.employee.{{$workflow.initiator}}.email}}
```

---

## Expression Types

### 1. Workflow Data (`$workflow`)

Access workflow-level metadata and input parameters.

**Available Fields:**

| Path                        | Description               | Example Value          |
| --------------------------- | ------------------------- | ---------------------- |
| `$workflow.initiator`       | User who started workflow | `user-123`             |
| `$workflow.input.fieldName` | Workflow input field      | `"Request Title"`      |
| `$workflow.id`              | Workflow instance ID      | `wf-456`               |
| `$workflow.startTime`       | When workflow started     | `2024-01-15T10:30:00Z` |

**Examples:**

```javascript
// Get who started the workflow
{{$workflow.initiator}}

// Get workflow input parameter
{{$workflow.input.requestTitle}}

// Use initiator for entity lookup
{{$entity.employee.{{$workflow.initiator}}.email}}
```

---

### 2. Step References (`$steps`)

Access data from previous workflow steps.

**Path Structure:**

```
$steps.<stepName>.output.<property>
```

**Available Properties:**

| Property                  | Description             |
| ------------------------- | ----------------------- |
| `output.formData.<field>` | Form field values       |
| `output.executedBy`       | Who completed the step  |
| `output.timestamp`        | When step was completed |
| `output.assignees`        | Who was assigned        |

**Examples:**

```javascript
// Get form field from Step 0
{{$steps.step_0.output.formData.employeeName}}

// Get who completed a step
{{$steps.step_1.output.executedBy}}

// Get completion time
{{$steps.step_2.output.timestamp}}

// Chain multiple step references
Employee: {{$steps.step_0.output.formData.name}}
Approved by: {{$steps.step_1.output.executedBy}}
```

**Forward Reference Warning:**

Referencing future steps (e.g., Step 3 from Step 0) triggers a validation warning because the data won't exist until that step completes.

---

### 3. Catalog Entries (`$catalog`)

Access catalog data for dynamic lookups.

**Path Structure:**

```
$catalog.<catalogIdentifier>[<entryId>].<property>
```

**Available Properties:**

| Property         | Description            |
| ---------------- | ---------------------- |
| `value`          | Entry value/code       |
| `label`          | Display label          |
| `description`    | Entry description      |
| `metadata.<key>` | Custom metadata fields |

**Examples:**

```javascript
// Get catalog entry by ID
{{$catalog.Countries[DE].label}}
// → "Germany"

// Get entry by code
{{$catalog.departments[HR].value}}
// → "HR"

// Dynamic lookup from form field
{{$catalog.assets[{{$steps.step_0.output.formData.assetId}}].name}}

// Access metadata
{{$catalog.equipment[LAPTOP-001].metadata.warrantyExpiry}}
```

**Catalog Data Sources in Forms:**

SELECT and MULTISELECT inputs can use catalogs as dynamic data sources:

```json
{
  "type": "SELECT",
  "name": "country",
  "label": "Country",
  "dataSource": {
    "type": "CATALOG",
    "catalog": "Countries",
    "valueField": "value",
    "labelField": "label"
  }
}
```

---

### 4. Entity Lookups (`$entity`)

Access entity instances from the system.

**Path Structure:**

```
$entity.<entityType>.<entityId>.<fieldName>
```

**Components:**

- `entityType` - Type of entity (e.g., `employee`, `costCenter`)
- `entityId` - Entity identifier (UUID or code)
- `fieldName` - Field to access (optional, defaults to `displayName`)

**Available Entity Types:**

| Type          | Description         | Example Fields                                  |
| ------------- | ------------------- | ----------------------------------------------- |
| `employee`    | Employee records    | `displayName`, `email`, `firstName`, `lastName` |
| `costCenter`  | Cost centers        | `name`, `code`, `description`                   |
| `lead`        | CRM leads           | `firstName`, `lastName`, `email`, `company`     |
| `account`     | CRM accounts        | `name`, `industry`, `website`                   |
| `contact`     | CRM contacts        | `firstName`, `lastName`, `email`, `phone`       |
| `opportunity` | Sales opportunities | `name`, `stage`, `amount`                       |

**Examples:**

```javascript
// Get employee display name
{{$entity.employee.cc094269-108b-4c31-a868-95a5e7f77b1c.displayName}}
// → "John Smith"

// Get employee email
{{$entity.employee.cc094269-108b-4c31-a868-95a5e7f77b1c.email}}
// → "john.smith@example.com"

// No field specified - returns displayName
{{$entity.employee.cc094269-108b-4c31-a868-95a5e7f77b1c}}
// → "John Smith"

// Dynamic ID from workflow initiator
{{$entity.employee.{{$workflow.initiator}}.email}}

// Dynamic ID from previous step
{{$entity.costCenter.{{$steps.step_0.output.formData.costCenterId}}.name}}
```

**Default Field Behavior:**

When no field is specified, the resolver returns:

1. `displayName` (if available)
2. `code` (if displayName is null)
3. `id` (as last fallback)

**Entity Data Sources in Forms:**

SELECT and MULTISELECT inputs can use entities as dynamic data sources:

```json
{
  "type": "SELECT",
  "name": "costCenter",
  "label": "Cost Center",
  "dataSource": {
    "type": "ENTITY",
    "entity": "costCenter",
    "valueField": "id",
    "labelField": "displayName"
  }
}
```

---

## Summary Fields

Summary fields display key workflow data in the summary view after completion.

### Configuration

Summary fields are configured in **Step 0** only, via the **Summary** tab.

**Structure:**

```json
{
  "summaryFields": [
    {
      "label": "Employee Name",
      "value": "{{$steps.step_0.output.formData.employeeName}}",
      "visibility": "PUBLIC",
      "type": "text"
    },
    {
      "label": "Equipment Assigned",
      "value": "{{$steps.step_3.output.formData.serialNumber}}",
      "visibility": "WORKFLOW_PARTICIPANTS",
      "type": "text"
    },
    {
      "label": "Total Cost",
      "value": "{{$steps.step_2.output.formData.totalAmount}}",
      "visibility": "INITIATOR_ONLY",
      "type": "currency",
      "format": "EUR"
    }
  ]
}
```

### Visibility Options

| Value                   | Description                  | Who Can See                           |
| ----------------------- | ---------------------------- | ------------------------------------- |
| `PUBLIC`                | Visible to everyone          | All users                             |
| `WORKFLOW_PARTICIPANTS` | Visible to participants      | Anyone involved in workflow           |
| `STEP_PARTICIPANTS`     | Visible to step participants | Only those assigned to specific steps |
| `INITIATOR_ONLY`        | Private to initiator         | Only the person who started           |

### Data Types

| Type       | Description     | Example      |
| ---------- | --------------- | ------------ |
| `text`     | Plain text      | "John Smith" |
| `date`     | Date value      | "2024-01-15" |
| `number`   | Numeric value   | 42           |
| `currency` | Monetary amount | "$1,234.56"  |

### Forward Reference Warnings

If a summary field references a future step (e.g., Step 3 from Step 0), a warning is displayed because the data won't exist until that step completes.

---

## UI Components

### 1. Expression Input

Smart input field with expression support.

**Features:**

- Toggle between plain text and expression mode
- Syntax highlighting (purple background for expressions)
- Real-time validation with visual feedback
- Expression helper integration

**Validation States:**

| Badge | Color  | Meaning                           |
| ----- | ------ | --------------------------------- |
| ✓     | Green  | Expression is valid               |
| ✗     | Red    | Syntax error (hover for details)  |
| ⚠️    | Yellow | Warning (e.g., forward reference) |
| ⌛    | Gray   | Validation in progress            |

**Usage:**

```tsx
<ExpressionInput
  value={field.value}
  onChange={val => updateField({ value: val })}
  template={template}
  stepIndex={currentStepIndex}
  validateOnChange={true}
  useTreeBuilder={true}
  context={businessAppContext}
/>
```

---

### 2. Expression Builder

Visual tree-based expression builder with data navigation.

**Features:**

- Tree navigator showing all data sources
- Browse workflow data, steps, catalogs, entities
- Search and filter entities
- Click-to-insert expressions
- Real-time expression preview
- Expression testing with sample data

**Data Navigator Structure:**

```
🌳 Expression Tree
├─ 💼 Workflow
│  ├─ initiator
│  └─ input
├─ 📊 Steps
│  ├─ Step 0: Submit Request
│  │  └─ formData
│  └─ Step 1: Manager Approval
│     └─ formData
├─ 📁 Catalogs
│  ├─ Countries
│  ├─ Departments
│  └─ Equipment
└─ 🔗 Entities
   ├─ 👤 Employee
   │  └─ 🔍 Browse employee
   ├─ 🏢 Cost Center
   │  └─ 🔍 Browse costCenter
   └─ 📧 Contact
      └─ 🔍 Browse contact
```

**Entity Browsing:**

Click on "Browse [entity]" to search and select entity instances:

```
🔍 Browse employee
  ┌─────────────────────────────────────────────────────┐
  │ 🔍 [Search employee...          ] [Search] [Cancel] │
  │ Press Enter to search, Escape to cancel             │
  └─────────────────────────────────────────────────────┘
```

Search results display entities with their fields:

```
📦 John Smith [EMP-001]
  ├─ 📋 firstName: John
  ├─ 📋 lastName: Smith
  ├─ 📋 email: john.smith@example.com
  └─ 📋 code: EMP-001
```

---

### 3. Expression Helper

Slide-out panel with expression documentation.

**Features:**

- Categorized expressions (Workflow, Steps, Catalogs, Entities)
- Search/filter functionality
- One-click insert into active field
- Context-aware (only shows previous steps)

**Categories:**

| Category | Contents                                   |
| -------- | ------------------------------------------ |
| Workflow | `$workflow.initiator`, `$workflow.input.*` |
| Steps    | Previous steps with their form fields      |
| Catalogs | Available catalog identifiers              |
| Entities | Available entity types                     |

---

## Validation

### Frontend Validation

**Location:** `hooks/useExpressionValidator.ts`

**Checks:**

1. Balanced braces `{{ }}`
2. Valid prefix (`$workflow`, `$steps`, `$catalog`, `$entity`)
3. Non-empty expressions
4. Step reference existence
5. **Entity type validation** - verifies entity type exists in registered schemas

**Entity Type Validation:**

```typescript
// ✅ Valid - entity type exists
{{$entity.costCenter.{id}.name}}

// ❌ Invalid - "costCenters" doesn't exist (typo)
{{$entity.costCenters.{id}.name}}
// Error: Invalid entity type: "costCenters". Available entities: Employee, Cost Center
```

### Backend Validation

**Endpoint:** `POST /api/templates/validate-expressions`

**Request:**

```json
{
  "template": {
    "name": "My Template",
    "steps": [...]
  },
  "expressions": ["{{$entity.employee.123.name}}"],
  "currentStepIndex": 0
}
```

**Response:**

```json
{
  "isValid": true,
  "results": [
    {
      "isValid": true,
      "expression": "{{$entity.employee.123.name}}"
    }
  ],
  "errors": [],
  "warnings": []
}
```

---

## Entity Integration

### Base Entity Contract

All entities returned from the API conform to the BaseEntity contract:

```typescript
interface BaseEntity {
  id: string // Required: Unique identifier (UUID)
  code: string // Required: Business code
  displayName: string // Required: Human-readable name
  type: string // Required: Entity type
  description?: string // Optional
  createdAt?: string // Optional
  updatedAt?: string // Optional
  [key: string]: any // Entity-specific fields
}
```

**Helper Functions:**

| Function                        | Description             | Example Output                                  |
| ------------------------------- | ----------------------- | ----------------------------------------------- |
| `getEntityDisplayLabel(entity)` | Formatted display label | `"John Smith [EMP-001]"`                        |
| `getEntityShortLabel(entity)`   | Short label             | `"John Smith"`                                  |
| `getEntityDescription(entity)`  | Full description        | `"Type: employee \| Code: EMP-001 \| ID: uuid"` |
| `isBaseEntity(obj)`             | Type guard              | `true` / `false`                                |

### Entity Search UI

The Expression Builder provides inline entity search:

1. Click "Browse [entity]" in the tree navigator
2. Search input appears inline with purple styling
3. Enter search term, press **Enter** to search
4. Press **Escape** to cancel
5. Click entity to expand and see fields
6. Click field to insert expression

**Keyboard Shortcuts:**

| Key        | Action                    |
| ---------- | ------------------------- |
| **Enter**  | Execute search            |
| **Escape** | Cancel search             |
| **Tab**    | Navigate between controls |

### Entity Type Validation

Entity types are validated against registered schemas:

```javascript
// ✅ Valid entity types
{{$entity.employee.{id}.name}}      // "employee" exists
{{$entity.costCenter.{id}.name}}    // "costCenter" exists

// ❌ Invalid entity types
{{$entity.costCenters.{id}.name}}   // "costCenters" doesn't exist (plural)
{{$entity.employees.{id}.name}}     // "employees" doesn't exist (plural)
```

**Error Message:**

```
Invalid entity type: "costCenters". Available entities: Employee, Cost Center
```

**Note:** Entity types are case-insensitive (`costCenter` = `CostCenter` = `COSTCENTER`).

---

## Data Sources

### Catalog Data Source

For SELECT/MULTISELECT inputs with catalog options:

```json
{
  "type": "SELECT",
  "name": "country",
  "dataSource": {
    "type": "CATALOG",
    "catalog": "Countries",
    "valueField": "value",
    "labelField": "label"
  }
}
```

**Advanced Settings:**

- `valueField` - Field to use for option value (default: `value`)
- `labelField` - Field to use for option label (default: `label`)
- `version` - Catalog version (default: `v1`)

### Entity Data Source

For SELECT/MULTISELECT inputs with entity options:

```json
{
  "type": "SELECT",
  "name": "costCenter",
  "dataSource": {
    "type": "ENTITY",
    "entity": "costCenter",
    "valueField": "id",
    "labelField": "displayName"
  }
}
```

**Validation:**

- `entity` - Required: Entity type must exist
- `valueField` - Required: Field for option value
- `labelField` - Required: Field for option label

**Field Existence Warning:**

If specified fields don't exist on the entity, a warning is displayed with available fields.

---

## API Integration

### Entity Schemas

**Endpoint:** `GET /api/entities?includeFields=true`

Returns all entity types with their schemas.

### Entity Browsing

**Endpoint:** `GET /api/datasource/:entityType?search=&limit=&offset=`

Returns entity instances for browsing.

**Response:**

```json
{
  "entities": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "code": "EMP-001",
      "displayName": "John Smith",
      "type": "employee",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@example.com"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true,
    "entity": "employee",
    "conformsToBaseEntity": true
  }
}
```

### Expression Validation

**Endpoint:** `POST /api/templates/validate-expressions`

Validates expressions against template context.

### Expression Resolution

**Endpoint:** `POST /api/expressions/resolve`

Resolves expressions at runtime with actual values.

---

## Error Handling

### Validation Errors

| Error                          | Cause                     | Solution                                            |
| ------------------------------ | ------------------------- | --------------------------------------------------- |
| `Unbalanced expression braces` | Missing `{{` or `}}`      | Check brace pairing                                 |
| `Invalid expression prefix`    | Unknown prefix            | Use `$workflow`, `$steps`, `$catalog`, or `$entity` |
| `Incomplete expression`        | Just prefix without path  | Add field path after prefix                         |
| `Invalid entity type: "X"`     | Entity type doesn't exist | Check spelling, use singular form                   |
| `Forward reference detected`   | Referencing future step   | Consider if data will exist                         |

### Runtime Errors

| Error                     | Cause                         | Solution                    |
| ------------------------- | ----------------------------- | --------------------------- |
| `Entity not found`        | Entity ID doesn't exist       | Verify entity ID            |
| `Field not found`         | Field doesn't exist on entity | Check field name            |
| `Catalog entry not found` | Catalog entry doesn't exist   | Verify catalog and entry ID |
| `Step data not available` | Step not yet completed        | Check workflow state        |

### Graceful Degradation

- Invalid entities are filtered out, valid ones continue to display
- If field doesn't exist, system falls back to `displayName` → `code` → `id`
- Console warnings help debugging without breaking UI

---

## Best Practices

### 1. Use Entity Display Names

```javascript
// ✅ Good - uses displayName
{{$entity.employee.{id}.displayName}}

// ⚠️ Works but less readable - just returns displayName
{{$entity.employee.{id}}}

// ❌ Avoid - raw ID is not user-friendly
{{$entity.employee.{id}.id}}
```

### 2. Use Dynamic IDs

```javascript
// ✅ Good - dynamic ID from form
{{$entity.employee.{{$steps.step_0.output.formData.employeeId}}.email}}

// ⚠️ Avoid - hardcoded ID
{{$entity.employee.cc094269-108b-4c31-a868-95a5e7f77b1c.email}}
```

### 3. Check for Forward References

Summary fields referencing future steps will show warnings. Consider:

- Is the data essential to the summary?
- Will it always be available?
- Should it have a fallback value?

### 4. Use Correct Entity Type Names

```javascript
// ✅ Correct - singular form
{{$entity.employee.{id}.name}}
{{$entity.costCenter.{id}.name}}

// ❌ Wrong - plural form
{{$entity.employees.{id}.name}}
{{$entity.costCenters.{id}.name}}
```

### 5. Leverage Expression Builder

Use the visual Expression Builder to:

- Browse available data sources
- Search entities by name
- Preview entity fields
- Insert expressions with correct syntax

---

## File Structure

```
gravity-business-apps/
├── src/business-apps/flow/apps/creator/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── ExpressionInput.tsx
│   │   │   ├── ExpressionBuilder.tsx
│   │   │   ├── ExpressionHelper.tsx
│   │   │   ├── TreeNavigator.tsx
│   │   │   └── TreeNode.tsx
│   │   └── steps/
│   │       ├── SummaryFieldsConfiguration.tsx
│   │       ├── InputFieldsConfiguration.tsx
│   │       └── EntityPreview.tsx
│   ├── hooks/
│   │   ├── useExpressionValidator.ts
│   │   ├── useExpressionTesting.ts
│   │   ├── useEntitySchemas.ts
│   │   └── useDatasource.ts
│   ├── types/
│   │   ├── flowTemplate.ts
│   │   └── baseEntity.ts
│   └── utils/
│       ├── expressionTreeBuilder.ts
│       └── entityTreeBuilder.ts
└── docs/
    └── expression-system-guide.md

custom-flow-engine/
├── src/services/
│   ├── expression/
│   │   ├── expressionResolverService.ts
│   │   └── expressionValidationService.ts
│   ├── dataSource/
│   │   └── dataSourceResolverService.ts
│   └── entity/
│       ├── entitySchemas.ts
│       ├── entityServiceRegistry.ts
│       └── [entity]EntityService.ts
```

---

## Quick Reference Card

### Expression Syntax

```javascript
{
  {
    $workflow.initiator
  }
} // Workflow initiator
{
  {
    $workflow.input.fieldName
  }
} // Workflow input
{
  {
    $steps.step_0.output.formData.field
  }
} // Step form field
{
  {
    $steps.step_0.output.executedBy
  }
} // Who completed step
{
  {
    $catalog.CatalogName[entryId].label
  }
} // Catalog entry
{
  {
    $entity.entityType.entityId.fieldName
  }
} // Entity field
```

### Entity Types (Common)

| Type         | Example Expression                      |
| ------------ | --------------------------------------- |
| `employee`   | `{{$entity.employee.{id}.displayName}}` |
| `costCenter` | `{{$entity.costCenter.{id}.name}}`      |
| `lead`       | `{{$entity.lead.{id}.email}}`           |
| `account`    | `{{$entity.account.{id}.name}}`         |
| `contact`    | `{{$entity.contact.{id}.phone}}`        |

### Validation States

| Symbol | Meaning                           |
| ------ | --------------------------------- |
| ✅     | Valid expression                  |
| ❌     | Invalid expression                |
| ⚠️     | Warning (e.g., forward reference) |
| ⌛     | Validating...                     |

---

**Last Updated:** December 2024
**Status:** Production Ready
