export interface ExpenseRecordAllowance {
  allowanceDate: string
  travelRegion: {
    value: string
  }
  dayRate: number
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  overnight: boolean
  overnightAccommodation: boolean
  deductionLimit: number
}

export interface ExpenseRecordTrip {
  tripOrder: number
  tripDateTime: string
  tripDirection: string
  address: string
  pointType: string
  country: {
    value: string
  }
  travelRegion: {
    value: string
  }
}

export interface ExpenseRecordAdvancePayment {
  code: string | null
  description: string | null
  decisionDate: string | null
  amount: number
  currency: {
    code: string
  }
  paymentMethod: string
  status: string
  transactionDate: string | null
  transactionNumber: string | null
  transactionConfirmed: boolean
}

export type ExpenseRecordI18nPrefix = 'expense-plan-record' | 'expense-request-record'

export type ExpenseRecordTranslations = Record<'en-US' | 'de-DE' | 'ro-RO', string>
