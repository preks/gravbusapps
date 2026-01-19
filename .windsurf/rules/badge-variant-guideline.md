---
description: Badge components and the usage from '@newwork/nw-design-system'
alwaysApply: false
---

# Badge Variant Guidelines

## Core Rule

**ALWAYS use `variant` prop instead of `className` for Badge components.** Extract variants from catalog entry `objectValue.badgeVariant` or use utility functions for dynamic content.

## Quick Implementation

### 1. GraphQL Queries

Add `objectValue` to all catalog entries (CatalogEntry object in GraphQL):

```graphql
leadStatus { id code value objectValue }
```

### 2. TypeScript Interfaces

```typescript
leadStatus?: { id: string; code: string; value: string; objectValue?: any; };
```

### 3. Badge Usage

```tsx
// ✅ Catalog entries
<Badge variant={getLeadStatusBadgeVariant(record.leadStatus)}>
  {record.leadStatus?.value}
</Badge>

// ✅ Dynamic content
<Badge variant={getWinningChanceBadgeVariant(record.winningChance)}>
  {record.winningChance}%
</Badge>
```

### 4. Import All Utilities

```typescript
import {
  getBadgeVariantFromCatalog,
  getLeadStatusBadgeVariant,
  getLeadRatingBadgeVariant,
  getAccountTypeBadgeVariant,
  getIndustryBadgeVariant,
  getSalesPipelineStageBadgeVariant,
  getWinningChanceBadgeVariant
} from '@/common/utils/badgeUtils'
```

## Available Variants

- `success` (green), `destructive` (red), `warning` (orange), `info` (blue)
- `default` (dark), `secondary` (light), `accent` (medium), `outline` (white border)
- Status: `pending`, `running`, `paid`, `overdue`, `offline`
- AI: `aiGenerated`, `aiModified`, `action`

## Dynamic Rules

**Winning Chance**: 75-100% = `success`, 50-74% = `info`, 25-49% = `warning`, 0-24% = `destructive`

## Component Mapping

- **Leads**: `leadStatus` → `getLeadStatusBadgeVariant()`, `leadRating` → `getLeadRatingBadgeVariant()`
- **Accounts**: `type` → `getAccountTypeBadgeVariant()`, `industry` → `getIndustryBadgeVariant()`
- **Opportunities**: `salesPipelineStage` → `getSalesPipelineStageBadgeVariant()`, `winningChance` → `getWinningChanceBadgeVariant()`
- **Contacts**: `academicTitle` → `getBadgeVariantFromCatalog()`

## Migration Steps

1. Add `objectValue` to GraphQL queries
2. Update TypeScript interfaces
3. Import from `@/common/utils/badgeUtils`
4. Replace `className` with `variant`
5. Remove old styling helper functions
6. Update data transformation to preserve `objectValue`

## Error Handling

All functions fallback to `'default'` variant on errors. Invalid percentages use `'outline'`.
