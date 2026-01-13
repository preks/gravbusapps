import { AllowanceRegionRule, TravelRegion } from '../../queries'

export interface EditableCell {
  id?: string // detail ID for existing, undefined for new
  travelRegionId: string
  allowanceRegionRuleId: string
  amount: number
  currencyCode: string
  currencyRef?: string // Full currency catalog entry ID
  countryRef?: string // Full country catalog entry ID (required for API)
  activeFrom: string
  activeTo?: string
  version?: number // Version for optimistic locking
  isNew: boolean
  isModified: boolean
  hasError?: boolean
  errorMessage?: string
  // Additional fields for validation
  validityPeriodId?: string // To group cells with same validity period
}

export interface EditableTravelRegion extends TravelRegion {
  isEditing: boolean
  editingCode: string
  editingValue: string
  isModified: boolean
  isNew: boolean
}

export interface EditableAllowanceRegionRule extends AllowanceRegionRule {
  validityPeriods: ValidityPeriod[]
}

export interface ValidityPeriod {
  id: string
  activeFrom: string
  activeTo?: string
  currencyCode: string
  hasConflict: boolean
  ruleId: string // Track which rule this period belongs to
}

export interface CurrencyOption {
  id: string
  code: string
  value: string
}

export interface UsageInfo {
  isUsed: boolean
  usedIn: {
    expenseAllowanceCount?: number
    expenseRequestTripCount?: number
    expenseRequestTripTimeCount?: number
    expenseRuleAllowanceCodes?: any[]
    expensePlans?: number
    expenseRequests?: number
    expensePlanItems?: number
    expenseItems?: number
    expensePositions?: number
  }
  message: string
}

/**
 * Shared callback signatures for matrix cell operations
 * Used by MatrixRegionRow and MatrixRuleCell to reduce duplication
 */
export interface MatrixCellCallbacks {
  onEnterCellEdit: (cellId: string) => void
  onExitCellEdit: () => void
  onRemoveNewCell: (validityPeriodId: string, ruleId: string) => void
  onUpdateCellField: (cellId: string, validityPeriodId: string, field: string, value: any) => void
  onSaveSingleCell: (cell: EditableCell) => void
  onDeleteCell: (cellId: string, getExpenseSettingsClient: () => any) => Promise<void>
  onAddNewCell: (
    rule: any,
    region: any,
    editableCells: EditableCell[],
    currencies: any[],
    setAllowanceRegionRules: React.Dispatch<React.SetStateAction<any[]>>,
    setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>,
    allowanceRegionRules: any[]
  ) => void
}

/**
 * Shared state props for matrix cell editing
 * Used by MatrixRegionRow and MatrixRuleCell to reduce duplication
 */
export interface MatrixCellState {
  editingCellId: string | null
  editingCellUsageInfo: { isUsed: boolean; usedIn: Record<string, unknown>; message: string } | null
  isCheckingCellUsage: boolean
  isSavingCell: boolean
}

/**
 * Shared data props for matrix cell components
 * Used by MatrixRegionRow and MatrixRuleCell to reduce duplication
 */
export interface MatrixCellDataProps {
  currencies: Array<{ id: string; code: string; value: string }>
  countries: Array<{ id: string; code: string; value: string }>
  editableCells: EditableCell[]
  setAllowanceRegionRules: React.Dispatch<React.SetStateAction<any[]>>
  setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  allowanceRegionRules: any[]
  getExpenseSettingsClient: () => any
  prefixDataTestId: string
}
