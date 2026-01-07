export interface EmployeeBonusData {
  employee: string
  employeeBonusTypeRef: string | null
  amount: number
  currencyRef: string
  paymentDate: string | null
  fiscalYear: number | null
  description: string | null
  notes: string | null
  status?: string
}

export interface BonusGrantPayload {
  employeeBonus: EmployeeBonusData
  employeeId?: string
  initiatorEmployeeId?: string
}

export interface BonusDisplayItem {
  key: string
  label: string
  value: string
}
