# Compensation Feature

Employee compensation management including salary, bonuses, benefits, and growth tracking.

## Structure

- **views/** - Main tab views (Current, History, Growth)
- **components/** - Reusable sub-components organized by view (current, history, growth, modals, form-fields)
- **hooks/** - Data fetching hooks (useCompensationData, useBenefitsCatalog)
- **queries/** - GraphQL query definitions (compensationQueries, benefitCatalogQueries)
- **types/** - TypeScript interfaces and enums
- **constants/** - Configuration and validation rules (benefitFormValidation, benefitDeactivationReasons)
- **utils/** - Helper functions (dateUtils, mockCompensationGrowthData)

**Note:** Translations are shared at the employee-record level in `_i18n/` (260 keys in each: en-US, de-DE, ro-RO)

## Features

- **Current Compensation** - Base salary, bonuses YTD, benefits catalog
- **Compensation History** - Historical salary changes, bonus payments, payslips
- **Growth Timeline** - Compensation growth over time with career milestones

## Usage

```typescript
import { CompensationTab } from './components/tabs/compensation'

<CompensationTab
  employee={employee}
  accessToken={accessToken}
  userInfo={userInfo}
/>
```

## Data Sources

- EmployeeWorkingCondition (salary data)
- CompensationBand (salary bands and pay grades)
- EmployeeBonus (bonus payments)
- EmployeeBenefit (benefits and perks)
- EmployeePayslip (monthly payslips)
