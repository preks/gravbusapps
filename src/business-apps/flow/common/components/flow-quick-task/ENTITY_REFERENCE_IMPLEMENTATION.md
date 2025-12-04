# Entity Reference Implementation for Blinks (Quick Tasks)

## Overview

This implementation adds the ability to link **any entity** in the system to blinks (quick tasks) created via the EveryBox component. Users can now search across all entity types and attach references to accounts, contacts, employees, absences, expenses, investments, and more.

## Implementation Summary

### 1. Universal Entity Search Hook

**File**: `hooks/useUniversalEntitySearch.ts`

- **Purpose**: Provides a unified GraphQL search across ALL entity types
- **Supported Entities**:
  - **CRM**: Account, Lead, Contact, Opportunity
  - **HR**: Employee, Absence
  - **Finance**: ExpenseRequest, ExpensePlan, ExpenseItem
  - **Investment (IRM)**: InvestmentAccount, InvestmentLead, InvestmentOpportunity
- **Features**:
  - Single search query across multiple entity types
  - Debounced search with 300ms delay
  - Returns unified entity options with type badges
  - Supports avatar URLs for employees
  - Metadata storage for additional entity information

### 2. Searchable Entity Combobox Component

**File**: `SearchableEntityCombobox.tsx`

- **Purpose**: UI component for searching and selecting entities
- **Features**:
  - Type-ahead search with minimum 2 characters
  - Entity type badges with color coding
  - Avatar support for employees
  - Icon mapping for different entity types
  - Clear/reset functionality
  - Loading and error states
  - Fully accessible with proper ARIA attributes

### 3. Quick Task Form Updates

**Files**:

- `types.ts` (QuickTaskFormData interface)
- `QuickTaskFormFields.tsx` (form component)
- `QuickTaskForm.tsx` (wrapper component)

**Changes**:

- Added entity reference fields to `QuickTaskFormData`:
  - `entityType`: Type of entity (account, contact, employee, etc.)
  - `entityId`: UUID of the entity
  - `entityName`: Display name
  - `entityDisplayUrl`: Navigation URL (for future use)
  - `entityMetadata`: Additional entity data
- Integrated `SearchableEntityCombobox` in the form
- Positioned below message field and above attachments
- Optional field (not required)

### 4. Quick Task Flow Service Updates

**File**: `services/QuickTaskFlowService.ts`

**Changes**:

- Modified `executeQuickTask` method to include entity references in workflow tags
- Entity reference fields are conditionally added to `tagsWithGroup` object
- Stored in CFlow workflow metadata for persistence

**Tag Structure**:

```typescript
{
  app: 'quick-task',
  blinkGroupId: 'blink_group_...',
  assignedUserId: 'user-id',
  // Entity reference fields
  entityType: 'account',
  entityId: 'uuid',
  entityName: 'ACME Corp',
  entityDisplayUrl: '/crm/accounts/uuid'
}
```

### 5. EveryBox Display Updates

**Files**:

- `types/index.ts` (Flow interface)
- `components/FlowDetailDialog.tsx` (detail view)
- `hooks/useOutboxFlows.ts` (data fetching)

**Changes**:

- Extended `Flow` interface with entity reference fields
- Updated `transformFlow` function to extract entity data from tags
- Added "Related To" section in `FlowDetailDialog` showing:
  - Link icon
  - Entity type badge
  - Entity name

## Usage Example

### Creating a Blink with Entity Reference

1. User opens EveryBox
2. Clicks "Blink" button to create quick task
3. Fills in title and description
4. **NEW**: Searches for an entity in "Related To" field
   - Types "John Doe" → finds employee, contact, lead
   - Types "ACME" → finds accounts, investment accounts
   - Types "EXP-123" → finds expense requests
5. Selects entity from dropdown
6. Assigns to employee(s)
7. Submits blink

### Viewing Blinks with Entity References

1. User opens EveryBox Outbox
2. Clicks on a blink to view details
3. **NEW**: "Related To" section displays:
   - Entity type badge (e.g., "account", "employee")
   - Entity name (e.g., "ACME Corp", "John Doe")
   - Link icon indicator

## Technical Details

### GraphQL Query Performance

- Parallel queries across all entity types
- Limit of 10 results per entity type (50 total max)
- Search pattern uses `_ilike` for case-insensitive matching
- Includes `isDeleted: false` filters
- Ordered by relevant fields (name, firstName, etc.)

### Data Flow

```
User Input → Debounce → GraphQL Search → Transform Results → Display Options
                ↓
          User Selects Entity
                ↓
          Form Submission → QuickTaskFlowService → CFlow API
                ↓
          Entity Reference Stored in Workflow Tags
                ↓
          EveryBox Outbox → transformFlow → Display Entity Reference
```

### Type Safety

- All entity types defined in `UniversalEntityType` union
- `UniversalEntityOption` interface for search results
- `Flow` interface extended with optional entity fields
- `QuickTaskFormData` interface includes entity references

## Future Enhancements

1. **Entity Navigation**: Implement `entityDisplayUrl` to allow clicking entity references to navigate to entity detail views
2. **Entity Icons**: Add more icon mappings for specific entity types
3. **Entity Preview**: Show entity quick-view on hover
4. **Multiple Entities**: Support linking multiple entities to a single blink
5. **Entity Suggestions**: AI-powered entity suggestions based on blink content
6. **Workflow Entities**: Add support for workflow/process instances
7. **Service Requests**: Include service requests once available in API

## Testing Checklist

- [ ] Search for CRM entities (accounts, leads, contacts, opportunities)
- [ ] Search for HR entities (employees, absences)
- [ ] Search for Finance entities (expenses, plans, items)
- [ ] Search for Investment entities (accounts, leads, opportunities)
- [ ] Create blink with entity reference
- [ ] Create blink without entity reference (optional field)
- [ ] View blink with entity reference in Outbox
- [ ] Verify entity reference persists in CFlow workflow
- [ ] Test multi-assignee blinks with entity references
- [ ] Test search performance with large result sets

## Files Modified

1. `/hooks/useUniversalEntitySearch.ts` - NEW
2. `/SearchableEntityCombobox.tsx` - NEW
3. `/types.ts` - UPDATED
4. `/QuickTaskFormFields.tsx` - UPDATED
5. `/QuickTaskForm.tsx` - UPDATED
6. `/services/QuickTaskFlowService.ts` - UPDATED
7. `/../../platform/apps/every-box/types/index.ts` - UPDATED
8. `/../../platform/apps/every-box/components/FlowDetailDialog.tsx` - UPDATED
9. `/../../platform/apps/every-box/hooks/useOutboxFlows.ts` - UPDATED

## Migration Notes

- **Backward Compatible**: Existing blinks without entity references continue to work
- **No Database Changes**: Entity references stored in existing CFlow tags field
- **No API Changes**: Uses existing CFlow template execution API
- **No Breaking Changes**: All entity reference fields are optional
