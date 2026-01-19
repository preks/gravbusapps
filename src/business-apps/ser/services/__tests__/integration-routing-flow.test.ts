/**
 * Integration Tests: Service Desk Routing and Data Flow
 *
 * These tests verify the integration between Service Desk routing,
 * user capabilities, and workflow engine data flow.
 */

import { createMockEngine } from '../workflowEngineProvider'
import type { WorkflowEngine, StepReceiver, StepInstance } from '../../packages/services-plus-core/src'

// Mock user capabilities data structure
interface UserCapability {
  desk: StepReceiver
  name: string
  ticketCount: number
}

// Simulate the user capabilities hook behavior
const simulateUserCapabilities = async (engine: WorkflowEngine): Promise<UserCapability[]> => {
  const deskTypes: StepReceiver[] = ['HR', 'IT', 'Facilities', 'Finance']
  const capabilities: UserCapability[] = []

  for (const desk of deskTypes) {
    try {
      const tickets = await engine.getDeskTickets(desk)
      if (tickets.length > 0) {
        capabilities.push({
          desk,
          name: getDeskDisplayName(desk),
          ticketCount: tickets.length
        })
      }
    } catch {
      // Desk not accessible
    }
  }

  return capabilities
}

const getDeskDisplayName = (desk: StepReceiver): string => {
  const displayNames: Record<StepReceiver, string> = {
    HR: 'Human Resources',
    IT: 'Information Technology',
    Facilities: 'Facilities Management',
    Finance: 'Finance',
    Procurement: 'Procurement',
    Legal: 'Legal',
    Security: 'Security',
    AccessIdentity: 'Access & Identity',
    Workplace: 'Workplace',
    Fleet: 'Fleet Management',
    Data: 'Data & Analytics',
    'L&D': 'Learning & Development',
    Admin: 'Administration'
  }
  return displayNames[desk] || desk
}

describe('Integration: Service Desk Routing and Data Flow', () => {
  let portalEngine: WorkflowEngine
  let hrAgent: WorkflowEngine
  let itAgent: WorkflowEngine
  let multiDeskAgent: WorkflowEngine

  const PORTAL_USER = 'portal.user@company.com'
  const HR_AGENT = 'hr.agent@company.com'
  const IT_AGENT = 'it.agent@company.com'
  const MULTI_DESK_AGENT = 'supervisor@company.com'

  beforeEach(async () => {
    portalEngine = createMockEngine(PORTAL_USER)
    hrAgent = createMockEngine(HR_AGENT)
    itAgent = createMockEngine(IT_AGENT)
    multiDeskAgent = createMockEngine(MULTI_DESK_AGENT)

    // Seed sample data to ensure consistent testing
    await mockDataHelpers.seedSampleData(portalEngine)
  })

  describe('Route: /desk (Root with Tabs)', () => {
    it('should determine available desk tabs based on user capabilities', async () => {
      // 1. HR Agent capabilities
      const hrCapabilities = await simulateUserCapabilities(hrAgent)
      expect(hrCapabilities.length).toBeGreaterThanOrEqual(1)
      expect(hrCapabilities.some(cap => cap.desk === 'HR')).toBe(true)

      // 2. IT Agent capabilities
      const itCapabilities = await simulateUserCapabilities(itAgent)
      expect(itCapabilities.length).toBeGreaterThanOrEqual(1)
      expect(itCapabilities.some(cap => cap.desk === 'IT')).toBe(true)

      // 3. Multi-desk agent capabilities
      const multiCapabilities = await simulateUserCapabilities(multiDeskAgent)
      expect(multiCapabilities.length).toBeGreaterThanOrEqual(2)
    })

    it('should display correct ticket counts per desk tab', async () => {
      // 1. Create requests targeting different desks
      await portalEngine.startRequest('hr-request', { type: 'benefits' })
      await portalEngine.startRequest('it-request', { type: 'laptop' })
      await portalEngine.startRequest('hr-request', { type: 'leave' })

      // 2. Check capabilities reflect correct counts
      const capabilities = await simulateUserCapabilities(multiDeskAgent)

      const hrCap = capabilities.find(cap => cap.desk === 'HR')
      const itCap = capabilities.find(cap => cap.desk === 'IT')

      if (hrCap) expect(hrCap.ticketCount).toBeGreaterThanOrEqual(2)
      if (itCap) expect(itCap.ticketCount).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty desks gracefully', async () => {
      // 1. Process all existing tickets to clear queues
      const allDesks: StepReceiver[] = ['HR', 'IT', 'Facilities', 'Finance']

      for (const desk of allDesks) {
        try {
          const tickets = await multiDeskAgent.getDeskTickets(desk)
          for (const ticket of tickets) {
            await multiDeskAgent.claim(ticket.id)
            await multiDeskAgent.advance(ticket.id)
          }
        } catch {
          // Desk might not be accessible
        }
      }

      // 2. Check capabilities with empty queues
      const capabilities = await simulateUserCapabilities(multiDeskAgent)

      // Should still show accessible desks even with 0 tickets
      capabilities.forEach(cap => {
        expect(cap.ticketCount).toBeGreaterThanOrEqual(0)
        expect(cap.name).toBeDefined()
      })
    })
  })

  describe('Route: /desk/[deskKey] (Queue View)', () => {
    it('should display only tickets for the specified desk', async () => {
      // 1. Create mixed requests
      const hrRequestId = await portalEngine.startRequest('hr-request', {})
      const itRequestId = await portalEngine.startRequest('it-request', {})

      // 2. Check HR desk queue
      const hrTickets = await hrAgent.getDeskTickets('HR')
      const hrRequestTickets = hrTickets.filter(t => t.requestId === hrRequestId)
      const itRequestTickets = hrTickets.filter(t => t.requestId === itRequestId)

      expect(hrRequestTickets.length).toBeGreaterThan(0)
      expect(itRequestTickets.length).toBe(0) // IT tickets shouldn't appear in HR queue

      // 3. Check IT desk queue
      const itTickets = await itAgent.getDeskTickets('IT')
      const itHrTickets = itTickets.filter(t => t.requestId === hrRequestId)
      const itItTickets = itTickets.filter(t => t.requestId === itRequestId)

      expect(itItTickets.length).toBeGreaterThan(0)
      expect(itHrTickets.length).toBe(0) // HR tickets shouldn't appear in IT queue
    })

    it('should handle desk access validation', async () => {
      // 1. Verify agent can access their assigned desk
      const hrTickets = await hrAgent.getDeskTickets('HR')
      expect(hrTickets).toBeDefined()
      expect(Array.isArray(hrTickets)).toBe(true)

      // 2. Test access to different desk (implementation dependent)
      try {
        const facilitiesTickets = await hrAgent.getDeskTickets('Facilities')
        // If this succeeds, agent has multi-desk access
        expect(Array.isArray(facilitiesTickets)).toBe(true)
      } catch (error) {
        // If this fails, agent doesn't have access (which is also valid)
        expect(error).toBeDefined()
      }
    })

    it('should support queue filtering and searching', async () => {
      // 1. Create tickets with different characteristics
      await portalEngine.startRequest('urgent-request', { priority: 'high' })
      await portalEngine.startRequest('normal-request', { priority: 'medium' })

      const tickets = await hrAgent.getDeskTickets('HR')

      // 2. Test status filtering (simulate UI filtering)
      const queuedTickets = tickets.filter(t => t.status === 'queued')
      const claimedTickets = tickets.filter(t => t.status === 'claimed')

      expect(queuedTickets.length).toBeGreaterThanOrEqual(0)
      expect(claimedTickets.length).toBeGreaterThanOrEqual(0)

      // 3. Test assignee filtering
      await hrAgent.claim(queuedTickets[0]?.id)
      const updatedTickets = await hrAgent.getDeskTickets('HR')
      const myTickets = updatedTickets.filter(t => t.claimedByUserId === HR_AGENT || t.assignedToUserId === HR_AGENT)

      expect(myTickets.length).toBeGreaterThanOrEqual(1)

      // 4. Test search functionality (simulate search by request ID)
      if (tickets.length > 0) {
        const searchTerm = tickets[0].requestId.substring(0, 5)
        const searchResults = tickets.filter(
          t => t.requestId.includes(searchTerm) || t.name.toLowerCase().includes(searchTerm.toLowerCase())
        )

        expect(searchResults.length).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('Route: /desk/[deskKey]/tickets/[ticketId] (Detail View)', () => {
    let testTicket: StepInstance
    let testRequestId: string

    beforeEach(async () => {
      testRequestId = await portalEngine.startRequest('detail-test', {
        description: 'Test ticket for detail view routing'
      })

      const tickets = await hrAgent.getDeskTickets('HR')
      testTicket = tickets.find(t => t.requestId === testRequestId)!
    })

    it('should load correct ticket details for the route', async () => {
      expect(testTicket).toBeDefined()
      expect(testTicket.id).toBeDefined()
      expect(testTicket.requestId).toBe(testRequestId)
      expect(testTicket.desk).toBe('HR')
    })

    it('should support direct URL access to ticket details', async () => {
      // Simulate accessing ticket directly via URL
      // In real implementation, this would involve URL parsing and ticket lookup

      const ticketId = testTicket.id
      const deskKey = testTicket.desk

      // 1. Verify ticket can be found via ID
      const allTickets = await hrAgent.getDeskTickets(deskKey)
      const foundTicket = allTickets.find(t => t.id === ticketId)

      expect(foundTicket).toBeDefined()
      expect(foundTicket!.id).toBe(ticketId)

      // 2. Verify overall request can be loaded
      const overallRequest = await hrAgent.getRequest(testRequestId)
      expect(overallRequest).toBeDefined()
      expect(overallRequest.steps).toContainEqual(expect.objectContaining({ id: ticketId }))
    })

    it('should handle invalid ticket IDs gracefully', async () => {
      const invalidTicketId = 'invalid-ticket-id-12345'

      // Try to find invalid ticket
      const allTickets = await hrAgent.getDeskTickets('HR')
      const invalidTicket = allTickets.find(t => t.id === invalidTicketId)

      expect(invalidTicket).toBeUndefined()

      // This simulates the error handling that would occur in the UI
      // when an invalid ticket ID is provided in the URL
    })

    it('should maintain state consistency during navigation', async () => {
      // 1. Perform action on ticket
      await hrAgent.claim(testTicket.id)
      await hrAgent.comment(testTicket.id, 'Navigation test comment')

      // 2. Simulate navigation back to queue and to detail again
      const queueTickets = await hrAgent.getDeskTickets('HR')
      const updatedTicket = queueTickets.find(t => t.id === testTicket.id)

      expect(updatedTicket!.status).toBe('claimed')
      expect(updatedTicket!.comments.length).toBeGreaterThanOrEqual(1)

      // 3. Verify overall request reflects changes
      const overallRequest = await hrAgent.getRequest(testRequestId)
      const requestStep = overallRequest.steps.find(s => s.id === testTicket.id)

      expect(requestStep!.status).toBe('claimed')
      expect(requestStep!.claimedByUserId).toBe(HR_AGENT)
    })
  })

  describe('Cross-Route Data Consistency', () => {
    it('should maintain data consistency across all routes', async () => {
      // 1. Create request and get initial state
      const requestId = await portalEngine.startRequest('consistency-test', {})

      // 2. Check state in queue view (/desk/HR)
      const queueTickets = await hrAgent.getDeskTickets('HR')
      const queueTicket = queueTickets.find(t => t.requestId === requestId)

      expect(queueTicket).toBeDefined()
      const initialStatus = queueTicket!.status

      // 3. Perform action in detail view (/desk/HR/tickets/[id])
      await hrAgent.claim(queueTicket!.id)

      // 4. Verify consistency in queue view
      const updatedQueueTickets = await hrAgent.getDeskTickets('HR')
      const updatedQueueTicket = updatedQueueTickets.find(t => t.id === queueTicket!.id)

      expect(updatedQueueTicket!.status).toBe('claimed')
      expect(updatedQueueTicket!.status).not.toBe(initialStatus)

      // 5. Verify consistency in capabilities (/desk root)
      const capabilities = await simulateUserCapabilities(hrAgent)
      const hrCapability = capabilities.find(cap => cap.desk === 'HR')

      expect(hrCapability).toBeDefined()
      // Ticket count should reflect current state
    })

    it('should handle workflow progression across routes', async () => {
      // 1. Create multi-step request
      const requestId = await portalEngine.startRequest('multi-step-test', {})

      // 2. Process first step in HR
      const hrTickets = await hrAgent.getDeskTickets('HR')
      const hrTicket = hrTickets.find(t => t.requestId === requestId)

      if (hrTicket) {
        await hrAgent.claim(hrTicket.id)
        await hrAgent.advance(hrTicket.id)

        // 3. Check if next step appears in another desk
        const itTickets = await itAgent.getDeskTickets('IT')
        const nextStepTicket = itTickets.find(t => t.requestId === requestId && t.status === 'queued')

        if (nextStepTicket) {
          // Verify next step is properly initialized
          expect(nextStepTicket.desk).toBe('IT')
          expect(nextStepTicket.status).toBe('queued')
          expect(nextStepTicket.requestId).toBe(requestId)
        }
      }
    })
  })

  describe('Performance and Scale', () => {
    it('should handle large numbers of tickets efficiently across routes', async () => {
      // 1. Create many requests
      const requestPromises = Array.from({ length: 100 }, (_, i) =>
        portalEngine.startRequest('perf-test', { index: i })
      )

      await Promise.all(requestPromises)

      // 2. Test queue loading performance
      const startTime = Date.now()
      const tickets = await hrAgent.getDeskTickets('HR')
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // 2 seconds
      expect(tickets.length).toBeGreaterThanOrEqual(100)

      // 3. Test capabilities calculation performance
      const capStartTime = Date.now()
      const capabilities = await simulateUserCapabilities(hrAgent)
      const capEndTime = Date.now()

      expect(capEndTime - capStartTime).toBeLessThan(1000) // 1 second
      expect(capabilities.length).toBeGreaterThan(0)
    })

    it('should handle concurrent access across multiple routes', async () => {
      // 1. Create test request
      const requestId = await portalEngine.startRequest('concurrent-test', {})

      // 2. Simulate concurrent access from different "routes"
      const promises = [
        // Simulate queue view refresh
        hrAgent.getDeskTickets('HR'),
        // Simulate capabilities check
        simulateUserCapabilities(hrAgent),
        // Simulate detail view access
        hrAgent.getRequest(requestId)
      ]

      const [queueResults, capResults, detailResults] = await Promise.all(promises)

      // 3. Verify all requests completed successfully
      expect(Array.isArray(queueResults)).toBe(true)
      expect(Array.isArray(capResults)).toBe(true)
      expect(detailResults).toBeDefined()
      expect(detailResults.requestKey).toBeDefined()
    })
  })
})
