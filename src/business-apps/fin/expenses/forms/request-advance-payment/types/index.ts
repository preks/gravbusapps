export interface RequestAdvancePaymentFormData {
  expensePlanId: string
  amount: number
  currency: string
  costCenter: string
  paymentMethod: string
  notes?: string
}

export interface RequestAdvancePaymentProps {
  isOpen?: boolean
  onClose?: () => void
  expensePlanId?: string
  onSuccess?: (data: RequestAdvancePaymentFormData) => void
  onError?: (error: string) => void
}

export interface AdvancePaymentRequest {
  expensePlanId: string
  amount: number
  currency: string
  costCenterId: string
  paymentMethodId: string
  description?: string
  employeeId: string
}

export interface AdvancePaymentResponse {
  id: string
  code: string
  status: string
  amount: number
  currency: string
  createdAt: string
  expensePlan: {
    id: string
    code: string
    title: string
  }
}
