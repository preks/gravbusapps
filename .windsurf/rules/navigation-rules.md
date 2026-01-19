---
description: When navigating to different URLs. Whenever the code is changing the URL.
alwaysApply: false
---

# Navigation Utility Rules for NEWWORK Gravity Business Apps

## ALWAYS Use Navigation Utility - Never use window.location.href directly

IMPORT:
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

BAD:
window.location.href = '/platform/crm/leads-overview';

GOOD:
navigateTo('/platform/crm/leads-overview');

## URL Types

Platform URLs (converted to query parameters in development):

- /platform/crm/\*
- /platform/fin/\*
- /platform/hr/\*
- /platform/employee-record

Non-Platform URLs (unchanged in all environments):

- /orgchart/\*
- External URLs (http://, https://)

## URL Building Patterns

Simple URLs (no parameters):
navigateTo('/platform/crm/leads-overview');

URLs with parameters:
const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: record.id });
navigateTo(url);

Multiple parameters:
const url = buildPlatformUrl('/platform/employee-record', {
employeeId: employee.id,
tab: 'personal-info'
});
navigateTo(url);

## URL Mapping (when adding new platform URLs)

You MUST ALWAYS check this object for the URL mappings.

Add to src/common/utils/navigationUtils.ts:
const PLATFORM_URL_TO_APP_MAPPING = {
'/platform/crm/leads-overview': 'LeadsOverview',
'/platform/crm/lead-record': 'LeadRecord',
'/platform/fin/expenses/expense-plan-record': 'ExpensePlanRecord',
'/platform/employee-record': 'EmployeeRecord',
};

## Environment Behavior

- Development: Platform URLs → Query parameters (?app=AppName&param=value)
- Production: All URLs → Original behavior (window.location.href)

## MANDATORY RULES:

1. ALWAYS use navigateTo() instead of window.location.href
2. ALWAYS import from @/common/utils/navigationUtils
3. ALWAYS use buildPlatformUrl() for URLs with parameters
4. ALWAYS update URL mapping when adding new platform URLs
5. NEVER assume environment - let the utility handle it
6. NEVER use direct window navigation for platform URLs
7. TEST both development and production navigation behavior
