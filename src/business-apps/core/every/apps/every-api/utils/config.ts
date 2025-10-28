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
  const endpoint = env('NEXT_PUBLIC_CFLOW_ENDPOINT') || env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_ENDPOINT')
  if (!endpoint) {
    console.warn('Custom Flow Engine endpoint not configured. Using default.')
    return 'http://localhost:3000'
  }
  return endpoint
}

export function getFlowMetricsEndpoint(): string {
  const endpoint = env('NEXT_PUBLIC_FLOW_METRICS_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL')
  if (!endpoint) {
    console.warn('FlowMetrics endpoint not configured.')
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

  if (!cflowEndpoint || cflowEndpoint === 'http://localhost:3000') {
    warnings.push('Custom Flow Engine endpoint using default (http://localhost:3000)')
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
