# Expense Plan Details Drawer - Personal vs Manager Comparison

## Key Differences

### 1. **Status Badge Component**
**Personal Expenses:**
- Uses `Pill` component with `type`, `label`, `color` props
- Status alongside AppActionButton

**Manager Expenses:**
- Uses `Badge` component with complex conditional `variant` mapping
- Manual mapping of pill types to badge variants

### 2. **Text Colors**
**Personal Expenses:**
- Headers: `gba:text-gray-900`
- Body text: `gba:text-gray-700`
- Code/subtitle: `gba:text-gray-500`
- Icons: `gba:text-gray-500`

**Manager Expenses:**
- Headers: `gba:text-foreground`
- Body text: `gba:text-foreground`
- Code/subtitle: `gba:text-muted-foreground`
- Icons: `gba:text-muted-foreground`

### 3. **AppActionButton**
**Personal Expenses:**
- ✅ Has AppActionButton in header with generateExpensePlanActions()
- Shows conditional actions based on status

**Manager Expenses:**
- ❌ Missing AppActionButton completely
- No actions available in details drawer

### 4. **Fields Shown**
**Personal Expenses:**
- Requester (employee name)
- Manager (supervisor name)
- Cost Center
- Project
- Trip Type
- Total Amount
- Advance Payment (if > 0)

**Manager Expenses:**
- Requester (employee name)
- Department
- Location
- Trip Type
- Total Amount

### 5. **Icons**
**Personal Expenses:**
- Uses: `PiCalendarDuotone`, `PiClock`, `PiPath`, `PiArrowRight`

**Manager Expenses:**
- Uses: `PiCalendarDuotone`, `PiClock`, `PiArrowRight`
- Missing: `PiPath` (for decision date)

### 6. **Decision Date**
**Personal Expenses:**
- ✅ Shows decision date if available

**Manager Expenses:**
- ❌ Missing decision date field

## Changes Needed for Manager Expenses

### 1. Replace Badge with Pill
```tsx
// BEFORE:
<Badge variant={...complex mapping...}>
  {getExpensePlanStatusDisplay(selectedItem.status).label}
</Badge>

// AFTER:
{(() => {
  const statusConfig = getExpensePlanStatusDisplay(selectedItem.status);
  return <Pill type={statusConfig.type} label={statusConfig.label} color={statusConfig.color} />;
})()}
```

### 2. Update Text Colors
```tsx
// Headers:
gba:text-foreground → gba:text-gray-900

// Body text:
gba:text-foreground → gba:text-gray-700

// Code/subtitle:
gba:text-muted-foreground → gba:text-gray-500

// Icons:
gba:text-muted-foreground → gba:text-gray-500
```

### 3. Add AppActionButton
Add after the Pill component in header section (lines 53-92 from personal expenses)

### 4. Add Decision Date Field
Add after Plan Date field (lines 119-127 from personal expenses)

### 5. Add Missing Fields (if data available)
- Manager/Supervisor
- Cost Center
- Project
- Advance Payment

## Files to Modify
- `src/business-apps/fin/expenses/apps/manager-expenses/components/tabs/expense-plans-tab/ExpensePlanDetails.tsx`

