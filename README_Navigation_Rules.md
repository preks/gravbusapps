# Navigation Utility Rules for NEWWORK Gravity Business Apps

## Core Rules

### 1. Always Use Navigation Utility
```typescript
// ❌ BAD
window.location.href = '/platform/crm/leads-overview';

// ✅ GOOD
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
navigateTo('/platform/crm/leads-overview');
```

### 2. URL Types

**Platform URLs** (converted in development to query parameters):
- `/platform/crm/*`
- `/platform/fin/*` 
- `/platform/hr/*`
- `/platform/employee-record`

**Non-Platform URLs** (unchanged in all environments):
- `/orgchart/*`
- External URLs (`http://`, `https://`)

### 3. URL Building Patterns

```typescript
// Simple URLs (no parameters)
navigateTo('/platform/crm/leads-overview');

// URLs with parameters
const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: record.id });
navigateTo(url);

// Multiple parameters
const url = buildPlatformUrl('/platform/employee-record', { 
  employeeId: employee.id,
  tab: 'personal-info' 
});
navigateTo(url);
```

### 4. URL Mapping
Add new platform URLs to `src/common/utils/navigationUtils.ts`:

```typescript
const PLATFORM_URL_TO_APP_MAPPING = {
  '/platform/crm/leads-overview': 'LeadsOverview',
  '/platform/crm/lead-record': 'LeadRecord',
  '/platform/fin/expenses/expense-plan-record': 'ExpensePlanRecord',
  '/platform/employee-record': 'EmployeeRecord',
  // Add new mappings here
};
```

### 5. Environment Behavior
- **Development**: Platform URLs → Query parameters (`?app=AppName&param=value`)
- **Production**: All URLs → Original behavior (`window.location.href`)

## Rules Summary for AI Assistants

1. **ALWAYS** use `navigateTo()` instead of `window.location.href`
2. **ALWAYS** import from `@/common/utils/navigationUtils`
3. **ALWAYS** use `buildPlatformUrl()` for URLs with parameters
4. **ALWAYS** update URL mapping when adding new platform URLs
5. **NEVER** assume environment - let the utility handle it
6. **NEVER** use direct window navigation for platform URLs
7. **TEST** both development and production navigation behavior 