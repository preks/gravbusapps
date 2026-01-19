# Expenses Launcher - Permission-Based Role Views

This expenses launcher supports different views based on user roles determined through **permission-based authentication** following the same pattern as the HR Employee Record app. The system uses the existing `usePermissionCheck` hook with AuthorizationClient for secure, accurate role detection.

## Role Detection Method

### Permission-Based Authentication ✅

The system uses **AuthorizationClient** via the `useExpensePermissions` hook, following the established HR app pattern with **actual SpiceDB schema**:

- **Finance Role**: Requires `employee_expense/configuration` read permission (br_expense_admin)
- **Manager Role**: Requires `employee_expense/expense_request` approve permission (br_expense_specialist or br_hcm_manager)
- **Employee Role**: Default role with basic `employee_expense/expense_item` read access (br_user)

Role detection is **automatically determined** from the user's access token permissions using real permission checks.

## Business Role Mapping

### SpiceDB Business Roles → UI Roles:

- **`br_expense_admin`** → Finance View (configuration access)
- **`br_expense_specialist`** → Manager View (approve expenses/plans)
- **`br_hcm_manager`** → Manager View (approve expenses/plans)
- **`br_user`** → Employee View (personal expenses only)

## Supported Roles

### Employee View (Default)

- **Role**: `employee` (br_user)
- **Layout**: 3-column grid with 6 cards
- **Features**:
  - Personal expense management cards
  - Quick actions section
  - Header stats display

### Manager View

- **Role**: `manager` (br_expense_specialist, br_hcm_manager)
- **Layout**: 2x2 centered grid with 4 cards
- **Features**:
  - Personal Expenses Card with monthly KPI
  - Team Expenses Card with team monthly KPI
  - My Expense Analytics Card
  - Team Expense Analytics Card
  - Simplified header display

### Finance View

- **Role**: `finance` (br_expense_admin)
- **Layout**: Same as manager view (2x2 grid)
- **Features**: Same as manager view with additional financial access

## Manager/Finance View Cards

### 1. Personal Expenses Card

- **KPI**: Personal monthly expenses (€2,450 default)
- **Links**:
  - Expense Items
  - Expense Plans
  - Advance Payments
  - Expense Requests
- **Button**: "Go to Personal Expenses"

### 2. Team Expenses Card

- **KPI**: Team monthly expenses (€18,750 default)
- **Links**:
  - Team Expense Items
  - Team Expense Plans
  - Team Advance Payments
  - Team Expense Requests
- **Button**: "Go to Team Expenses"

### 3. My Expense Analytics Card

- **KPI**: Active reports count (12 default)
- **Button**: "View My Analytics"

### 4. Team Expense Analytics Card

- **KPI**: Active reports count (12 default)
- **Button**: "View Team Analytics"

## Testing Different Views

Role determination is automatic based on the user's access token permissions. To test different views, use different user accounts with varying permission sets:

- **Finance View**: Login with an account that has `br_expense_admin` role
- **Manager View**: Login with an account that has `br_expense_specialist` or `br_hcm_manager` role
- **Employee View**: Login with a standard employee account (`br_user` role)

## Permission Configuration

Role permissions are configured using the actual SpiceDB schema:

```typescript
const expensePermissionMap: Record<string, ResourcePermissionMap> = {
  personalExpenses: {
    domain: 'employee_expense',
    resource: 'expense_item',
    permission: 'read'
  },
  expenseApproval: {
    domain: 'employee_expense',
    resource: 'expense_request',
    permission: 'approve'
  },
  expensePolicyManagement: {
    domain: 'employee_expense',
    resource: 'configuration',
    permission: 'read'
  }
  // ... more permissions
}
```

## SpiceDB Schema Reference

The expense launcher uses the following SpiceDB definitions:

- `employee_expense/expense_request`: Request approvals and management
- `employee_expense/expense_plan`: Budget planning and approvals
- `employee_expense/expense_item`: Individual expense entries
- `employee_expense/configuration`: System configuration (admin only)

**Business Role Permissions**:

- `br_user`: Basic read/create access to personal expenses
- `br_expense_specialist`: Approve and manage team expenses
- `br_hcm_manager`: Approve expenses with HR oversight
- `br_expense_admin`: Full configuration and system management

## Development Architecture

The expenses launcher follows the same permission pattern as the HR Employee Record app:

- **Hook**: `useExpensePermissions` (mirrors `useEmployeePermissions`)
- **Base**: Uses `usePermissionCheck` from `@/common/hooks/usePermissionCheck`
- **Client**: AuthorizationClient for permission checking
- **Schema**: Real SpiceDB employee_expense domain permissions

## Debugging Permission Checks

Enable browser console to see detailed permission checking logs from the `usePermissionCheck` hook:

- Permission requests being sent to the API
- Permission responses received
- Role determination based on granted permissions
- Feature access decisions

## Development Notes

- Manager/Finance cards use orange theming (`#F97316`)
- Employee cards use category-based theming (blue, green, purple)
- Manager/Finance view uses 2x2 responsive grid
- Employee view uses 3-column responsive grid
- All actions log to console for debugging
- **Architecture**: Follows established HR app permission patterns
- **Extensible**: Easy to add new roles and permissions

## Future Enhancements

- [ ] Implement actual navigation for manager actions
- ✅ ~~Add permission-based role detection using AuthorizationClient~~
- ✅ ~~Follow HR app permission architecture pattern~~
- ✅ ~~Replace placeholder permissions with real schema~~
- [ ] Connect to real KPI data sources
- [ ] Add more granular permissions for specific features
- [ ] Implement team member selection for team views
- [ ] Add role-specific permission caching
