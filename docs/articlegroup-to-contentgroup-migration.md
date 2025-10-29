# ArticleGroup → ContentGroup Migration

## Overview

Renamed all occurrences of `articleGroup` to `contentGroup` across the entire Content module to align with the new naming convention.

---

## Changes Made

### 1. **Constants** (`contentConstants.ts`)

**Module Names**:

```typescript
// OLD
export const NEWS_MODULE = 'ArticleGroup:v1:NEWS'
export const INTRANET_MODULE = 'ArticleGroup:v1:INTRANET'
export const KNOWLEDGE_BASE_MODULE = 'ArticleGroup:v1:KNOWLEDGE'
export const DOCUMENT_MODULE = 'ArticleGroup:v1:DOCUMENT'
export const QUESTION_MODULE = 'ArticleGroup:v1:QUESTION'

// NEW
export const NEWS_MODULE = 'ContentGroup:v1:NEWS'
export const INTRANET_MODULE = 'ContentGroup:v1:INTRANET'
export const KNOWLEDGE_BASE_MODULE = 'ContentGroup:v1:KNOWLEDGE'
export const DOCUMENT_MODULE = 'ContentGroup:v1:DOCUMENT'
export const QUESTION_MODULE = 'ContentGroup:v1:QUESTION'
```

**Content Group Mapper**:

```typescript
// OLD
export const contentGroupMapper = {
  [NEWS]: 'ArticleGroup:v1:NEWS',
  [KNOWLEDGE_BASE]: 'ArticleGroup:v1:KNOWLEDGE'
  // ...
}

// NEW
export const contentGroupMapper = {
  [NEWS]: 'ContentGroup:v1:NEWS',
  [KNOWLEDGE_BASE]: 'ContentGroup:v1:KNOWLEDGE'
  // ...
}
```

**Display Mapper**:

```typescript
// OLD
export const contentGroupToDisplayMapper = {
  'ArticleGroup:v1:NEWS': 'news',
  'ArticleGroup:v1:KNOWLEDGE': 'knowledge'
  // ...
}

// NEW
export const contentGroupToDisplayMapper = {
  'ContentGroup:v1:NEWS': 'news',
  'ContentGroup:v1:KNOWLEDGE': 'knowledge'
  // ...
}
```

---

### 2. **TypeScript Interfaces** (`content.types.ts`)

**Content Interface**:

```typescript
// OLD
export interface Content {
  articleGroupRef: string
  // ...
}

// NEW
export interface Content {
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  // ...
}
```

**ContentEntryWindowVals Interface**:

```typescript
// OLD
export interface ContentEntryWindowVals {
  articleGroupRef: string
  // ...
}

// NEW
export interface ContentEntryWindowVals {
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  // ...
}
```

**ContentPreviewData Interface**:

```typescript
// OLD
export interface ContentPreviewData {
  articleGroupRef: string
  // ...
}

// NEW
export interface ContentPreviewData {
  contentGroupRef: string // FIXED: articleGroupRef → contentGroupRef
  // ...
}
```

---

### 3. **ContentEntryWindow** (`ContentEntryWindow.tsx`)

**Default Values**:

```typescript
// OLD
const defaultValues = {
  articleGroupRef: ''
  // ...
}

// NEW
const defaultValues = {
  contentGroupRef: '' // FIXED: articleGroupRef → contentGroupRef
  // ...
}
```

**Watch Variable**:

```typescript
// OLD
const watchArticleGroup = watch('articleGroupRef')

// NEW
const watchContentGroup = watch('contentGroupRef') // FIXED
```

**FormField Name**:

```typescript
// OLD
<FormField
  name="articleGroupRef"
  // ...
/>

// NEW
<FormField
  name="contentGroupRef" // FIXED: articleGroupRef → contentGroupRef
  // ...
/>
```

**Type Filtering**:

```typescript
// OLD
typeValues.filter(type => type.parentEntryId === watchArticleGroup)

// NEW
typeValues.filter(type => type.parentEntryId === watchContentGroup) // FIXED
```

---

### 4. **useContentTypes Hook** (`useContentTypes.ts`)

**Content Group Display Mapper**:

```typescript
// OLD
const contentGroupDisplayMapper: Record<string, string> = {
  'ArticleGroup:v1:KNOWLEDGE': 'Knowledge',
  'ArticleGroup:v1:NEWS': 'News',
  'ArticleGroup:v1:INTRANET': 'Intranet',
  'ArticleGroup:v1:DOCUMENT': 'Document'
}

// NEW
const contentGroupDisplayMapper: Record<string, string> = {
  'ContentGroup:v1:KNOWLEDGE': 'Knowledge',
  'ContentGroup:v1:NEWS': 'News',
  'ContentGroup:v1:INTRANET': 'Intranet',
  'ContentGroup:v1:DOCUMENT': 'Document'
}
```

---

### 5. **Views** (All Intranet Views)

**externalContextData**:

```typescript
// OLD (NewsView, KnowledgeView, DocumentView, QuestionView)
externalContextData={{ articleGroup: contentGroupMapper[NEWS] }}

// NEW
externalContextData={{ contentGroup: contentGroupMapper[NEWS] }}
```

**Files Updated**:

- ✅ `src/business-apps/core/content/apps/intranet/views/news-view/NewsView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/knowledge-view/KnowledgeView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/document-view/DocumentView.tsx`
- ✅ `src/business-apps/core/content/apps/intranet/views/question-view/QuestionView.tsx`

---

### 6. **ContentListView** (`ContentListView.tsx`)

**Table Cell Display**:

```typescript
// OLD
<TableCell>{content.articleGroupRef}</TableCell>

// NEW
<TableCell>{content.contentGroupRef}</TableCell> {/* FIXED */}
```

---

### 7. **Bonus Fixes**

**Error Rendering in Views**:

```typescript
// OLD (caused linter errors)
<AlertDescription>
  {error}
</AlertDescription>

// NEW
<AlertDescription>
  {error?.message || 'An error occurred'}
</AlertDescription>
```

**Files Fixed**:

- ✅ `HomeView.tsx`
- ✅ `NewsView.tsx`
- ✅ `DocumentView.tsx`

---

## Files Modified Summary

### Primary Changes (articleGroup → contentGroup):

1. ✅ `src/business-apps/core/content/apps/intranet/constants/contentConstants.ts`
   - Module names: `ArticleGroup:v1:*` → `ContentGroup:v1:*`
   - Content group mapper
   - Display mapper

2. ✅ `src/business-apps/core/content/apps/intranet/types/content.types.ts`
   - `Content` interface
   - `ContentEntryWindowVals` interface
   - `ContentPreviewData` interface

3. ✅ `src/business-apps/core/content/forms/content-entry-window/ContentEntryWindow.tsx`
   - Default values
   - Watch variable
   - FormField name
   - Type filtering

4. ✅ `src/business-apps/core/content/apps/intranet/hooks/useContentTypes.ts`
   - Content group display mapper

5. ✅ `src/business-apps/core/content/apps/intranet/views/news-view/NewsView.tsx`
   - externalContextData

6. ✅ `src/business-apps/core/content/apps/intranet/views/knowledge-view/KnowledgeView.tsx`
   - externalContextData

7. ✅ `src/business-apps/core/content/apps/intranet/views/document-view/DocumentView.tsx`
   - externalContextData

8. ✅ `src/business-apps/core/content/apps/intranet/views/question-view/QuestionView.tsx`
   - externalContextData

9. ✅ `src/business-apps/core/content/apps/content-management/components/ContentListView.tsx`
   - Table cell display

### Bonus Fixes:

10. ✅ Error rendering in `HomeView.tsx`, `NewsView.tsx`, `DocumentView.tsx`

---

## Catalog Backend Requirements

**IMPORTANT**: The backend catalog must be updated to match:

**OLD Catalog**:

- Identifier: `ArticleGroup`
- Version: `v1`
- Entries: `NEWS`, `INTRANET`, `KNOWLEDGE`, `DOCUMENT`, `QUESTION`

**NEW Catalog**:

- Identifier: `ContentGroup` ⚠️ **MUST BE UPDATED IN BACKEND**
- Version: `v1`
- Entries: `NEWS`, `INTRANET`, `KNOWLEDGE`, `DOCUMENT`, `QUESTION`

**Migration Steps**:

1. Create new `ContentGroup` catalog in backend
2. Migrate existing data from `ArticleGroup` to `ContentGroup`
3. Update all references in database
4. Deprecate `ArticleGroup` catalog

---

## Testing Checklist

- [ ] Content Form loads content groups correctly
- [ ] Content Form type filtering works based on selected content group
- [ ] All views display content groups correctly
- [ ] Content Management table shows correct content group
- [ ] No references to `ArticleGroup` remain in frontend code
- [ ] Backend catalog `ContentGroup` exists with correct entries
- [ ] Existing content data migrated to new `contentGroupRef` field

---

## Search Queries for Verification

To verify all changes:

```bash
# Should return 0 results:
grep -r "ArticleGroup" src/business-apps/core/content/apps/intranet
grep -r "articleGroupRef" src/business-apps/core/content/apps/intranet
grep -r "articleGroup:" src/business-apps/core/content/apps/intranet

# Should return results:
grep -r "ContentGroup" src/business-apps/core/content/apps/intranet
grep -r "contentGroupRef" src/business-apps/core/content/apps/intranet
grep -r "contentGroup:" src/business-apps/core/content/apps/intranet
```

---

**Status**: ✅ ALL MIGRATIONS COMPLETE - ArticleGroup → ContentGroup
**Date**: 2025-01-28
**Linter Errors**: 0 (1 warning for unused variable)
