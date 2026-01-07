---
description: Whenever catalog entries are mentioned, or whenever there are dropdown/select components displaying catalog values, or whenever there are dropdown/select components displaying hardcoded values, or whenever catalog values are mentioned.
alwaysApply: false
---
# Catalog API Integration Patterns

## Overview
This document defines patterns for integrating with backend catalogs, including basic data fetching and comprehensive form integration patterns.

## Basic Catalog Integration

When working with Catalog APIs for reference data:

- Use `useCatalogManagerClient()` from `src/common/network/catalogs/useCatalogManagerClient.ts`
- Common catalogs: `JobLevelGroup`, `CompensationBand`, `Department`, `AcademicTitle`, `IndustryClass` (all version `v1`)
- Use `getCatalogEntriesList` method with proper parameters

@src/business-apps/mdm/apps/compensation-data/hooks/useJobLevelGroups.ts

### Common Catalog Constants
```typescript
export const JOB_LEVEL_GROUP_CATALOG = 'JobLevelGroup';
export const ACADEMIC_TITLE_CATALOG = 'AcademicTitle';
export const INDUSTRY_CLASS_CATALOG = 'IndustryClass';
export const CATALOG_VERSION = 'v1';
```

### Basic Catalog Hook Pattern
```typescript
export const useEntityCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken);

  const fetchEntityCatalog = async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: ENTITY_CATALOG,
        version: CATALOG_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    );
    return response;
  };

  return { fetchEntityCatalog };
};
```

## Form Integration Pattern: Replace Hardcoded Options with Catalog Data

### When to Apply
- Form components with hardcoded dropdown/select options
- Static arrays of reference data (titles, statuses, categories, etc.)
- Any form data that should come from a centralized catalog

### Implementation Steps

#### 1. Create Form-Focused Catalog Hook
Create a dedicated hook for form components following the naming pattern `use{CatalogName}.ts`:

```typescript
// hooks/useAcademicTitles.ts
import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface AcademicTitleOption {
  id: string;
  value: string;
  label: string;
  name: string;
}

export const useAcademicTitles = (accessToken: string) => {
  const [academicTitleOptions, setAcademicTitleOptions] = useState<AcademicTitleOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchAcademicTitles = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AcademicTitle', // Catalog name
          version: 'v1' // Catalog version
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );

      const options = response.data.map(entry => ({
        id: entry.id,
        value: entry.value,
        label: entry.value,
        name: entry.value
      }));

      setAcademicTitleOptions(options);
    } catch (err) {
      console.error('Error fetching academic titles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch academic titles');
      // Fallback to empty array on error
      setAcademicTitleOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, accessToken]);

  useEffect(() => {
    fetchAcademicTitles();
  }, [fetchAcademicTitles]);

  return {
    academicTitleOptions,
    isLoading,
    error,
    refetch: fetchAcademicTitles
  };
};
```

#### 2. Update Form Context (if applicable)
If the component uses a form context, ensure `accessToken` is available:

```typescript
// Add to context interface
interface FormContextValue {
  // ... existing properties
  accessToken: string;
}

// Add to context provider
const contextValue: FormContextValue = {
  // ... existing values
  accessToken: businessAppContext.accessToken,
};
```

#### 3. Update Component to Use Catalog Hook
Replace hardcoded options with the catalog hook:

```typescript
// Before (hardcoded)
import { salutationOptions } from '../utils/validationUtils';

// After (catalog-based)
import { useAcademicTitles } from '../hooks/useAcademicTitles';

const Component: React.FC = () => {
  const { accessToken } = useFormContext();
  
  // Fetch from catalog
  const {
    academicTitleOptions,
    isLoading: academicTitlesLoading
  } = useAcademicTitles(accessToken);

  return (
    <SelectField
      data={academicTitleOptions} // Use catalog data
      loading={isLoading || academicTitlesLoading} // Combine loading states
      // ... other props
    />
  );
};
```

#### 4. Remove Hardcoded Data
Clean up hardcoded arrays and unused imports:

```typescript
// Remove from utils file
export const salutationOptions = [/* hardcoded array */]; // ❌ Delete this

// Remove from component imports
import { salutationOptions } from '../utils/validationUtils'; // ❌ Remove this
```

## Standard Catalog Hook Pattern

### Required Properties for Form Integration
```typescript
export interface CatalogOption {
  id: string;        // Catalog entry ID
  value: string;     // Entry value for form submission
  label: string;     // Display text for UI
  name: string;      // Alternative display name
}

export const useCatalogHook = (accessToken: string) => {
  return {
    options: CatalogOption[];     // Array of catalog entries
    isLoading: boolean;           // Loading state
    error: string | null;         // Error message
    refetch: () => Promise<void>; // Manual refresh function
  };
};
```

### Error Handling Best Practices
- Always provide fallback to empty array on errors
- Log errors for debugging but don't crash the UI
- Show loading states during data fetching
- Use `useCallback` for fetch functions to prevent unnecessary re-renders

## Common Catalog Types

### Academic/Professional Titles
```typescript
catalogIdentifier: 'AcademicTitle'
version: 'v1'
// Used for: Salutations, professional titles, honorifics
```

### Business Classifications
```typescript
catalogIdentifier: 'IndustryClass'
version: 'v1'
// Used for: Industry types, business categories
```

### Geographic Data
```typescript
catalogIdentifier: 'Country'
version: 'v1'
// Used for: Countries, regions, locations
```

### Status/State Categories
```typescript
catalogIdentifier: 'SalesLeadStatus'
version: 'v1'
// Used for: Lead statuses, opportunity stages, process states
```

### HR/Organizational Data
```typescript
catalogIdentifier: 'JobLevelGroup'
catalogIdentifier: 'CompensationBand'
catalogIdentifier: 'Department'
version: 'v1'
// Used for: Job levels, compensation, organizational structure
```

## Integration Checklist

### Before Implementation
- [ ] Identify all hardcoded options in the component
- [ ] Determine appropriate catalog identifier and version
- [ ] Check if form context provides access to accessToken
- [ ] Plan for loading and error states

### During Implementation
- [ ] Create catalog hook with proper error handling
- [ ] Update form context to expose accessToken (if needed)
- [ ] Replace hardcoded data with catalog hook in component
- [ ] Combine loading states appropriately
- [ ] Remove unused hardcoded arrays and imports

### After Implementation
- [ ] Test loading states and error handling
- [ ] Verify data displays correctly in form
- [ ] Confirm form submission works with catalog values
- [ ] Remove dead code and unused dependencies

## Benefits of Catalog Integration

### Data Consistency
- Single source of truth for reference data
- Consistent values across all applications
- Centralized data management

### Maintainability
- No need to update hardcoded arrays in code
- Business users can manage catalog data
- Automatic updates when catalog changes

### Business Flexibility
- Business teams can add/modify options without code changes
- Faster response to business requirements
- Reduced development overhead for reference data changes




