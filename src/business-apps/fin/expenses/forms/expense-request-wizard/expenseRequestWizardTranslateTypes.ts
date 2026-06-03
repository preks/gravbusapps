export type ExpenseRequestWizardTranslationVars = Record<string, string | number>

export type ExpenseRequestWizardTranslateFn = {
  (key: string): string
  (key: string, fallback: string): string
  (key: string, vars: ExpenseRequestWizardTranslationVars): string
}
