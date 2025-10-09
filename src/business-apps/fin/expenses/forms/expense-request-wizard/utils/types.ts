import { BusinessAppContextProps } from '@/business-apps/types'

export interface LocationData {
  id: string
  name: string
  isAbroad: boolean
  location: string
  departureDate: Date | undefined
  departureTime: Date | undefined
  isCollapsed: boolean
  travelRegionRef?: string
}

export interface MaxDateTimeLimits {
  maxDate?: Date | undefined
  maxTime?: Date | undefined
}

export interface MinDateTimeLimits {
  minDate?: Date | undefined
  minTime?: Date | undefined
}

export type DateTimeLimits = MinDateTimeLimits & MaxDateTimeLimits

export interface DestinationLimit {
  [key: string]: DateTimeLimits
}

/**
 * Trip data interface
 */
export interface TripData {
  address: string
  tripDateTime: string
  pointType: string
  tripDirection: string
  costCenter: string
  expensePlan: string
  tripOrder: number
  travelRegionRef: string
  countryRef: string
  expenseRequest: string
  project: string
  allowanceRegionRuleDetail: string
  [key: string]: any
}

/**
 * Expense item interface for log object
 */
export interface ExpenseItemData {
  id: string
  code: string
  title: string
  ruleId: string
  expenseRequest: string
  costCenter: string
  project: string
  expenseGroupRef: string
  source: string
  expenseClassRef: string
  autoCalculated: boolean
}

/**
 * Log object interface
 */
export interface LogObject {
  stepKey: string
  event: string
  expenseRequest: {
    id: any
    startDate: any
    endDate: any
    expenseRule: string
    version: any
    description: string
    costCenter: any
    employee: any
    expensePlan: any
    title: any
    status: any
    requestDate: string
    requestTypeRef: any
    additionalProperties: any
    currencyRef: any
    overnightAccommodation?: boolean
  }
  expenseRequestTrips?: {
    expenseTrips: TripData[] | any[]
  }
  expenseRequestItems?: {
    expenseItems: ExpenseItemData[] | any[]
  }
  travelBreakdownWrapper?: {
    travelBreakdowns: any[]
  }
}

export interface TripScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

export interface LocationFormLabels {
  inputFieldLabel?: string
  dateFieldLabel?: string
  timeFieldLabel?: string
}

/**
 * CostCenter interface
 */
export interface CostCenter {
  id: string
  name: string
  structureId: string
}
