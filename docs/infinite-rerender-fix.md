# 🚨 CRITICAL: Infinite Re-Render Fix - COMPLETED

## Problem

**Rekursive Requests** wurden durch **Object recreation bei jedem Render** verursacht!

### Root Cause:

`useContentEntries` Hook hat `params` object als Dependency in `useCallback`:

```typescript
const fetchEntries = useCallback(async () => {
  // ...
}, [params, accessToken, graphqlClient]) // ❌ params ist ein Object!
```

Wenn `params` bei jedem Render neu erstellt wird → `fetchEntries` ändert sich → `useEffect` wird getriggert → Re-Render → **INFINITE LOOP!**

### Solution:

**Memoize params object** in allen Views mit `useMemo`:

```typescript
const queryParams = useMemo(
  () => ({
    role: ContentRole.ROOT,
    contentGroupRef: contentGroupMapper[GROUP],
    search: searchQuery,
    limit,
    offset,
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const
  }),
  [searchQuery, limit, offset]  // ✅ Nur wenn diese sich ändern
)

const { entries, ... } = useContentEntries(queryParams, accessToken)
```

## Files Fixed: ✅ ALL DONE

- ✅ **HomeView.tsx** - queryParams memoized
- ✅ **NewsView.tsx** - queryParams memoized
- ✅ **KnowledgeView.tsx** - queryParams memoized
- ✅ **DocumentView.tsx** - queryParams memoized
- ✅ **QuestionView.tsx** - queryParams memoized
- ✅ **IntranetView.tsx** - queryParams memoized

## Key Changes:

### Before (❌ Infinite Loop):

```typescript
const { entries } = useContentEntries(
  {
    role: ContentRole.ROOT,
    search: searchQuery,
    limit,
    offset
  },
  accessToken
)
```

**Problem**: Object `{}` wird bei jedem Render neu erstellt!

### After (✅ Fixed):

```typescript
const queryParams = useMemo(
  () => ({
    role: ContentRole.ROOT,
    search: searchQuery,
    limit,
    offset,
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const
  }),
  [searchQuery, limit, offset]
)

const { entries } = useContentEntries(queryParams, accessToken)
```

**Solution**: Object wird nur neu erstellt wenn Dependencies sich ändern!

---

## Related Hook Improvements:

`useUserContentReactions` bereits optimiert:

- ✅ Verwendet `contentEntryIds.join(',')` statt Array direkt
- ✅ `articleIds` in Views bereits mit `useMemo` wrapped

---

**Status:** ✅ ALLE INFINITE LOOPS BEHOBEN
**Datum:** 2025-01-28
