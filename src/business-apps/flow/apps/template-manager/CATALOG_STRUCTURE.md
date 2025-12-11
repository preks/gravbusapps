# FlowEngineInstances Catalog Structure

This document describes the exact structure of catalog entries in the `FlowEngineInstances` catalog.

## Catalog Entry Structure

### Entry-Level Fields (Standard Catalog Fields)

| Field            | Type      | Usage                        | Example                              |
| ---------------- | --------- | ---------------------------- | ------------------------------------ |
| **id**           | String    | Unique identifier            | `FlowEngineInstances:v1:STAGING`     |
| **code**         | String    | Instance code (used as name) | `STAGING`, `PROD`, `DEV`             |
| **description**  | String    | Human-readable description   | `Pre-production testing environment` |
| **displayOrder** | Integer   | Sort order in UI             | `1`, `2`, `3`                        |
| **objectValue**  | JSON      | Metadata (see below)         | `{ baseUrl, apiKey, ... }`           |
| **activeFrom**   | Timestamp | Optional activation date     | `null` or timestamp                  |
| **activeTo**     | Timestamp | Optional deactivation date   | `null` or timestamp                  |

**Note**: `additionalValue1`, `additionalValue2`, `additionalValue3` are **NOT USED** in this catalog.

---

### Metadata Fields (objectValue)

The `objectValue` field contains a JSON object with the following structure:

```typescript
interface FlowEngineInstanceMetadata {
  baseUrl: string // REQUIRED: Flow engine API URL
  apiKey: string // REQUIRED: API key for authentication
  environment: string // REQUIRED: Environment type (DEV/STAGING/PROD)
  color: string // REQUIRED: Hex color for UI display
  icon: string // REQUIRED: Emoji icon for UI display
  order: number // OPTIONAL: Secondary sort order (use displayOrder instead)
}
```

---

## Complete Example Entry

### Staging Environment

```json
{
  "id": "FlowEngineInstances:v1:STAGING",
  "code": "STAGING",
  "description": "Demo staging tenant",
  "displayOrder": 2,
  "objectValue": {
    "baseUrl": "https://demo.newwork.com/flow-engine",
    "apiKey": "staging-api-key-encrypted",
    "environment": "STAGING",
    "color": "#f59e0b",
    "icon": "🧪",
    "order": 2
  },
  "activeFrom": null,
  "activeTo": null
}
```

---

## Field Mapping to UI

The Template Manager maps catalog fields to the internal `FlowEngineInstance` interface:

```typescript
interface FlowEngineInstance {
  id: string // ← entry.id
  name: string // ← entry.code (CODE is used as name!)
  code: string // ← entry.code
  baseUrl: string // ← entry.objectValue.baseUrl
  apiKey: string // ← entry.objectValue.apiKey
  environment: string // ← entry.objectValue.environment
  color: string // ← entry.objectValue.color
  icon: string // ← entry.objectValue.icon
  description: string // ← entry.description (entry-level!)
  order: number // ← entry.displayOrder (primary)
}
```

---

## Current Catalog Entries (Example Data)

Based on the live catalog query, here are the existing entries:

### 1. DEV Instance

```json
{
  "id": "FlowEngineInstances:v1:DEV",
  "code": "DEV",
  "description": "Gravity business apps",
  "displayOrder": 1,
  "objectValue": {
    "baseUrl": "https://newwork-gravity.newwork.com/flow-engine",
    "apiKey": "test-api-key",
    "environment": "STAGING",
    "color": "#3b82f6",
    "icon": "💻",
    "order": 1
  }
}
```

### 2. STAGING Instance

```json
{
  "id": "FlowEngineInstances:v1:STAGING",
  "code": "STAGING",
  "description": "Demo staging tenant",
  "displayOrder": 2,
  "objectValue": {
    "baseUrl": "https://demo.newwork.com/flow-engine",
    "apiKey": "test-api-key",
    "environment": "STAGING",
    "color": "#f59e0b",
    "icon": "🧪",
    "order": 2
  }
}
```

### 3. PROD Instance

```json
{
  "id": "FlowEngineInstances:v1:PROD",
  "code": "PROD",
  "description": "Production here!",
  "displayOrder": 3,
  "objectValue": {
    "baseUrl": "https://newwork.newwork.cloud/flow-engine",
    "apiKey": "test-api-key",
    "environment": "PRODUCTION",
    "color": "#f59e0b",
    "icon": "🧪",
    "order": 2
  }
}
```

### 4. GRV Instance

```json
{
  "id": "FlowEngineInstances:v1:GRV",
  "code": "GRV",
  "description": "Gravity staging tenant",
  "displayOrder": 4,
  "objectValue": {
    "baseUrl": "https://newwork-gravity.newwork.com/flow-engine",
    "apiKey": "test-api-key",
    "environment": "STAGING",
    "color": "#f59e0b",
    "icon": "🧪",
    "order": 2
  }
}
```

---

## Key Design Decisions

### 1. **Code as Name** ✅

The `code` field is used as the display name in the UI. This simplifies the structure and avoids duplication.

**Rationale**:

- No need for separate `name` field in metadata
- Code is already unique and descriptive
- Simplifies catalog management

### 2. **Description at Entry Level** ✅

The description is stored in the entry-level `description` field, not in `objectValue`.

**Rationale**:

- Standard catalog field
- Better for catalog search/filtering
- Cleaner metadata structure

### 3. **DisplayOrder for Sorting** ✅

The `displayOrder` field controls the sort order, not `objectValue.order`.

**Rationale**:

- Standard catalog field
- More reliable for sorting
- `objectValue.order` is kept for backward compatibility but not used

### 4. **Environment in Metadata** ✅

The `environment` field is in `objectValue`, not at entry level.

**Rationale**:

- More flexible (can be different from `code`)
- Allows custom environment names
- Better separation of concerns

---

## Creating New Entries

### Using Catalog Manager UI

1. **Open Catalog Manager**
2. **Select Catalog**: `FlowEngineInstances (v1)`
3. **Click "Add Entry"**
4. **Fill Entry Fields**:
   - ID: `FlowEngineInstances:v1:YOUR_CODE`
   - Code: `YOUR_CODE` (e.g., `UAT`, `QA`)
   - Description: Human-readable description
   - Display Order: Numeric sort order
5. **Fill Metadata (objectValue)**:
   ```json
   {
     "baseUrl": "https://your-instance.com/flow-engine",
     "apiKey": "your-encrypted-api-key",
     "environment": "YOUR_ENV",
     "color": "#yourcolor",
     "icon": "🔧",
     "order": 5
   }
   ```
6. **Save Entry**

---

## Validation Rules

### Required Fields

- ✅ `id` must be unique
- ✅ `code` must be non-empty
- ✅ `objectValue.baseUrl` must be valid URL
- ✅ `objectValue.apiKey` must be non-empty
- ✅ `objectValue.environment` must be non-empty
- ✅ `objectValue.color` must be valid hex color
- ✅ `objectValue.icon` must be non-empty

### Recommended Patterns

- **ID Format**: `FlowEngineInstances:v1:{CODE}`
- **Code**: UPPERCASE (DEV, STAGING, PROD, UAT, QA)
- **Color**: Hex format `#rrggbb`
- **Icon**: Single emoji character
- **DisplayOrder**: Sequential integers (1, 2, 3, ...)

---

## GraphQL Query Example

To fetch all entries:

```graphql
query GetFlowEngineInstances {
  CatalogEntry(where: { catalog: { identifier: { _eq: "FlowEngineInstances" } }, isDeleted: { _eq: false } }) {
    id
    code
    description
    displayOrder
    objectValue
    activeFrom
    activeTo
  }
}
```

---

## Migration Notes

If you have old entries with different structure:

### Old Structure (NOT USED)

```json
{
  "name": "Staging", // ❌ Not used
  "metadata": {
    "description": "..." // ❌ Should be at entry level
  }
}
```

### Current Structure (CORRECT)

```json
{
  "code": "STAGING", // ✅ Used as name
  "description": "...", // ✅ Entry-level field
  "objectValue": {
    "environment": "..." // ✅ In metadata
  }
}
```

---

## Summary

**Key Points**:

- ✅ Use `code` as display name (no separate name field)
- ✅ Put `description` at entry level (not in objectValue)
- ✅ Put `environment` in objectValue
- ✅ Use `displayOrder` for sorting
- ✅ Don't use `additionalValue1/2/3` fields

This structure provides a clean, maintainable catalog that maps directly to the Template Manager's needs.
