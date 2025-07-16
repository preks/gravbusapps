# ExpenseSettings App - Development Documentation

## Overview
The ExpenseSettings app is a comprehensive expense management configuration system that allows administrators to define, manage, and assign various types of expense rules within the NEWWORK platform.

## Source Material Analysis

### Key Data Models Identified
From the source JSON files, we identified several core data models:

#### 1. ExpenseRuleAssignment
- **Purpose**: Assigns expense rules to specific employees, organizational units, or groups
- **Key Fields**: 
  - `ruleCode`, `company`, `orgUnit`, `location`
  - `employmentType`, `contractType`, `employee`
  - `activeFrom`, `activeTo`, `assignmentOrder`
  - `cascading`, `standard`, `applicants`

#### 2. ExpenseRule (Calculation Rules)
- **Purpose**: Defines calculation logic for expense processing
- **Features**: Rule versioning, standard vs custom rules, calculation parameters

#### 3. MileageRule
- **Purpose**: Manages vehicle mileage calculation rules
- **Features**: Rate structures, vehicle types, distance calculations

#### 4. AllowanceRegionRule (Travel Rules)
- **Purpose**: Defines per-diem and allowance rules by geographic region
- **Features**: Regional rates, currency handling, travel categories

### API Integration Discovered

#### Process APIs (Employee-Expense Service)
```
Base URL: https://newwork-dev.newwork.com/processes/employee-expense/
```

**Rule Management Endpoints:**
- `POST /saveExpenseRuleAssignment` - Create rule assignments
- `PUT /saveExpenseRuleAssignment/{id}` - Update rule assignments
- `POST /saveMileageRule` - Create/update mileage rules
- `POST /saveAllowanceRegionRule` - Create/update travel region rules
- `POST /saveExpenseRuleOtherInfo` - General expense rule info
- `POST /saveExpenseRuleOtherCalc` - Expense calculation rules

**Calculation Endpoints:**
- `GET /getEmployeeRule/{employeeId}/{allowanceDate}` - Get applicable rules
- `GET /calculateAllowance/{requestId}` - Calculate allowances

#### GraphQL Data Access
- Complete `ExpenseRuleAssignment` queries with filtering, sorting, pagination
- Access to `ExpenseRule`, `MileageRule`, `AllowanceRegionRule` entities
- Rich relationship data (Employee, Company, Location, Contract/Employment Types)

#### Catalog Integration
- Employment Types, Contract Types via existing catalog hooks
- Currencies, Countries, Travel Regions
- Companies & Organizational Units

## Application Architecture

### Module Structure
```
src/business-apps/fin/expenses/apps/expense-settings/
├── ExpenseSettings.tsx                 # Main app entry point
├── index.ts
├── components/
│   ├── dashboard/
│   │   ├── ExpenseSettingsDashboard.tsx
│   │   ├── SettingsStatistics.tsx
│   │   └── QuickActions.tsx
│   ├── calculation-rules/
│   │   ├── CalculationRulesList.tsx
│   │   ├── CalculationRuleForm.tsx
│   │   └── RuleAssignmentManager.tsx
│   ├── mileage-rules/
│   │   ├── MileageRulesList.tsx
│   │   ├── MileageRuleForm.tsx
│   │   └── MileageRuleDetails.tsx
│   ├── travel-region-rules/
│   │   ├── TravelRegionRulesList.tsx
│   │   ├── TravelRegionRuleForm.tsx
│   │   └── RegionRuleDetails.tsx
│   └── shared/
│       ├── RuleFormComponents.tsx
│       ├── ValidationComponents.tsx
│       └── ConflictDetection.tsx
├── hooks/
│   ├── useExpenseRulesData.ts
│   ├── useMileageRulesData.ts
│   ├── useTravelRegionRulesData.ts
│   ├── useRuleAssignments.ts
│   └── useRuleValidation.ts
├── queries/
│   ├── ExpenseRuleQueries.ts
│   ├── MileageRuleQueries.ts
│   ├── TravelRegionRuleQueries.ts
│   └── RuleAssignmentQueries.ts
├── types/
│   ├── ExpenseRuleTypes.ts
│   ├── MileageRuleTypes.ts
│   └── ValidationTypes.ts
└── utils/
    ├── ruleValidation.ts
    ├── periodValidation.ts
    └── conflictDetection.ts
```

### Core Features

#### 1. Main Dashboard
- Statistics overview of active rules and assignments
- Quick actions for rule creation and management
- Navigation hub to different rule types
- Recent activity feed

#### 2. Expense Calculation Rules Module
- Rule management (CRUD operations)
- Assignment management with hierarchy support
- Period overlap validation
- Conflict detection and resolution

#### 3. Mileage Rules Module
- Vehicle type and rate management
- Distance-based calculations
- Regional rate variations
- Integration with expense calculations

#### 4. Travel Region Rules Module
- Geographic allowance regions
- Per-diem rate structures
- Multi-currency support
- Effective period management

#### 5. Advanced Features
- Rule conflict detection
- Bulk operations and templates
- Audit trail and versioning
- Impact analysis

### Technical Implementation Strategy

#### Data Integration Pattern
```typescript
export const useExpenseSettingsIntegration = (context: BusinessAppContextProps) => {
  // Parallel data fetching from GraphQL + Process APIs
  // Transform and enhance data with catalog information
  // Provide CRUD operations with optimistic updates
  // Handle loading states and error recovery
};
```

#### API Client Pattern
```typescript
export class ExpenseSettingsClient extends RestClient {
  // Rule management methods
  // Validation and conflict checking
  // Bulk operation support
}
```

## Development Progress

### ✅ Completed Tasks
- [x] Deep analysis of source material and data models
- [x] API exploration and endpoint discovery
- [x] Architecture design and module planning
- [x] Documentation creation

### ✅ Completed Tasks
- [x] Deep analysis of source material and data models
- [x] API exploration and endpoint discovery
- [x] Architecture design and module planning
- [x] Documentation creation
- [x] Data integration layer implementation
- [x] Core types and interfaces definition
- [x] GraphQL queries setup
- [x] Main app structure and navigation
- [x] Dashboard component implementation
- [x] Calculation rules list component

### 🔄 In Progress
- [ ] Main dashboard implementation (foundation complete)

### 📋 Pending Tasks
- [ ] Calculation rules module
- [ ] Mileage rules module
- [ ] Travel region rules module
- [ ] Shared components and utilities
- [ ] Advanced features (conflict detection, bulk ops)
- [ ] Analytics and reporting

## Implementation Notes

### Key Patterns to Follow
- **useCallback for all hook functions** - Prevent infinite re-renders
- **Parallel API calls** - Use Promise.all for data fetching
- **AppActionButton integration** - First column in all tables
- **WidgetGroup for statistics** - Consistent dashboard components
- **Error boundaries** - Graceful error handling
- **Loading states** - Skeleton loading and spinners

### Integration Points
- **Personal/Manager Expenses**: Apply configured rules
- **HR/Employee Data**: Automatic rule assignments
- **Financial Systems**: Multi-currency and cost center support

### Performance Considerations
- **Pagination** for large datasets
- **Debounced search** to reduce API calls
- **Optimistic updates** for better UX
- **Caching strategies** for reference data

---

*Last Updated: [Current Date]*
*Status: Development Phase 1 - Foundation* 