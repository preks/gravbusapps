export type ExpensePlanWizardTranslationVars = Record<string, string | number>

export type ExpensePlanWizardTranslateFn = {
  (key: string): string
  (key: string, fallback: string): string
  (key: string, vars: ExpensePlanWizardTranslationVars): string
}
