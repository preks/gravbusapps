import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'

import expenseItemTranslations from './_i18n'

function isMissingTranslation(key: string, value: string): boolean {
  return value.length === 0 || value === key
}

export type ExpenseItemTranslationVars = Record<string, string | number>

export type ExpenseItemTranslateFn = {
  (key: string): string
  (key: string, fallback: string): string
  (key: string, vars: ExpenseItemTranslationVars): string
}

export function useExpenseItemTranslation() {
  const { t: fluentT, locale } = useTranslation(expenseItemTranslations)

  const t = useCallback<ExpenseItemTranslateFn>(
    (key: string, second?: string | ExpenseItemTranslationVars) => {
      if (typeof second === 'string') {
        const value = fluentT(key)
        if (isMissingTranslation(key, value)) {
          return second
        }
        return value
      }

      if (second !== undefined) {
        return fluentT(key, second)
      }

      const value = fluentT(key)
      if (isMissingTranslation(key, value)) {
        return key
      }
      return value
    },
    [fluentT]
  )

  return { t, locale }
}
