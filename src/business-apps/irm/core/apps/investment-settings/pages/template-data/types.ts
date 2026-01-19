export interface DocumentTemplate {
  id: string
  code: string
  value: string
  description?: string
  htmlContent: string
  isActive: boolean
  displayOrder?: number
  alternativeCode?: string
}

export interface DocumentTemplateFormData {
  code: string
  value: string
  description?: string
  htmlContent: string
  isActive: boolean
  displayOrder?: number
  alternativeCode?: string
}
