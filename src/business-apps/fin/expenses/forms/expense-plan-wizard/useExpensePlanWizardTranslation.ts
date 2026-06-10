import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'

import expensePlanWizardTranslations from './_i18n'
import type { ExpensePlanWizardTranslateFn, ExpensePlanWizardTranslationVars } from './expensePlanWizardTranslateTypes'

export type { ExpensePlanWizardTranslateFn, ExpensePlanWizardTranslationVars } from './expensePlanWizardTranslateTypes'

function isMissingTranslation(key: string, value: string): boolean {
  return value.length === 0 || value === key
}

export function useExpensePlanWizardTranslation() {
  const { t: fluentT } = useTranslation(expensePlanWizardTranslations)

  const t = useCallback<ExpensePlanWizardTranslateFn>(
    (key: string, second?: string | ExpensePlanWizardTranslationVars) => {
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

  return { t }
}
