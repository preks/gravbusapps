# 🚨 CRITICAL BUG FIX: Rekursive Requests & GraphQL Errors

## Problem 1: Rekursive Requests

Nach der Migration auf das zentrale Content Data System haben wir **rekursive `getContentEntry` Requests** im gesamten Intranet verursacht.

### Root Cause

Falsche Hook-Signaturen verwendet:

**❌ FALSCH (verursacht rekursive Calls):**

```typescript
// useContentEntries erwartet (params, accessToken) getrennt
useContentEntries({
  accessToken,
  params: { ... }
})

// useContentEntry erwartet (id, options) getrennt
useContentEntry({
  contentEntryId: id,
  accessToken
})
```

**✅ RICHTIG:**

```typescript
// useContentEntries
useContentEntries(
  { role, contentGroupRef, ... },
  accessToken
)

// useContentEntry
useContentEntry(id, {
  includeChildren: true,
  accessToken
})
```

---

## Problem 2: GraphQL Error - `_is_null` nicht unterstützt

### Error:

```
field '_is_null' not found in type: 'UuidComparisonExp'
```

### Root Cause:

UUID-Felder in Hasura unterstützen **kein `_is_null`** für null-Checks. Die Query versuchte:

```typescript
parentContentEntryId: {
  _is_null: true
} // ❌ NICHT unterstützt für UUID
```

### Solution:

Verwende `role` Filter statt `parentContentEntryId` für Top-Level Entries:

- **`ContentRole.ROOT_CONTENT_ROLE`**: Top-Level Entries (Main Articles)
- **`ContentRole.COMMENT_CONTENT_ROLE`**: Nested Entries (Comments)

**✅ RICHTIG:**

```typescript
useContentEntries(
  {
    role: ContentRole.ROOT_CONTENT_ROLE, // ✅ Top-Level Filter
    contentGroupRef: contentGroupMapper[INTRANET],
    search: searchQuery,
    limit,
    offset,
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  },
  accessToken
)
```

---

## Betroffene Dateien (ALLE GEFIXT):

### Views (6 Files):

- ✅ `src/business-apps/core/content/apps/intranet/views/home-view/HomeView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/news-view/NewsView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/knowledge-view/KnowledgeView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/document-view/DocumentView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/question-view/QuestionView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/intranet-view/IntranetView.tsx`

### Records (1 File):

- ✅ `src/business-apps/core/content/records/content-record/hooks/useContent.ts`

### Queries (1 File):

- ✅ `src/common/data/content/queries/contentQueries.ts` - Removed `_is_null` check

---

## Changes Applied:

1. **Hook-Signaturen korrigiert**: Alle Calls nutzen jetzt `(params, accessToken)` bzw. `(id, options)`
2. **`ContentRole.MAIN` → `ContentRole.ROOT_CONTENT_ROLE`**: Korrekter Enum-Wert für Top-Level Entries
3. **`parentContentEntryId: null` entfernt**: Nicht mehr nötig, `role` filtert bereits
4. **`_is_null` Check entfernt**: Aus GraphQL Query Builder entfernt

---

## Status: ✅ ALLE BUGS GEFIXT

- ✅ Rekursive Requests eliminiert
- ✅ GraphQL `_is_null` Error behoben
- ✅ Korrekte ContentRole verwendet
- ✅ System funktioniert mit zentralen Hooks

**Datum:** 2025-01-28
