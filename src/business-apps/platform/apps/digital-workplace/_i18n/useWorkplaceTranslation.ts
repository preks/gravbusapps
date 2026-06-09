import { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import workplaceI18n from './index'

/**
 * Translations are merged into a single shared Fluent bundle across all apps in
 * the platform, where duplicate message ids resolve to the first registration.
 * To avoid collisions (e.g. the chat app also defines `reminders-title`), every
 * Digital Workplace key is namespaced with `dw-` in the FTL files. This hook
 * prepends that prefix transparently so call sites can use clean keys.
 */
const PREFIX = 'dw-'

export function useWorkplaceTranslation() {
  const { t, tAttr, locale } = useTranslation(workplaceI18n)

  const tx = useMemo(() => (key: string, args?: Record<string, unknown>) => t(`${PREFIX}${key}`, args), [t])

  return { t: tx, tAttr, locale }
}
