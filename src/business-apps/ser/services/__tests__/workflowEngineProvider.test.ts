import {
  createMockEngine,
  getWorkflowEngine,
  setWorkflowEngine,
  resetWorkflowEngine,
  useWorkflowEngine,
  mockDataHelpers
} from '../workflowEngineProvider'
import { MockWorkflowEngineAdapter } from '../MockWorkflowEngineAdapter'
import type { WorkflowEngine } from '../../packages/services-plus-core/src'

describe('WorkflowEngineProvider', () => {
  beforeEach(() => {
    resetWorkflowEngine()
  })

  afterEach(() => {
    resetWorkflowEngine()
  })

  describe('createMockEngine', () => {
    test('should create new MockWorkflowEngineAdapter instance', () => {
      const engine = createMockEngine('test-user')

      expect(engine).toBeInstanceOf(MockWorkflowEngineAdapter)
      expect(engine.getCurrentUserId()).toBe('test-user')
    })

    test('should create engine with default user if no userId provided', () => {
      const engine = createMockEngine()

      expect(engine).toBeInstanceOf(MockWorkflowEngineAdapter)
      expect(engine.getCurrentUserId()).toBeDefined()
    })

    test('should create separate instances each time', () => {
      const engine1 = createMockEngine('user1')
      const engine2 = createMockEngine('user2')

      expect(engine1).not.toBe(engine2)
      expect(engine1.getCurrentUserId()).toBe('user1')
      expect(engine2.getCurrentUserId()).toBe('user2')
    })
  })

  describe('Singleton Provider', () => {
    test('should return same instance on multiple calls', () => {
      const engine1 = getWorkflowEngine('test-user')
      const engine2 = getWorkflowEngine('different-user') // Should ignore different user

      expect(engine1).toBe(engine2)
      expect(engine1).toBeInstanceOf(MockWorkflowEngineAdapter)
    })

    test('should create new instance after reset', () => {
      const engine1 = getWorkflowEngine('test-user')
      resetWorkflowEngine()
      const engine2 = getWorkflowEngine('test-user')

      expect(engine1).not.toBe(engine2)
      expect(engine1).toBeInstanceOf(MockWorkflowEngineAdapter)
      expect(engine2).toBeInstanceOf(MockWorkflowEngineAdapter)
    })

    test('should allow setting custom engine instance', () => {
      const customEngine = createMockEngine('custom-user')
      setWorkflowEngine(customEngine)

      const retrievedEngine = getWorkflowEngine()
      expect(retrievedEngine).toBe(customEngine)
    })
  })

  describe('useWorkflowEngine Hook', () => {
    test('should return singleton instance', () => {
      const engine1 = useWorkflowEngine('test-user')
      const engine2 = useWorkflowEngine('test-user')

      expect(engine1).toBe(engine2)
    })

    test('should work with different user IDs but return same instance', () => {
      const engine1 = useWorkflowEngine('user1')
      const engine2 = useWorkflowEngine('user2')

      // Singleton behavior - same instance regardless of user ID on subsequent calls
      expect(engine1).toBe(engine2)
    })
  })

  describe('Mock Data Helpers', () => {
    test('should seed sample data successfully', async () => {
      const engine = createMockEngine('test-user')

      // Mock console.log to verify seeding
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await mockDataHelpers.seedSampleData(engine)

      // Verify data was seeded
      const myRequests = await engine.getMyRequests()
      expect(myRequests).toHaveLength(2)

      const hrTickets = await engine.getDeskTickets('HR')
      expect(hrTickets.length).toBeGreaterThan(0)

      // Check if one step was claimed and commented
      const request = await engine.getRequest(myRequests[0].id)
      const hrStep = request.steps.find(s => s.desk === 'HR')
      if (hrStep) {
        expect(hrStep.status).toBe('in_progress')
        expect(hrStep.comments.length).toBeGreaterThan(0)
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sample data seeded:',
        expect.objectContaining({
          requestId1: expect.any(String),
          requestId2: expect.any(String)
        })
      )

      consoleSpy.mockRestore()
    })

    test('should handle seeding with non-mock engine gracefully', async () => {
      const mockEngine: WorkflowEngine = {
        startRequest: jest.fn(),
        getRequest: jest.fn(),
        getMyRequests: jest.fn(),
        getDeskTickets: jest.fn(),
        claim: jest.fn(),
        assign: jest.fn(),
        advance: jest.fn(),
        comment: jest.fn()
      }

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await mockDataHelpers.seedSampleData(mockEngine)

      expect(consoleSpy).toHaveBeenCalledWith('seedSampleData only works with MockWorkflowEngineAdapter')

      consoleSpy.mockRestore()
    })

    test('should clear data from mock engine', () => {
      const engine = createMockEngine('test-user')
      const clearSpy = jest.spyOn(engine, 'clearAllData')

      mockDataHelpers.clearData(engine)

      expect(clearSpy).toHaveBeenCalled()
    })

    test('should handle clearing data from non-mock engine gracefully', () => {
      const mockEngine: WorkflowEngine = {
        startRequest: jest.fn(),
        getRequest: jest.fn(),
        getMyRequests: jest.fn(),
        getDeskTickets: jest.fn(),
        claim: jest.fn(),
        assign: jest.fn(),
        advance: jest.fn(),
        comment: jest.fn()
      }

      // Should not throw error
      expect(() => mockDataHelpers.clearData(mockEngine)).not.toThrow()
    })

    test('should handle seeding errors gracefully', async () => {
      const engine = createMockEngine('test-user')

      // Mock startRequest to throw error
      jest.spyOn(engine, 'startRequest').mockRejectedValue(new Error('Test error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await mockDataHelpers.seedSampleData(engine)

      expect(consoleSpy).toHaveBeenCalledWith('Error seeding sample data:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Provider Integration', () => {
    test('should coordinate between Service Desk and Portal apps', async () => {
      // Simulate Service Desk getting engine
      const serviceDeskEngine = getWorkflowEngine('service-desk-user')

      // Create a request from Service Desk context
      const requestId = await serviceDeskEngine.startRequest('new-hardware-request', {
        hardwareType: 'Monitor',
        justification: 'Dual screen setup',
        urgency: 'Low'
      })

      // Simulate Portal app getting same engine instance
      const portalEngine = getWorkflowEngine('portal-user')

      // Both should be the same instance
      expect(serviceDeskEngine).toBe(portalEngine)

      // Portal should see the request created by Service Desk
      const request = await portalEngine.getRequest(requestId)
      expect(request.formData.hardwareType).toBe('Monitor')

      // Service Desk should see tickets in queue
      const tickets = await serviceDeskEngine.getDeskTickets('HR')
      expect(tickets.some(t => t.requestId === requestId)).toBe(true)
    })

    test('should maintain state across app boundaries', async () => {
      const engine1 = getWorkflowEngine('user1')

      // Create and modify data
      const requestId = await engine1.startRequest('new-hardware-request', {
        hardwareType: 'Laptop',
        justification: 'Development',
        urgency: 'High'
      })

      const tickets = await engine1.getDeskTickets('HR')
      await engine1.claim(tickets[0].id)
      await engine1.comment(tickets[0].id, 'Processing request')

      // Get engine from different context
      const engine2 = getWorkflowEngine('user2')

      // Should see the same state
      const request = await engine2.getRequest(requestId)
      const hrStep = request.steps.find(s => s.desk === 'HR')

      expect(hrStep?.status).toBe('in_progress')
      expect(hrStep?.comments).toHaveLength(1)
      expect(hrStep?.comments[0].body).toBe('Processing request')
    })
  })
})
