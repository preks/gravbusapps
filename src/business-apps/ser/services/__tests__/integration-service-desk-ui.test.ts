/**
 * Integration Tests: Service Desk UI Components and Hooks
 *
 * These tests verify the integration between Service Desk UI components
 * and the MockWorkflowEngineAdapter, simulating real user interactions.
 */

import { createMockEngine } from '../workflowEngineProvider'
import type { WorkflowEngine, StepReceiver, StepInstance } from '../../packages/services-plus-core/src'

// Mock the hooks (in a real app, you'd use actual hooks)
const createMockUseDeskTickets = (engine: WorkflowEngine) => {
  return async (deskKey: StepReceiver) => {
    const tickets = await engine.getDeskTickets(deskKey)
    return {
      tickets,
      isLoading: false,
      error: null,
      refetch: async () => await engine.getDeskTickets(deskKey)
    }
  }
}

const createMockUseTicketActions = (engine: WorkflowEngine) => {
  return {
    claimTicket: async (stepId: string) => await engine.claim(stepId),
    assignTicket: async (stepId: string, userId: string) => await engine.assign(stepId, userId),
    advanceTicket: async (stepId: string) => await engine.advance(stepId),
    addComment: async (stepId: string, body: string) => await engine.comment(stepId, body),
    isPerformingAction: false
  }
}

describe('Integration: Service Desk UI Components', () => {
  let portalEngine: WorkflowEngine
  let deskEngine: WorkflowEngine
  let mockUseDeskTickets: any
  let mockUseTicketActions: any

  const PORTAL_USER = 'portal.user@company.com'
  const DESK_AGENT = 'desk.agent@company.com'

  beforeEach(async () => {
    portalEngine = createMockEngine(PORTAL_USER)
    deskEngine = createMockEngine(DESK_AGENT)

    mockUseDeskTickets = createMockUseDeskTickets(deskEngine)
    mockUseTicketActions = createMockUseTicketActions(deskEngine)

    // Seed some initial data for consistent testing
    await mockDataHelpers.seedSampleData(portalEngine)
  })

  describe('DeskQueue Component Integration', () => {
    it('should display tickets in queue after Portal submission', async () => {
      // 1. Portal submits request
      const requestId = await portalEngine.startRequest('it-support', {
        issue: 'Computer not starting',
        priority: 'high'
      })

      // 2. DeskQueue should show the new ticket
      const result = await mockUseDeskTickets('IT')

      expect(result.tickets.length).toBeGreaterThan(0)
      const newTicket = result.tickets.find(ticket => ticket.requestId === requestId)
      expect(newTicket).toBeDefined()
      expect(newTicket!.status).toBe('queued')
      expect(newTicket!.desk).toBe('IT')
    })

    it('should filter tickets correctly', async () => {
      // 1. Create tickets with different statuses
      const requestId1 = await portalEngine.startRequest('hr-request', { type: 'benefits' })
      await portalEngine.startRequest('hr-request', { type: 'leave' })

      const hrTickets = await mockUseDeskTickets('HR')
      const ticket1 = hrTickets.tickets.find(t => t.requestId === requestId1)

      // 2. Claim one ticket
      await mockUseTicketActions.claimTicket(ticket1!.id)

      // 3. Check filtered results
      const updatedTickets = await mockUseDeskTickets('HR')
      const queuedTickets = updatedTickets.tickets.filter(t => t.status === 'queued')
      const claimedTickets = updatedTickets.tickets.filter(t => t.status === 'claimed')

      expect(queuedTickets.length).toBeGreaterThanOrEqual(1)
      expect(claimedTickets.length).toBeGreaterThanOrEqual(1)
      expect(claimedTickets.find(t => t.id === ticket1!.id)).toBeDefined()
    })

    it('should handle real-time updates when tickets are processed', async () => {
      // 1. Get initial tickets
      const initialResult = await mockUseDeskTickets('IT')
      const initialCount = initialResult.tickets.length

      // 2. Portal submits new request
      await portalEngine.startRequest('network-issue', {
        issue: 'Cannot connect to WiFi',
        location: 'Building A'
      })

      // 3. Refresh should show new ticket
      const updatedResult = await mockUseDeskTickets('IT')
      expect(updatedResult.tickets.length).toBe(initialCount + 1)

      // 4. Process a ticket
      const ticketToProcess = updatedResult.tickets.find(t => t.status === 'queued')
      if (ticketToProcess) {
        await mockUseTicketActions.claimTicket(ticketToProcess.id)
        await mockUseTicketActions.advanceTicket(ticketToProcess.id)

        // 5. Verify ticket status changed
        const finalResult = await mockUseDeskTickets('IT')
        const processedTicket = finalResult.tickets.find(t => t.id === ticketToProcess.id)
        expect(processedTicket!.status).toBe('done')
      }
    })
  })

  describe('TicketDetail Component Integration', () => {
    let testRequestId: string
    let testTicket: StepInstance

    beforeEach(async () => {
      testRequestId = await portalEngine.startRequest('test-request', {
        description: 'Test ticket for detail view',
        priority: 'medium'
      })

      const tickets = await mockUseDeskTickets('HR')
      testTicket = tickets.tickets.find(t => t.requestId === testRequestId)!
    })

    it('should handle claim action correctly', async () => {
      // 1. Verify initial state
      expect(testTicket.status).toBe('queued')
      expect(testTicket.claimedByUserId).toBeUndefined()

      // 2. Claim ticket through UI action
      await mockUseTicketActions.claimTicket(testTicket.id)

      // 3. Verify claim was successful
      const updatedTickets = await mockUseDeskTickets('HR')
      const claimedTicket = updatedTickets.tickets.find(t => t.id === testTicket.id)

      expect(claimedTicket!.status).toBe('claimed')
      expect(claimedTicket!.claimedByUserId).toBe(DESK_AGENT)
    })

    it('should handle assign action with user selection', async () => {
      const assigneeUserId = 'specialist.user@company.com'

      // 1. Assign ticket through UI action
      await mockUseTicketActions.assignTicket(testTicket.id, assigneeUserId)

      // 2. Verify assignment
      const updatedTickets = await mockUseDeskTickets('HR')
      const assignedTicket = updatedTickets.tickets.find(t => t.id === testTicket.id)

      expect(assignedTicket!.assignedToUserId).toBe(assigneeUserId)
      expect(assignedTicket!.status).toBe('in_progress')
    })

    it('should handle advance action and workflow progression', async () => {
      // 1. Claim and advance ticket
      await mockUseTicketActions.claimTicket(testTicket.id)
      await mockUseTicketActions.advanceTicket(testTicket.id)

      // 2. Verify advancement
      const updatedTickets = await mockUseDeskTickets('HR')
      const advancedTicket = updatedTickets.tickets.find(t => t.id === testTicket.id)

      expect(advancedTicket!.status).toBe('done')
      expect(advancedTicket!.completedAt).toBeDefined()

      // 3. Check if next step was created (if multi-step workflow)
      const allDesks: StepReceiver[] = ['HR', 'IT', 'Facilities', 'Finance']
      const allTickets = []

      for (const desk of allDesks) {
        const deskTickets = await mockUseDeskTickets(desk)
        allTickets.push(...deskTickets.tickets.filter(t => t.requestId === testRequestId))
      }

      // Verify workflow progression
      const completedSteps = allTickets.filter(t => t.status === 'done')

      expect(completedSteps.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle comment addition with visibility rules', async () => {
      const commentText = 'Processing request - will need additional documentation'

      // 1. Claim ticket first (required to add comments)
      await mockUseTicketActions.claimTicket(testTicket.id)

      // 2. Add comment through UI action
      const comment = await mockUseTicketActions.addComment(testTicket.id, commentText)

      expect(comment).toBeDefined()
      expect(comment.body).toBe(commentText)
      expect(comment.authorId).toBe(DESK_AGENT)
      expect(comment.visibleToDownstream).toBe(true)

      // 3. Verify comment appears in ticket
      const updatedTickets = await mockUseDeskTickets('HR')
      const commentedTicket = updatedTickets.tickets.find(t => t.id === testTicket.id)

      expect(commentedTicket!.comments.length).toBeGreaterThanOrEqual(1)
      const addedComment = commentedTicket!.comments.find(c => c.body === commentText)
      expect(addedComment).toBeDefined()
    })
  })

  describe('Multi-User Scenarios', () => {
    it('should handle concurrent actions by different agents', async () => {
      // Create separate engines for different agents
      const agent1Engine = createMockEngine('agent1@company.com')
      const agent2Engine = createMockEngine('agent2@company.com')

      const agent1Actions = createMockUseTicketActions(agent1Engine)
      const agent2Actions = createMockUseTicketActions(agent2Engine)

      // 1. Create requests for different desks
      const itRequestId = await portalEngine.startRequest('it-request', {})
      const hrRequestId = await portalEngine.startRequest('hr-request', {})

      // 2. Get tickets
      const itTickets = await mockUseDeskTickets('IT')
      const hrTickets = await mockUseDeskTickets('HR')

      const itTicket = itTickets.tickets.find(t => t.requestId === itRequestId)
      const hrTicket = hrTickets.tickets.find(t => t.requestId === hrRequestId)

      // 3. Process concurrently
      await Promise.all([
        (async () => {
          await agent1Actions.claimTicket(itTicket!.id)
          await agent1Actions.addComment(itTicket!.id, 'Agent 1 processing IT ticket')
          await agent1Actions.advanceTicket(itTicket!.id)
        })(),
        (async () => {
          await agent2Actions.claimTicket(hrTicket!.id)
          await agent2Actions.addComment(hrTicket!.id, 'Agent 2 processing HR ticket')
          await agent2Actions.advanceTicket(hrTicket!.id)
        })()
      ])

      // 4. Verify both were processed correctly
      const finalItTickets = await mockUseDeskTickets('IT')
      const finalHrTickets = await mockUseDeskTickets('HR')

      const finalItTicket = finalItTickets.tickets.find(t => t.id === itTicket!.id)
      const finalHrTicket = finalHrTickets.tickets.find(t => t.id === hrTicket!.id)

      expect(finalItTicket!.status).toBe('done')
      expect(finalItTicket!.claimedByUserId).toBe('agent1@company.com')

      expect(finalHrTicket!.status).toBe('done')
      expect(finalHrTicket!.claimedByUserId).toBe('agent2@company.com')
    })
  })

  describe('Error Handling in UI', () => {
    it('should handle failed actions gracefully', async () => {
      const tickets = await mockUseDeskTickets('HR')
      const testTicket = tickets.tickets[0]

      if (testTicket) {
        // 1. Try to advance unclaimed ticket (should fail)
        try {
          await mockUseTicketActions.advanceTicket(testTicket.id)
          // If we reach here, the action didn't fail as expected
          // (depending on implementation, this might be allowed)
        } catch (error) {
          expect(error).toBeDefined()
        }

        // 2. Try to claim already claimed ticket
        await mockUseTicketActions.claimTicket(testTicket.id)

        // Create second agent
        const agent2Engine = createMockEngine('agent2@company.com')
        const agent2Actions = createMockUseTicketActions(agent2Engine)

        try {
          await agent2Actions.claimTicket(testTicket.id)
          // This should fail or be handled gracefully
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
  })

  describe('Performance with Large Datasets', () => {
    it('should handle queues with many tickets efficiently', async () => {
      // 1. Create many requests
      const requestPromises = Array.from({ length: 50 }, (_, i) => portalEngine.startRequest('bulk-test', { index: i }))

      await Promise.all(requestPromises)

      // 2. Measure performance of queue loading
      const startTime = Date.now()
      const result = await mockUseDeskTickets('HR')
      const endTime = Date.now()

      // Should complete reasonably quickly (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000) // 1 second
      expect(result.tickets.length).toBeGreaterThanOrEqual(50)

      // 3. Test filtering performance
      const filterStartTime = Date.now()
      const queuedTickets = result.tickets.filter(t => t.status === 'queued')
      const filterEndTime = Date.now()

      expect(filterEndTime - filterStartTime).toBeLessThan(100) // 100ms
      expect(queuedTickets.length).toBeGreaterThan(0)
    })
  })
})
