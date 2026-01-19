import { ConductorWorkflowEngineAdapter } from './ConductorWorkflowEngineAdapter'
import type { WorkflowEngine } from '../packages/services-plus-core/src'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Singleton instance of the workflow engine
 */
let workflowEngineInstance: WorkflowEngine | null = null

/**
 * Create a new ConductorWorkflowEngineAdapter instance
 * @param context - BusinessAppContext with accessToken and userInfo
 * @returns New ConductorWorkflowEngineAdapter instance
 */
export function createConductorEngine(context: BusinessAppContextProps): ConductorWorkflowEngineAdapter {
  return new ConductorWorkflowEngineAdapter(context)
}

/**
 * Get or create singleton WorkflowEngine instance
 * Always uses ConductorWorkflowEngineAdapter for real live data
 * @param context - BusinessAppContext with accessToken and userInfo
 * @returns Singleton ConductorWorkflowEngineAdapter instance
 */
export function getWorkflowEngine(context: BusinessAppContextProps): WorkflowEngine {
  if (!workflowEngineInstance) {
    console.log('🔧 Creating ConductorWorkflowEngineAdapter instance')
    workflowEngineInstance = createConductorEngine(context)
  }
  return workflowEngineInstance
}

/**
 * Set a custom WorkflowEngine instance (useful for testing)
 * @param engine - WorkflowEngine instance to use
 */
export function setWorkflowEngine(engine: WorkflowEngine): void {
  workflowEngineInstance = engine
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetWorkflowEngine(): void {
  workflowEngineInstance = null
}

/**
 * Update the current user context (no-op for ConductorWorkflowEngineAdapter)
 * ConductorWorkflowEngineAdapter uses context from BusinessAppContextProps
 * @param userId - User ID (ignored in live data mode)
 */
export function setWorkflowEngineCurrentUser(userId: string): void {
  // No-op: ConductorWorkflowEngineAdapter uses context from BusinessAppContextProps
  // This function is preserved for backward compatibility
  console.log('🔧 setWorkflowEngineCurrentUser called (no-op in live data mode):', userId)
}

/**
 * Hook to get WorkflowEngine instance in React components
 * @param context - BusinessAppContext with accessToken and userInfo
 * @returns ConductorWorkflowEngineAdapter instance
 */
export function useWorkflowEngine(context: BusinessAppContextProps): WorkflowEngine {
  return getWorkflowEngine(context)
}

/**
 * Mock data helpers (no-op for live data mode)
 * Preserved for backward compatibility
 */
export const mockDataHelpers = {
  /**
   * Seed the engine with sample data (no-op in live data mode)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async seedSampleData(_engine: WorkflowEngine): Promise<void> {
    console.log('🔧 mockDataHelpers.seedSampleData called (no-op in live data mode)')
    // No-op: Live data mode doesn't seed mock data
  },

  /**
   * Clear all data from engine (no-op in live data mode)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearData(_engine: WorkflowEngine): void {
    console.log('🔧 mockDataHelpers.clearData called (no-op in live data mode)')
    // No-op: Live data mode doesn't manage mock data
  }
}
