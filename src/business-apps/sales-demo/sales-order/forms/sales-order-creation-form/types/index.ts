// TypeScript interfaces for Sales Order Creation Form

export type CreationMethod = 'quote' | 'ai' | 'manual'

export interface Quote {
  id: string
  quoteNumber: string
  quoteName: string
  customer: {
    id: string
    name: string
  }
  totalAmount: number
  currency: string
  createdDate: string
  validUntil?: string
  status: 'Draft' | 'Pending' | 'Approved' | 'Expired'
  items: QuoteItem[]
}

export interface QuoteItem {
  id: string
  lineNumber: number
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  product?: {
    id: string
    name: string
    code?: string
  }
}

export interface Customer {
  id: string
  name: string
  ownerEmployee?: {
    displayName: string
  }
  email?: string
  phone?: string
  addresses?: CustomerAddress[]
}

export interface CustomerAddress {
  id: string
  type: 'billing' | 'shipping'
  street: string
  city: string
  postalCode: string
  country: string
}

export interface Product {
  id: string
  name: string
  productNumber?: string
  description?: string
  price: number
  priceBase?: string
  currentCost?: number
  currentCostBase?: string
  supplierName?: string
  currency?: string
  category?: string
  // Legacy fields for backward compatibility
  code?: string
  unitPrice?: number
}

export interface SalesOrderLineItem {
  id?: string
  productId?: string
  product?: Product
  description: string
  quantity: number
  unitPrice: number
  unitCost?: number
  discountType?: 'fixed' | 'percentage'
  discountValue?: number
  discountAmount?: number
  grossAmount?: number // Before discount
  totalAmount: number // After discount
  lineNumber: number
}

export interface SalesOrderFormData {
  // Customer information
  customerId: string
  customer?: Customer
  contactId?: string

  // Order details
  orderDate: string
  requestedShippingDate?: string
  requestedReceiptDate?: string

  // Line items
  items: SalesOrderLineItem[]

  // Totals
  grossAmount?: number // Before discounts
  totalDiscount?: number // Total discount amount
  totalDiscountPercentage?: number // Total discount as percentage
  totalCost?: number // Sum of all unit costs
  subtotal: number // After discounts, before tax
  taxAmount: number
  totalAmount: number // Final total including tax
  currency: string

  // Additional information
  notes?: string
  internalNotes?: string

  // Reference information (for quote conversion)
  quoteId?: string
  quotationNumber?: string
}

export interface AIGenerationRequest {
  textInput?: string
  fileUpload?: File
  instructions?: string
}

export interface AIGenerationResponse {
  success: boolean
  orderData?: Partial<SalesOrderFormData>
  error?: string
  confidence?: number
}

export interface FormStep {
  key: string
  title: string
  description?: string
  completed: boolean
  current: boolean
}

export interface CreationFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: (orderId: string) => void
  initialData?: Partial<SalesOrderFormData>
}

export interface StepProps {
  formData: SalesOrderFormData
  onUpdate: (data: Partial<SalesOrderFormData>) => void
  onNext: () => void
  onPrevious: () => void
  onCancel: () => void
}

export interface QuoteSelectionStepProps extends StepProps {
  selectedQuote?: Quote
  onQuoteSelect: (quote: Quote) => void
}

export interface AIGenerationStepProps extends StepProps {
  aiRequest: AIGenerationRequest
  onAIRequestUpdate: (request: Partial<AIGenerationRequest>) => void
  onGenerate: () => void
  isGenerating: boolean
  generationResult?: AIGenerationResponse
}

export interface ManualCreationStepProps extends StepProps {
  currentSubStep: number
  onSubStepChange: (step: number) => void
}

export interface CustomerSelectionStepProps extends StepProps {
  selectedCustomer?: Customer
  onCustomerSelect: (customer: Customer) => void
}

export interface OrderDetailsStepProps extends StepProps {}

export interface LineItemsStepProps extends StepProps {
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  onUpdateItem: (index: number, item: Partial<SalesOrderLineItem>) => void
}

export interface ReviewStepProps extends StepProps {
  onSubmit: () => void
  isSubmitting: boolean
}

// Error types
export interface FormError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: FormError[]
}
