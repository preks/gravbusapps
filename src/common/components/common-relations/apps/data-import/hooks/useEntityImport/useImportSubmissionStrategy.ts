/**
 * React hooks that produce a memoized `ImportSubmissionStrategy` for a given
 * `ImportConfig`. CRM and IRM wrappers call their respective hook and inject
 * the result into `useEntityImport` — the core hook never picks a strategy
 * itself, which keeps it fully domain-agnostic.
 *
 * Separate hooks per domain keep each wrapper's dependency on the "other"
 * domain's code zero, even though both factories live in the same folder.
 */

import { useMemo } from 'react'
import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { createCrmImportStrategy } from './crm'
import { createHrImportStrategy } from './hr'
import { createIrmImportStrategy } from './irm'
import type { ImportSubmissionStrategy } from './types'

export function useCrmImportSubmissionStrategy(config: ImportConfig): ImportSubmissionStrategy {
  return useMemo(() => createCrmImportStrategy(config), [config])
}

export function useIrmImportSubmissionStrategy(config: ImportConfig): ImportSubmissionStrategy {
  return useMemo(() => createIrmImportStrategy(config), [config])
}

export function useHrImportSubmissionStrategy(config: ImportConfig): ImportSubmissionStrategy {
  return useMemo(() => createHrImportStrategy(config), [config])
}
