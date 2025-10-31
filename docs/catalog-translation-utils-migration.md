# Catalog Translation Utils Migration TODO

## Overview

Migrate all catalog translation logic to use the new centralized utils in `src/common/data/catalog/utils/catalogTranslationUtils.ts`

**New Functions:**

- `getCatalogEntryField(entry, field, locale?)` - Get any translatable field
- `getCatalogEntryValue(entry, locale?)` - Convenience for 'value' field
- `getCatalogEntryFields(entry, fields[], locale?)` - Get multiple fields at once

**Priority:** Translation always uses current user locale, fallback is ALWAYS the default field value (NOT en-US translation)

---

## Files to Migrate

### ❌ Deprecated Functions to Replace

#### 1. `src/common/utils/windowUtils.ts`

```typescript
// DEPRECATED: getCatalogValue
export function getCatalogValue(catalogEntry: any): string
```

**Replace with:** `getCatalogEntryValue(entry)`

**Usage locations:**

- Search for: `getCatalogValue(`
- Estimated files: ~5-10

---

#### 2. `src/components/catalog-select/internal/catalogSelectUtils.ts`

```typescript
// DEPRECATED: getLocalizedValue
export const getLocalizedValue = (entry: CatalogEntry, locale?: string): string
```

**Replace with:** `getCatalogEntryValue(entry, locale)`

**Usage locations:**

- Search for: `getLocalizedValue(`
- Estimated files: ~3-5 (mostly in catalog-select internals)

---

#### 3. `src/business-apps/fin/expenses/forms/approve-expense-plan/utils/formatters.ts`

```typescript
// DEPRECATED: getCatalogValue (duplicate!)
export const getCatalogValue = (catalogEntry: any): string
```

**Replace with:** `getCatalogEntryValue(entry)`

**Usage locations:**

- Search for in expenses module
- Estimated files: 1-2

---

## Migration Steps

### Phase 1: Mark as Deprecated ✅

- [ ] Add `@deprecated` JSDoc to `windowUtils.getCatalogValue`
- [ ] Add `@deprecated` JSDoc to `catalogSelectUtils.getLocalizedValue`
- [ ] Add `@deprecated` JSDoc to `expenses/formatters.getCatalogValue`
- [ ] Add migration hint in JSDoc pointing to new utils

### Phase 2: Update Import Statements

```typescript
// Old imports (to replace):
import { getCatalogValue } from '@/common/utils/windowUtils'
import { getLocalizedValue } from '@/components/catalog-select/internal/catalogSelectUtils'

// New imports:
import { getCatalogEntryValue } from '@/common/data/catalog'
```

### Phase 3: Replace Function Calls

#### Pattern 1: Simple value access

```typescript
// Before:
const displayName = getCatalogValue(catalogEntry)

// After:
const displayName = getCatalogEntryValue(catalogEntry)
```

#### Pattern 2: With locale

```typescript
// Before:
const displayName = getLocalizedValue(entry, locale)

// After:
const displayName = getCatalogEntryValue(entry, locale)
```

#### Pattern 3: Additional fields

```typescript
// Before:
const value = catalogEntry.additionalValue1 || ''

// After:
const value = getCatalogEntryField(catalogEntry, 'additionalValue1')
```

#### Pattern 4: Multiple fields

```typescript
// Before:
const name = getCatalogValue(entry)
const desc = entry.additionalValue1 || ''
const extra = entry.additionalValue2 || ''

// After:
const {
  value: name,
  additionalValue1: desc,
  additionalValue2: extra
} = getCatalogEntryFields(entry, ['value', 'additionalValue1', 'additionalValue2'])
```

### Phase 4: Remove Deprecated Functions

- [ ] After all migrations complete, remove old functions
- [ ] Update any remaining references
- [ ] Run full test suite

---

## Affected Modules (Estimated)

### High Priority

- [ ] **Content Module** (content-portal, content-management, content-record)
- [ ] **Catalog Manager** (if using getLocalizedValue)
- [ ] **Expenses Module** (has duplicate getCatalogValue)

### Medium Priority

- [ ] **HR Modules** (absences, salaries)
- [ ] **CRM Modules** (if using catalog translations)
- [ ] **IRM Modules** (investments)

### Low Priority

- [ ] **Common Components** (catalog-select internals)
- [ ] **Utility Functions** (formatters, helpers)

---

## Search Commands

```bash
# Find all usages of deprecated functions
grep -r "getCatalogValue(" src/
grep -r "getLocalizedValue(" src/

# Find catalog entry value access patterns (potential candidates)
grep -r "catalogEntry\.value" src/
grep -r "entry\.additionalValue" src/
```

---

## Testing Checklist

After migration of each module:

- [ ] Verify translations work correctly in all supported locales (en-US, de-DE, ro-RO)
- [ ] Verify fallback to default value works when translation missing
- [ ] Verify null/undefined entries don't crash
- [ ] Verify objectValue fields handle JSON correctly
- [ ] Test with real catalog data from backend

---

## Benefits After Migration

✅ **Consistency**: Single source of truth for catalog translations
✅ **Type Safety**: Proper TypeScript types for all fields
✅ **Locale Support**: Automatic current locale detection
✅ **Fallback Logic**: Always falls back to default value (not en-US)
✅ **All Fields**: Supports value, additionalValue1-3, objectValue
✅ **Maintainability**: Changes in one place affect entire app
✅ **Documentation**: Clear JSDoc with examples

---

## Estimated Effort

- **Phase 1 (Deprecation)**: 1 hour
- **Phase 2-3 (Migration)**: 8-16 hours (depends on usage count)
- **Phase 4 (Cleanup)**: 2 hours
- **Total**: 1-2 developer days

---

## Notes

- Migration can be done incrementally module by module
- Old functions will remain until all migrations complete
- No breaking changes - both old and new work during transition
- Priority: Start with Content module (most active development)
