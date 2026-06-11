export interface DiscardEntityRecord {
  id: string
  title?: string
}

export interface DiscardExpenseEntityDialogLabels {
  title: string
  description: string
  descriptionWithTitle: string
  cancelButton: string
  confirmButton: string
  submitting: string
}

export type TranslateFn = (key: string, vars?: Record<string, unknown>) => string
