import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'

import expensePlanItemTranslations from './_i18n'

function isMissingTranslation(key: string, value: string): boolean {
  return value.length === 0 || value === key
}

export type ExpensePlanItemTranslationVars = Record<string, string | number>

export type ExpensePlanItemTranslateFn = {
  (key: string): string
  (key: string, fallback: string): string
  (key: string, vars: ExpensePlanItemTranslationVars): string
}

const DATA_FETCHER_KEY_MAP: Record<string, string> = {
  'expense-item-error-expense-types': 'process-error-expense-types',
  'expense-item-error-custom-groups': 'process-error-expense-custom-groups',
  'expense-item-error-expense-group': 'process-error-expense-group',
  'expense-item-error-flows': 'error-flows-message'
}

export function useExpensePlanItemTranslation() {
  const { t: fluentT } = useTranslation(expensePlanItemTranslations)

  const t = useCallback<ExpensePlanItemTranslateFn>(
    (key: string, second?: string | ExpensePlanItemTranslationVars) => {
      const fluentKey = DATA_FETCHER_KEY_MAP[key] ?? key

      if (typeof second === 'string') {
        const value = fluentT(fluentKey)
        if (isMissingTranslation(fluentKey, value)) {
          return second
        }
        return value
      }

      if (second !== undefined) {
        return fluentT(fluentKey, second)
      }

      const value = fluentT(fluentKey)
      if (isMissingTranslation(fluentKey, value)) {
        return key
      }
      return value
    },
    [fluentT]
  )

  return { t }
}
