import { env } from '@/common/env/EnvUtils'

/**
 * Onboarding Employee app constants.
 * Tag used for filtering cases and flows in the flow-engine.
 */

export const ONBOARDING_APP_TAG = 'AppCatalog:1:HR_ONBOARDING'

export const APP_TAGS = {
  app: ONBOARDING_APP_TAG
} as const

/** Flow engine API base: built from NEXT_PUBLIC_BASE_URL so it can be set per env (e.g. dev URL). */
export const FLOW_ENGINE_API_BASE = `${env('NEXT_PUBLIC_BASE_URL')}/flow-engine/api`
