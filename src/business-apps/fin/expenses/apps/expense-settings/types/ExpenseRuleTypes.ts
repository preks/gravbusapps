export interface ExpenseRule {
  id: string
  code: string
  name?: string
  activeFrom: string
  activeTo?: string
  deductionLimit: boolean
  advancePaymentCode?: string
  standard?: boolean
  useLastCountry?: boolean
  useSingleCurrency?: boolean
  taxesCode?: string
  nonpayableCode?: string
  version?: number
  isDeleted: boolean
  createdAt?: string

  // Relations
  calculationType?: CatalogEntry
  country?: CatalogEntry
  currency?: CatalogEntry

  // Related rule configurations
  expenseRuleAllowanceCode?: ExpenseRuleAllowanceCode[]
  expenseRuleDeduction?: ExpenseRuleDeduction[]
  expenseRuleMileage?: ExpenseRuleMileage[]
  expenseRuleCustomField?: ExpenseRuleCustomField[]
}

export interface ExpenseRuleAssignment {
  id: string
  assignmentOrder: number
  cascading: boolean
  applicants: boolean
  activeFrom: string
  activeTo: string
  version?: number
  isDeleted: boolean
  createdAt?: string

  // Assignment target IDs
  expenseRuleId: string
  employeeId?: string
  companyId?: string
  organizationalUnitId?: string
  siteLocationId?: string

  // Relations
  expenseRule?: ExpenseRule
  company?: Company
  organizationalUnit?: OrganizationalUnit
  siteLocation?: SiteLocation
  employee?: Employee
  employmentType?: CatalogEntry
  contractType?: CatalogEntry
}

export interface MileageRule {
  id: string
  code: string
  name: string
  description?: string
  rateType: 'DISTANCE' | 'FIXED'
  rateAmount: number
  currency: string
  activeFrom: string
  activeTo: string
  version?: number
  isDeleted: boolean
  period?: string // Maps to MileageRulePeriod enum
}

export interface MileageRuleDetail {
  id: string
  mileageRuleId: string
  category: string
  rate: number
  currency: string
  minDistance?: number
  maxDistance?: number
  conditions?: string
  version?: number
}

export interface AllowanceRegionRule {
  id: string
  code: string
  name: string
  description?: string
  regionType: 'COUNTRY' | 'CITY' | 'CUSTOM'
  countryCode?: string
  cityName?: string
  activeFrom: string
  activeTo: string
  version?: number
  isDeleted: boolean
}

export interface AllowanceRegionRuleDetail {
  id: string
  allowanceRegionRuleId: string
  category: 'ACCOMMODATION' | 'MEAL' | 'TRANSPORT' | 'OTHER'
  allowanceType: 'PER_DAY' | 'PER_HOUR' | 'FIXED'
  amount: number
  currency: string
  conditions?: string
  version?: number
}

export interface Company {
  id: string
  name: string
}

export interface OrganizationalUnit {
  id: string
  name: string
}

export interface SiteLocation {
  id: string
  name: string
  countryRef?: string
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email?: string
}

export interface CatalogEntry {
  id: string
  value: string
  type?: string
  objectValue?: unknown
  translations?: Translation[]
  catalog?: {
    defaultLocale: string
  }
}

export interface Translation {
  localeCode: string
  value: string
}

// Enhanced interfaces for UI components
export interface EnhancedExpenseRuleAssignment extends ExpenseRuleAssignment {
  displayName: string
  ruleCode: string
  ruleName: string
  companyName?: string
  orgUnitName?: string
  locationName?: string
  employeeName?: string
  employmentTypeName?: string
  contractTypeName?: string
  effectivePeriod: string
  conflictStatus?: 'NONE' | 'WARNING' | 'ERROR'
  conflictMessage?: string
}

export interface RuleConflict {
  id: string
  type: 'PERIOD_OVERLAP' | 'ORDER_CONFLICT' | 'HIERARCHY_CONFLICT'
  severity: 'WARNING' | 'ERROR'
  message: string
  affectedRules: string[]
  resolution?: string
}

export interface RuleValidationResult {
  isValid: boolean
  conflicts: RuleConflict[]
  warnings: string[]
}

// Form interfaces
export interface ExpenseRuleAssignmentFormData {
  expenseRuleId: string
  assignmentOrder: number
  cascading: boolean
  activeFrom: string
  activeTo: string
  companyId?: string
  organizationalUnitId?: string
  siteLocationId?: string
  employeeId?: string
  employmentTypeRef?: string
  contractTypeRef?: string
}

export interface MileageRuleFormData {
  id?: string
  code: string
  name: string
  description?: string
  rateType: 'DISTANCE' | 'FIXED'
  rateAmount: number
  currency: string
  activeFrom: string
  activeTo: string
  version?: number
  details: MileageRuleDetailFormData[]
}

export interface MileageRuleDetailFormData {
  category: string
  rate: number
  currency: string
  minDistance?: number
  maxDistance?: number
  conditions?: string
}

export interface AllowanceRegionRuleFormData {
  id?: string
  code: string
  name: string
  description?: string
  regionType: 'COUNTRY' | 'CITY' | 'CUSTOM'
  countryCode?: string
  cityName?: string
  activeFrom: string
  activeTo: string
  version?: number
  details: AllowanceRegionRuleDetailFormData[]
}

export interface AllowanceRegionRuleDetailFormData {
  category: 'ACCOMMODATION' | 'MEAL' | 'TRANSPORT' | 'OTHER'
  allowanceType: 'PER_DAY' | 'PER_HOUR' | 'FIXED'
  amount: number
  currency: string
  conditions?: string
}

// API response types
export interface ExpenseRuleAssignmentResponse {
  ExpenseRuleAssignment: ExpenseRuleAssignment[]
  ExpenseRuleAssignmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface ExpenseRuleResponse {
  ExpenseRule: ExpenseRule[]
  ExpenseRuleAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface EmployeeResponse {
  Employee: Employee[]
  EmployeeAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface SaveExpenseRuleAssignmentInput {
  expenseRuleAssignment: {
    id?: string
    assignmentOrder: number
    version?: number
    cascading: boolean
    applicants: boolean
    employmentTypeRef?: string
    contractTypeRef?: string
    activeFrom: string
    activeTo: string
    expenseRule: string
    company?: string
    organizationalUnit?: string
    siteLocation?: string
    employee?: string
  }
  changeMode: 'INSERT' | 'UPDATE'
}

// Filter and search types
export interface ExpenseRuleAssignmentFilters {
  search?: string
  ruleCode?: string
  company?: string
  organizationalUnit?: string
  siteLocation?: string
  employmentType?: string
  contractType?: string
  employee?: string
  activeFrom?: string
  activeTo?: string
  standard?: boolean
  cascading?: boolean
}

export interface ExpenseRuleAssignmentQueryVariables {
  offset?: number
  limit?: number
  search?: string
  activeOnly?: boolean
  employeeId?: string
  companyId?: string
  expenseRuleId?: string
  filters?: ExpenseRuleAssignmentFilters
  orderBy?: any[]
}

export interface ExpenseRuleQueryVariables {
  offset?: number
  limit?: number
  search?: string
  activeOnly?: boolean
  ruleCode?: string
}

export interface EmployeeQueryVariables {
  offset?: number
  limit?: number
  search?: string
  structureId?: string
}

// Statistics types
export interface ExpenseSettingsStatistics {
  totalRules: number
  activeAssignments: number
  standardRules: number
  customRules: number
  mileageRules: number
  regionRules: number
  recentChanges: number
  conflictingRules: number
}

// Related rule configuration interfaces
export interface ExpenseRuleAllowanceCode {
  id: string
  code: string
  amount: number
  abroad?: boolean // Maps to TravelLocation enum
  allowanceType?: string // Maps to AllowanceType enum
  calculation?: string
  codeOrder: number
  activeFrom: string
  activeTo?: string
  version?: number
  isDeleted: boolean
}

export interface ExpenseRuleDeduction {
  id: string
  deductBreakfast: boolean
  deductLunch: boolean
  deductDinner: boolean
  taxBreakfast: boolean // ✅ ADDED: Tax information for breakfast
  taxLunch: boolean // ✅ ADDED: Tax information for lunch
  taxDinner: boolean // ✅ ADDED: Tax information for dinner
  deductionDay?: string // Maps to DeductionDay enum (FIRST_DAY, LAST_DAY, DAYS_BETWEEN, etc.)
  deductionOrder: number
  overnightAllowance: boolean
  activeFrom: string
  activeTo?: string
  version?: number
  isDeleted: boolean
  additionalProperties?: Record<string, any>
  businessKey?: string
  express1?: Record<string, any>
  express2?: Record<string, any>
}

export interface ExpenseRuleMileage {
  id: string
  code: string
  mileageOrder?: number
  unitPrice?: number
  taxValue?: number
  activeFrom: string
  activeTo?: string
  version?: number
  isDeleted: boolean
}

export interface ExpenseRuleCustomField {
  id: string
  fieldName: string
  fieldValue: string
  fieldType: string
  ruleSource?: string // Maps to RuleSource enum
  fieldOrder: number
  activeFrom: string
  activeTo?: string
  version?: number
  isDeleted: boolean
}

export interface ExpenseRuleGeneralExpense {
  id: string
  code: string
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  taxValue?: number
  activeFrom: string
  activeTo?: string
  version?: number
  isDeleted?: boolean

  // Relations
  expenseGroup?: ExpenseGroupWithTranslations
}

export interface ExpenseGroupWithTranslations {
  id: string
  value: string
  code: string
  translations?: {
    value: string
    localeCode: string
  }[]
}

export interface EnhancedExpenseRuleMileage extends ExpenseRuleMileage {
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  wageCode?: string
  additionalProperties?: Record<string, any>
  businessKey?: string

  // Relations
  expenseGroup?: ExpenseGroupWithTranslations
  measurementUnit?: MeasurementUnitWithTranslations
  mileageRule?: {
    id: string
    name: string
    code: string
  }
}

export interface MeasurementUnitWithTranslations {
  id: string
  value: string
  code: string
  translations?: {
    value: string
    localeCode: string
  }[]
}
