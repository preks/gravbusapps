/**
 * Configuration utilities for Every API
 */

import { env } from '@/common/env/EnvUtils'

export interface EveryApiConfig {
  cflowEndpoint: string
  flowMetricsEndpoint: string
  defaultTimeout: number
  enablePartialResults: boolean
}

export function getCflowEndpoint(): string {
  const endpoint = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
  return endpoint
}

export function getFlowMetricsEndpoint(): string {
  const endpoint = env('NEXT_PUBLIC_FLOW_METRICS_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL')
  if (!endpoint) {
    return ''
  }
  return endpoint
}

export function getApiConfig(): EveryApiConfig {
  return {
    cflowEndpoint: getCflowEndpoint(),
    flowMetricsEndpoint: getFlowMetricsEndpoint(),
    defaultTimeout: 30000,
    enablePartialResults: true
  }
}

export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const cflowEndpoint = getCflowEndpoint()
  const flowMetricsEndpoint = getFlowMetricsEndpoint()

  if (!cflowEndpoint || cflowEndpoint === 'https://newwork-dev.newwork.com/flow-engine') {
    warnings.push('Custom Flow Engine endpoint using default (https://newwork-dev.newwork.com/flow-engine)')
  }

  if (!flowMetricsEndpoint) {
    warnings.push('FlowMetrics endpoint not configured - Kogito tasks will not be available')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
