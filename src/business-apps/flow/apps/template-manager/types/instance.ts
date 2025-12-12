/**
 * Flow Engine Instance Type Definitions
 * Represents a custom-flow-engine instance (DEV, STAGING, PROD)
 */

export interface FlowEngineInstance {
  id: string
  name: string
  code: 'DEV' | 'STAGING' | 'PROD'
  baseUrl: string
  apiKey: string
  environment: string
  color: string
  icon: string
  description?: string
  order: number
  isHealthy?: boolean
  lastChecked?: Date
}
