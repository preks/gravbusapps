# DataController Column Visibility Integration

The `DataController` component now includes built-in column visibility functionality, eliminating the need for individual `ColumnVisibilityDropdown` components in each view.

## ✨ New Features

### Built-in Column Visibility

- **Centralized**: Column visibility is now part of the `DataController` component
- **Optional**: Enable only when needed via the `columnVisibility` prop
- **Consistent**: Same UI/UX across all tables using DataController
- **Simplified**: No need to import and manage separate dropdown components

## 🔧 Usage

### Basic Usage

```tsx
import { DataController, ColumnConfig } from '@/components/dataController'

// 1. Define your column configuration
const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
  { id: 'actions', label: 'Actions', visible: true, disabled: true },
  { id: 'name', label: 'Name', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'phone', label: 'Phone', visible: false },
  { id: 'address', label: 'Address', visible: false }
])

// 2. Handle column visibility changes
const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
  setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
}, [])

// 3. Pass to DataController
;<DataController
  // ... existing props
  columnVisibility={{
    columns: columnConfig,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    'data-testid': 'my-table-column-visibility'
  }}
/>
```

### Migration from Individual Components

#### ❌ Before (Individual Component)

```tsx
import { ColumnVisibilityDropdown } from './components/ColumnVisibilityDropdown'
;<DataContainer
  dataControllerProps={{
    // ... other props
    actions: [
      <ColumnVisibilityDropdown
        key="column-visibility"
        columns={columnConfig}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        data-testid="account-list-column-visibility"
      />
    ]
  }}
/>
```

#### ✅ After (Built-in)

```tsx
<DataContainer
  dataControllerProps={{
    // ... other props
    columnVisibility: {
      columns: columnConfig,
      onColumnVisibilityChange: handleColumnVisibilityChange,
      'data-testid': 'account-list-column-visibility'
    }
    // actions: [], // Remove the manual dropdown from actions
  }}
/>
```

## 🎯 Types

### ColumnConfig

```tsx
interface ColumnConfig {
  id: string // Unique column identifier
  label: string // Display name in dropdown
  visible: boolean // Current visibility state
  disabled?: boolean // Optional: prevent hiding (e.g., Actions column)
}
```

### ColumnVisibilityConfig

```tsx
interface ColumnVisibilityConfig {
  columns: ColumnConfig[]
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void
  'data-testid'?: string
}
```

## 🔄 Integration with Tables

### 1. Define Column Configuration

```tsx
const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
  { id: 'actions', label: 'Actions', visible: true, disabled: true },
  { id: 'company', label: 'Account', visible: true },
  { id: 'contact', label: 'Contact Info', visible: true },
  { id: 'created', label: 'Creation Date', visible: true },
  { id: 'owner', label: 'Owner', visible: true },
  // Optional columns
  { id: 'website', label: 'Website', visible: false },
  { id: 'country', label: 'Country', visible: false },
  { id: 'phone', label: 'Phone', visible: false }
])
```

### 2. Get Visible Columns for Table

```tsx
const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id)
```

### 3. Pass to Table Component

```tsx
<MyTable
  visibleColumns={visibleColumns}
  // ... other props
/>
```

### 4. Filter Related Components (Optional)

```tsx
// Filter filter groups based on visible columns
const visibleFilterGroups = useMemo(() => {
  const columnToFilterMap: Record<string, string> = {
    company: 'company',
    contact: 'contactInfo',
    created: 'creationDate'
    // ... other mappings
  }

  return filterGroups.filter(group => {
    const correspondingColumn = Object.keys(columnToFilterMap).find(
      columnId => columnToFilterMap[columnId] === group.id
    )
    return !correspondingColumn || visibleColumns.includes(correspondingColumn)
  })
}, [filterGroups, visibleColumns])
```

## 🎨 UI Features

### Visual Indicators

- **Column Icon**: Shows columns icon with count `(visible/total)`
- **Eye Icons**: Green eye for visible, gray eye for hidden columns
- **Disabled State**: Gray text + "(Required)" for disabled columns
- **Counter**: Shows "X of Y columns visible" at bottom

### Responsive Design

- **Mobile**: Icon only, no "Columns" text
- **Desktop**: Full "Columns (X/Y)" text
- **Dropdown**: Fixed width (224px) with proper alignment

## 🧪 Testing

### Test IDs

The component automatically generates test IDs for easy testing:

```tsx
// Main trigger button
data-testid="{your-testid}-trigger"

// Dropdown content
data-testid="{your-testid}-content"

// Individual column items
data-testid="{your-testid}-item-{columnId}"
```

### Example Test

```tsx
// Test column visibility toggle
await user.click(screen.getByTestId('my-table-column-visibility-trigger'))
await user.click(screen.getByTestId('my-table-column-visibility-item-website'))

// Verify column is now visible
expect(mockOnColumnVisibilityChange).toHaveBeenCalledWith('website', true)
```

## 📋 Best Practices

### 1. Always Include Actions Column

```tsx
{ id: "actions", label: "Actions", visible: true, disabled: true }
```

### 2. Set Sensible Defaults

- Core columns: `visible: true`
- Optional details: `visible: false`
- Required columns: `disabled: true`

### 3. Use Descriptive Labels

```tsx
// ✅ Good
{ id: "createdAt", label: "Creation Date", visible: true }

// ❌ Avoid
{ id: "createdAt", label: "createdAt", visible: true }
```

### 4. Consistent Column IDs

Match your table column keys exactly:

```tsx
// Table column
{ key: 'website', title: 'Website', ... }

// Column config
{ id: 'website', label: 'Website', visible: false }
```

## 🔧 Backwards Compatibility

The new `columnVisibility` prop is **optional**. Existing DataController usage continues to work unchanged:

```tsx
// This still works exactly as before
<DataController
  search={search}
  setSearch={setSearch}
  filter={filters}
  setFilter={setFilter}
  actions={existingActions}
  // No columnVisibility = no column dropdown
/>
```

## 🚀 Benefits

1. **DRY Principle**: No duplicated ColumnVisibilityDropdown components
2. **Consistency**: Same UI/UX across all tables
3. **Maintainability**: Updates to column visibility UI affect all tables
4. **Simplicity**: Less imports and setup code
5. **Performance**: Built-in memoization and optimization
6. **Type Safety**: Full TypeScript support with proper interfaces

## 📝 Migration Checklist

When updating existing views:

- [ ] Remove individual `ColumnVisibilityDropdown` imports
- [ ] Remove `ColumnVisibilityDropdown` from `actions` prop
- [ ] Add `columnVisibility` prop to `DataController`
- [ ] Update test IDs if necessary
- [ ] Test column visibility functionality
- [ ] Verify table responds to column changes correctly

---

**Note**: This feature is designed to replace all individual `ColumnVisibilityDropdown` components used throughout the CRM views and other modules. The centralized approach ensures consistency and reduces maintenance overhead.
