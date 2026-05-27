import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'

import expenseRequestWizardTranslations from './_i18n'
import type {
  ExpenseRequestWizardTranslateFn,
  ExpenseRequestWizardTranslationVars
} from './expenseRequestWizardTranslateTypes'

export type {
  ExpenseRequestWizardTranslateFn,
  ExpenseRequestWizardTranslationVars
} from './expenseRequestWizardTranslateTypes'

function isMissingTranslation(key: string, value: string): boolean {
  return value.length === 0 || value === key
}

export function useExpenseRequestWizardTranslation() {
  const { t: fluentT, locale } = useTranslation(expenseRequestWizardTranslations)

  const t = useCallback<ExpenseRequestWizardTranslateFn>(
    (key: string, second?: string | ExpenseRequestWizardTranslationVars) => {
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
