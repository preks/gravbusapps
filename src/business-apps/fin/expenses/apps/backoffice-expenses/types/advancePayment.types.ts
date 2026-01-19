export interface AdvancePaymentItem {
  id: string
  code?: string
  description?: string
  status: string
  title?: string
  employeeDisplayName?: string
  employeeFullName?: string
  employeePictureThumbnail?: string
  startDate?: string
  endDate?: string
  amount?: number
  paymentMethod?: string
  currency?: {
    code: string
  }
  costCenter?: {
    name: string
  }
  expensePlan?: {
    id: string
    code: string
    title: string
    startDate: string
    totalAmount: number
    employee?: {
      id: string
      firstName: string
      lastName: string
      employeePosition?: {
        organizationalUnit?: {
          name: string
        }
      }
    }
    currency?: {
      code: string
      id: string
    }
  }
}

export interface AdvancePaymentStatisticsData {
  totalAmount: number | null
}
