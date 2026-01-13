/**
 * Shared types for Pipeline Data across CRM and IRM modules
 */

export interface UsePipelineDataReturn {
  pipelineData: any
  isLoading: boolean
  error: string | null
  refetch: () => void
  availableCurrencies: string[]
}
