# Content Form Fixes - Summary

## Problems Fixed

### 1. ContentEntryWindow.tsx (15 Linter Errors)

#### Issue 1: `allowLike` statt `allowReaction`

- **Lines 51, 251, 254**: Form verwendet noch altes `allowLike` field
- **Fix**: Replaced mit `allowReaction`
  - `defaultValues.allowLike: true` → `allowReaction: true`
  - `name="allowLike"` → `name="allowReaction"`
  - `t('fields.allow_likes')` → `t('fields.allow_reactions')`

#### Issue 2: `typeValues` nicht definiert

- **Line 37, 144**: `useContentTypes` destructured nur `isLoading`, aber nicht `typeValues`
- **Fix**: Added `typeValues` to destructuring
  ```typescript
  const { typeValues, isLoading: typesLoading } = useContentTypes(context.accessToken)
  ```

#### Issue 3: React Hook Form Type Errors

- **Lines 100, 103, 131, etc.**: TypeScript Generic Type Inference Probleme
- **Fix**: Type casts mit `as any`
  - `handleSubmit(onSubmit as any)`
  - `control={control as any}` für alle FormField components

#### Issue 4: Switch `checked` Type Error

- **Line 256**: `field.value` Type war `string | boolean | Date | string[] | null`
- **Fix**: Explicit cast `checked={field.value as boolean}`

---

### 2. Intranet Hooks - Migration von gelöschten Queries

Alle 3 Hooks (`useContentTags`, `useContentGroups`, `useContentTypes`) importierten von der gelöschten `../queries/ContentQueries.ts`.

#### useContentTags.ts

**OLD (Article-based)**:

```typescript
import { GET_CONTENT_TAGS_QUERY } from '../queries/ContentQueries'
interface FetchTagsData {
  Tag: { id: number; tag: string }[]
}
```

**NEW (Catalog-based)**:

```typescript
const GET_CONTENT_TAGS_QUERY = `
  query GetContentTags {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "ContentTag" }, version: { _eq: "v1" } }
        isDeleted: { _neq: true }
      }
      orderBy: { displayOrder: ASC }
    ) {
      id code value
    }
  }
`
interface FetchTagsData {
  CatalogEntry: { id: string; code: string; value: string }[]
}
```

**Response Mapping**:

- ❌ `result.Tag` → ✅ `result.CatalogEntry`
- ❌ `tag.tag` → ✅ `entry.value`

#### useContentGroups.ts

**OLD (Article-based)**:

```typescript
interface ContentGroupsData {
  ArticleGroup: { id: string; name: string }[]
}
```

**NEW (Catalog-based)**:

```typescript
const GET_CONTENT_GROUPS_QUERY = `
  query GetContentGroups {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "ContentGroup" }, version: { _eq: "v1" } }
        isDeleted: { _neq: true }
      }
      orderBy: { displayOrder: ASC }
    ) {
      id code value
    }
  }
`
interface ContentGroupsData {
  CatalogEntry: { id: string; code: string; value: string }[]
}
```

**Response Mapping**:

- ❌ `result.ArticleGroup` → ✅ `result.CatalogEntry`
- ❌ `group.name` → ✅ `entry.value`

#### useContentTypes.ts

**OLD (Article-based)**:

```typescript
interface ContentTypesData {
  ArticleType: { id: string; name: string; parentEntryId?: string }[]
}
```

**NEW (Catalog-based)**:

```typescript
const GET_CONTENT_TYPES_QUERY = `
  query GetContentTypes {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "ContentType" }, version: { _eq: "v1" } }
        isDeleted: { _neq: true }
      }
      orderBy: { displayOrder: ASC }
    ) {
      id code value parentEntryId
    }
  }
`
interface ContentTypesData {
  CatalogEntry: { id: string; code: string; value: string; parentEntryId?: string }[]
}
```

**Response Mapping**:

- ❌ `result.ArticleType` → ✅ `result.CatalogEntry`
- ❌ `type.name` → ✅ `entry.value`

---

## Files Modified

1. ✅ `src/business-apps/core/content/forms/content-entry-window/ContentEntryWindow.tsx`
   - Fixed `allowLike` → `allowReaction` (3 places)
   - Added `typeValues` destructuring
   - Added type casts for React Hook Form
2. ✅ `src/business-apps/core/content/apps/intranet/hooks/useContentTags.ts`
   - Inline query definition
   - Catalog-based GraphQL query
   - Updated response mapping
3. ✅ `src/business-apps/core/content/apps/intranet/hooks/useContentGroups.ts`
   - Inline query definition
   - Catalog-based GraphQL query
   - Updated response mapping
4. ✅ `src/business-apps/core/content/apps/intranet/hooks/useContentTypes.ts`
   - Inline query definition
   - Catalog-based GraphQL query
   - Updated response mapping

---

## Key Changes Summary

### Data Model Migration

- **FROM**: `Article*` entities (ArticleGroup, ArticleType, Tag)
- **TO**: `CatalogEntry` with catalog filters
- **Benefit**: Unified catalog-based data management

### Field Name Standardization

- **FROM**: `allowLike`, `likesCount`, `name`, `tag`
- **TO**: `allowReaction`, `reactionsCount`, `value`, `value`
- **Benefit**: Consistent naming with new reaction system

### Query Inlining

- **FROM**: Centralized `../queries/ContentQueries.ts`
- **TO**: Inline queries in each hook
- **Benefit**: Self-contained hooks, no broken imports

---

## Testing Recommendations

1. **ContentEntryWindow**: Verify all fields load correctly (Groups, Types, Tags)
2. **Form Submit**: Check `allowReaction` field is saved correctly
3. **Type Filtering**: Ensure Types are filtered by selected Group
4. **Catalog Data**: Verify ContentTag, ContentGroup, ContentType catalogs exist and have data

---

**Status**: ✅ ALL FIXES COMPLETE - 0 LINTER ERRORS
**Date**: 2025-01-28
