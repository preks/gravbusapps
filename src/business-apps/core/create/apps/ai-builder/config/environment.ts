/**
 * Environment Configuration for AI Builder
 */

import { env } from '@/common/env/EnvUtils'

const BASE_URL = (env('NEXT_PUBLIC_BASE_URL') || '').replace(/\/+$/, '')

export const ENV = {
  AI_SERVICE_API_URL: env('NEXT_PUBLIC_AI_BUILDER_API_URL') || `${BASE_URL}/ai-builder`
}
