/**
 * Integration Tests: Portal to Service Desk End-to-End Workflow
 *
 * These tests simulate the complete user journey:
 * 1. Portal user submits a service request
 * 2. Request creates workflow steps for different desks
 * 3. Service Desk agents can see tickets in their queues
 * 4. Agents can claim, process, and advance tickets
 * 5. Workflow progresses through multiple steps/desks
 */

import { createMockEngine } from '../workflowEngineProvider'
import type { WorkflowEngine } from '../../packages/services-plus-core/src'

describe('Integration: Portal to Service Desk Workflow', () => {
  let portalEngine: WorkflowEngine
  let hrAgent: WorkflowEngine
  let itAgent: WorkflowEngine
  let facilitiesAgent: WorkflowEngine

  // Test users
  const PORTAL_USER = 'john.doe@company.com'
  const HR_AGENT = 'hr.specialist@company.com'
  const IT_AGENT = 'it.support@company.com'
  const FACILITIES_AGENT = 'facilities.coordinator@company.com'

  beforeEach(() => {
    // Create separate engine instances for different users
    portalEngine = createMockEngine(PORTAL_USER)
    hrAgent = createMockEngine(HR_AGENT)
    itAgent = createMockEngine(IT_AGENT)
    facilitiesAgent = createMockEngine(FACILITIES_AGENT)
  })

  describe('Single-Step Workflow: IT Support Request', () => {
    it('should create request in Portal and process it in IT Service Desk', async () => {
      // 1. Portal User: Submit IT support request
      const requestId = await portalEngine.startRequest('laptop-issue', {
        issue: 'Laptop screen is flickering',
        priority: 'medium',
        department: 'Engineering'
      })

      expect(requestId).toBeDefined()
      expect(typeof requestId).toBe('string')

      // 2. Verify request was created
      const submittedRequest = await portalEngine.getRequest(requestId)
      expect(submittedRequest).toBeDefined()
      expect(submittedRequest.requestKey).toBe('laptop-issue')
      expect(submittedRequest.submittedByUserId).toBe(PORTAL_USER)
      expect(submittedRequest.steps).toHaveLength(1)

      // 3. IT Service Desk: Check queue for new tickets
      const itTickets = await itAgent.getDeskTickets('IT')
      expect(itTickets.length).toBeGreaterThan(0)

      const newTicket = itTickets.find(ticket => ticket.requestId === requestId)
      expect(newTicket).toBeDefined()
      expect(newTicket!.status).toBe('queued')
      expect(newTicket!.desk).toBe('IT')
      expect(newTicket!.name).toBe('Laptop Issue Support')

      // 4. IT Agent: Claim the ticket
      await itAgent.claim(newTicket!.id)

      // Verify claim
      const claimedTickets = await itAgent.getDeskTickets('IT')
      const claimedTicket = claimedTickets.find(ticket => ticket.id === newTicket!.id)
      expect(claimedTicket!.status).toBe('claimed')
      expect(claimedTicket!.claimedByUserId).toBe(IT_AGENT)

      // 5. IT Agent: Add comment and advance ticket
      await itAgent.comment(newTicket!.id, 'Diagnosed issue as graphics driver problem. Will update driver.')

      await itAgent.advance(newTicket!.id)

      // 6. Verify ticket completion
      const completedTickets = await itAgent.getDeskTickets('IT')
      const completedTicket = completedTickets.find(ticket => ticket.id === newTicket!.id)
      expect(completedTicket!.status).toBe('done')
      expect(completedTicket!.completedAt).toBeDefined()

      // 7. Verify overall request completion
      const finalRequest = await portalEngine.getRequest(requestId)
      expect(finalRequest.status).toBe('completed')
    })
  })

  describe('Multi-Step Workflow: New Employee Onboarding', () => {
    it('should process request through HR → IT → Facilities workflow', async () => {
      // 1. Portal User: Submit new employee onboarding request
      const requestId = await portalEngine.startRequest('employee-onboarding', {
        employeeName: 'Alice Johnson',
        department: 'Marketing',
        startDate: '2024-02-01',
        jobTitle: 'Marketing Specialist'
      })

      const initialRequest = await portalEngine.getRequest(requestId)
      expect(initialRequest.steps).toHaveLength(3) // HR → IT → Facilities

      // 2. HR Service Desk: Process first step
      const hrTickets = await hrAgent.getDeskTickets('HR')
      const hrTicket = hrTickets.find(ticket => ticket.requestId === requestId)

      expect(hrTicket).toBeDefined()
      expect(hrTicket!.status).toBe('queued')
      expect(hrTicket!.name).toBe('Employee Setup - HR')

      // HR Agent claims and processes
      await hrAgent.claim(hrTicket!.id)
      await hrAgent.comment(hrTicket!.id, 'Created employee record in HRIS. Benefits enrollment scheduled.')
      await hrAgent.advance(hrTicket!.id)

      // 3. IT Service Desk: Process second step
      const itTickets = await itAgent.getDeskTickets('IT')
      const itTicket = itTickets.find(ticket => ticket.requestId === requestId && ticket.status === 'queued')

      expect(itTicket).toBeDefined()
      expect(itTicket!.name).toBe('Employee Setup - IT')

      // IT Agent processes
      await itAgent.claim(itTicket!.id)
      await itAgent.comment(itTicket!.id, 'Created user accounts: AD, email, VPN. Laptop ordered.')
      await itAgent.advance(itTicket!.id)

      // 4. Facilities Service Desk: Process final step
      const facilitiesTickets = await facilitiesAgent.getDeskTickets('Facilities')
      const facilitiesTicket = facilitiesTickets.find(
        ticket => ticket.requestId === requestId && ticket.status === 'queued'
      )

      expect(facilitiesTicket).toBeDefined()
      expect(facilitiesTicket!.name).toBe('Employee Setup - Facilities')

      // Facilities Agent processes
      await facilitiesAgent.claim(facilitiesTicket!.id)
      await facilitiesAgent.comment(
        facilitiesTicket!.id,
        'Desk assigned in Building A, Floor 3. Parking space allocated.'
      )
      await facilitiesAgent.advance(facilitiesTicket!.id)

      // 5. Verify complete workflow
      const finalRequest = await portalEngine.getRequest(requestId)
      expect(finalRequest.status).toBe('completed')

      // All steps should be completed
      finalRequest.steps.forEach(step => {
        expect(step.status).toBe('done')
        expect(step.completedAt).toBeDefined()
      })
    })
  })

  describe('Parallel Workflow: Equipment Request', () => {
    it('should handle parallel processing across multiple desks', async () => {
      // 1. Portal User: Submit equipment request requiring parallel processing
      const requestId = await portalEngine.startRequest('equipment-request', {
        equipment: 'Standing desk + monitor',
        justification: 'Ergonomic improvement for productivity',
        approvedBy: 'manager@company.com'
      })

      const initialRequest = await portalEngine.getRequest(requestId)
      expect(initialRequest.steps.length).toBeGreaterThan(1)

      // 2. Multiple desks should have tickets simultaneously
      const [hrTickets, itTickets, facilitiesTickets] = await Promise.all([
        hrAgent.getDeskTickets('HR'),
        itAgent.getDeskTickets('IT'),
        facilitiesAgent.getDeskTickets('Facilities')
      ])

      const requestTickets = [...hrTickets, ...itTickets, ...facilitiesTickets].filter(
        ticket => ticket.requestId === requestId
      )

      expect(requestTickets.length).toBeGreaterThan(1)

      // 3. Process tickets in parallel
      const promises = requestTickets.map(async ticket => {
        const engine = ticket.desk === 'HR' ? hrAgent : ticket.desk === 'IT' ? itAgent : facilitiesAgent

        await engine.claim(ticket.id)
        await engine.comment(ticket.id, `${ticket.desk} processing equipment request`)
        await engine.advance(ticket.id)
      })

      await Promise.all(promises)

      // 4. Verify all parallel steps completed
      const finalRequest = await portalEngine.getRequest(requestId)
      finalRequest.steps.forEach(step => {
        expect(step.status).toBe('done')
      })
    })
  })

  describe('Comment Visibility and Downstream Flow', () => {
    it('should maintain comment visibility through workflow progression', async () => {
      // 1. Create multi-step request
      const requestId = await portalEngine.startRequest('access-request', {
        accessType: 'VPN + Database',
        justification: 'Remote work requirement',
        approver: 'manager@company.com'
      })

      // 2. HR step: Add comments
      const hrTickets = await hrAgent.getDeskTickets('HR')
      const hrTicket = hrTickets.find(ticket => ticket.requestId === requestId)

      await hrAgent.claim(hrTicket!.id)
      await hrAgent.comment(hrTicket!.id, 'Employment verified. Manager approval confirmed.')
      await hrAgent.comment(hrTicket!.id, 'Security clearance: Level 2 approved.')
      await hrAgent.advance(hrTicket!.id)

      // 3. IT step: Verify downstream visibility
      const itTickets = await itAgent.getDeskTickets('IT')
      const itTicket = itTickets.find(ticket => ticket.requestId === requestId && ticket.status === 'queued')

      expect(itTicket!.comments.length).toBe(2) // Should see HR comments
      expect(itTicket!.comments[0].body).toBe('Employment verified. Manager approval confirmed.')
      expect(itTicket!.comments[1].body).toBe('Security clearance: Level 2 approved.')
      expect(itTicket!.comments[0].visibleToDownstream).toBe(true)

      // 4. IT adds own comments
      await itAgent.claim(itTicket!.id)
      await itAgent.comment(itTicket!.id, 'VPN account created. Database access configured.')
      await itAgent.advance(itTicket!.id)

      // 5. Verify all comments in final request
      const finalRequest = await portalEngine.getRequest(requestId)
      const allComments = finalRequest.steps.flatMap(step => step.comments)

      expect(allComments).toHaveLength(3)
      expect(allComments.every(comment => comment.visibleToDownstream)).toBe(true)
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle invalid claim attempts', async () => {
      // 1. Create request
      const requestId = await portalEngine.startRequest('test-request', {})

      const hrTickets = await hrAgent.getDeskTickets('HR')
      const ticket = hrTickets.find(t => t.requestId === requestId)

      // 2. First agent claims successfully
      await hrAgent.claim(ticket!.id)

      // 3. Second agent tries to claim same ticket (should fail or handle gracefully)
      await expect(async () => {
        await itAgent.claim(ticket!.id)
      }).rejects.toThrow() // Or handle gracefully depending on implementation
    })

    it('should handle requests with no matching desk', async () => {
      // This test depends on how the system handles unknown desks
      // May need adjustment based on actual implementation
      const requestId = await portalEngine.startRequest('unknown-request-type', {})

      // Verify request was created but may not have created tickets
      const request = await portalEngine.getRequest(requestId)
      expect(request).toBeDefined()
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      // 1. Create multiple requests concurrently
      const requestPromises = Array.from({ length: 5 }, (_, i) =>
        portalEngine.startRequest('concurrent-test', {
          testId: i,
          user: `user-${i}@company.com`
        })
      )

      const requestIds = await Promise.all(requestPromises)
      expect(requestIds).toHaveLength(5)
      expect(new Set(requestIds).size).toBe(5) // All unique

      // 2. Verify all tickets appear in queues
      const [hrTickets, itTickets] = await Promise.all([hrAgent.getDeskTickets('HR'), itAgent.getDeskTickets('IT')])

      const allTickets = [...hrTickets, ...itTickets]
      const concurrentTickets = allTickets.filter(ticket => requestIds.includes(ticket.requestId))

      expect(concurrentTickets.length).toBeGreaterThanOrEqual(5)

      // 3. Process all tickets concurrently
      const processPromises = concurrentTickets.map(async ticket => {
        const engine = ticket.desk === 'HR' ? hrAgent : itAgent
        await engine.claim(ticket.id)
        await engine.advance(ticket.id)
      })

      await Promise.all(processPromises)

      // 4. Verify all requests completed
      const finalRequests = await Promise.all(requestIds.map(id => portalEngine.getRequest(id)))

      finalRequests.forEach(request => {
        expect(['completed', 'in_progress']).toContain(request.status)
      })
    })
  })

  describe('SLA and Timing', () => {
    it('should track timing correctly through workflow', async () => {
      const startTime = new Date()

      // 1. Create request
      const requestId = await portalEngine.startRequest('timing-test', {})

      // 2. Process through workflow with delays
      const hrTickets = await hrAgent.getDeskTickets('HR')
      const hrTicket = hrTickets.find(t => t.requestId === requestId)

      expect(hrTicket!.startedAt).toBeDefined()
      const hrStartTime = new Date(hrTicket!.startedAt!)
      expect(hrStartTime).toBeInstanceOf(Date)
      expect(hrStartTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime())

      // Small delay to test timing
      await new Promise(resolve => setTimeout(resolve, 10))

      await hrAgent.claim(hrTicket!.id)
      await hrAgent.advance(hrTicket!.id)

      // 3. Verify completion timestamp
      const completedHrTickets = await hrAgent.getDeskTickets('HR')
      const completedTicket = completedHrTickets.find(t => t.id === hrTicket!.id)

      expect(completedTicket!.completedAt).toBeDefined()
      const completionTime = new Date(completedTicket!.completedAt!)
      expect(completionTime.getTime()).toBeGreaterThan(hrStartTime.getTime())
    })
  })
})
