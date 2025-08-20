import { MockWorkflowEngineAdapter } from './MockWorkflowEngineAdapter';
import type { WorkflowEngine } from 'packages/services-plus-core';

/**
 * Singleton instance of the workflow engine
 */
let workflowEngineInstance: WorkflowEngine | null = null;

/**
 * Create a new MockWorkflowEngineAdapter instance
 * @param currentUserId - Optional user ID for the engine context
 * @returns New MockWorkflowEngineAdapter instance
 */
export function createMockEngine(currentUserId?: string): MockWorkflowEngineAdapter {
  return new MockWorkflowEngineAdapter(currentUserId);
}

/**
 * Get or create singleton WorkflowEngine instance
 * Used by both Service Desk and Portal apps
 * @param currentUserId - Optional user ID for initial setup
 * @returns Singleton WorkflowEngine instance
 */
export function getWorkflowEngine(currentUserId?: string): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = createMockEngine(currentUserId);
  }
  return workflowEngineInstance;
}

/**
 * Set a custom WorkflowEngine instance (useful for testing)
 * @param engine - WorkflowEngine instance to use
 */
export function setWorkflowEngine(engine: WorkflowEngine): void {
  workflowEngineInstance = engine;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetWorkflowEngine(): void {
  workflowEngineInstance = null;
}

/**
 * Hook to get WorkflowEngine instance in React components
 * @param currentUserId - Optional user ID for engine context
 * @returns WorkflowEngine instance
 */
export function useWorkflowEngine(currentUserId?: string): WorkflowEngine {
  return getWorkflowEngine(currentUserId);
}

/**
 * Mock data helpers for development and testing
 */
export const mockDataHelpers = {
  /**
   * Seed the engine with sample data
   */
  async seedSampleData(engine: WorkflowEngine): Promise<void> {
    if (!(engine instanceof MockWorkflowEngineAdapter)) {
      console.warn('seedSampleData only works with MockWorkflowEngineAdapter');
      return;
    }

    // Seed with sample requests
    try {
      const requestId1 = await engine.startRequest('new-hardware-request', {
        hardwareType: 'Laptop',
        justification: 'Current laptop is 5 years old and failing',
        urgency: 'High',
      });

      const requestId2 = await engine.startRequest('new-hardware-request', {
        hardwareType: 'Monitor',
        justification: 'Dual monitor setup for productivity',
        urgency: 'Medium',
      });

      // Simulate some step progression
      const tickets = await engine.getDeskTickets('HR');
      if (tickets.length > 0) {
        await engine.claim(tickets[0].id);
        await engine.comment(tickets[0].id, 'Reviewing request for compliance');
      }

      console.log('Sample data seeded:', { requestId1, requestId2 });
    } catch (error) {
      console.error('Error seeding sample data:', error);
    }
  },

  /**
   * Clear all data from mock engine
   */
  clearData(engine: WorkflowEngine): void {
    if (engine instanceof MockWorkflowEngineAdapter) {
      engine.clearAllData();
    }
  },
};
