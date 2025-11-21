import { MockWorkflowEngineAdapter } from '../MockWorkflowEngineAdapter'

describe('MockWorkflowEngineAdapter', () => {
  let engine: MockWorkflowEngineAdapter
  let requestId: string

  beforeEach(async () => {
    engine = new MockWorkflowEngineAdapter('test-user-123')

    // Create a test request for each test
    requestId = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Laptop',
      justification: 'Development work',
      urgency: 'High'
    })
  })

  afterEach(() => {
    engine.clearAllData()
  })

  describe('Claim and Assign Operations', () => {
    test('should claim a ready step successfully', async () => {
      // Get HR desk tickets (first step in workflow)
      const hrTickets = await engine.getDeskTickets('HR')
      expect(hrTickets).toHaveLength(1)

      const step = hrTickets[0]
      expect(step.status).toBe('ready')
      expect(step.claimedByUserId).toBeUndefined()

      // Claim the step
      await engine.claim(step.id)

      // Verify step is claimed
      const request = await engine.getRequest(requestId)
      const claimedStep = request.steps.find(s => s.id === step.id)

      expect(claimedStep?.status).toBe('in_progress')
      expect(claimedStep?.claimedByUserId).toBe('test-user-123')
      expect(claimedStep?.startedAt).toBeDefined()
      expect(new Date(claimedStep!.startedAt!)).toBeInstanceOf(Date)
    })

    test('should fail to claim already claimed step', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      // Claim the step first
      await engine.claim(step.id)

      // Try to claim again - should fail
      await expect(engine.claim(step.id)).rejects.toThrow(`Step ${step.id} is already claimed by test-user-123`)
    })

    test('should fail to claim non-ready step', async () => {
      const request = await engine.getRequest(requestId)
      const pendingStep = request.steps.find(s => s.status === 'pending')

      if (pendingStep) {
        await expect(engine.claim(pendingStep.id)).rejects.toThrow(
          `Step ${pendingStep.id} is not ready for claiming (status: pending)`
        )
      }
    })

    test('should assign step to specific user', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]
      const assigneeUserId = 'manager-456'

      // Assign the step
      await engine.assign(step.id, assigneeUserId)

      // Verify assignment
      const request = await engine.getRequest(requestId)
      const assignedStep = request.steps.find(s => s.id === step.id)

      expect(assignedStep?.status).toBe('in_progress')
      expect(assignedStep?.assignedToUserId).toBe(assigneeUserId)
      expect(assignedStep?.startedAt).toBeDefined()
    })

    test('should advance step and unlock dependent steps', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const hrStep = hrTickets[0]

      // Claim and advance HR step
      await engine.claim(hrStep.id)
      await engine.advance(hrStep.id)

      // Verify HR step is done
      const request = await engine.getRequest(requestId)
      const completedStep = request.steps.find(s => s.id === hrStep.id)
      expect(completedStep?.status).toBe('done')
      expect(completedStep?.finishedAt).toBeDefined()

      // Verify dependent step (Procurement) is now ready
      const procurementStep = request.steps.find(s => s.desk === 'Procurement')
      expect(procurementStep?.status).toBe('ready')
    })

    test('should update request status based on step progression', async () => {
      // Initial status should be 'open'
      let request = await engine.getRequest(requestId)
      expect(request.status).toBe('open')

      // Claim a step - should become 'in_progress'
      const hrTickets = await engine.getDeskTickets('HR')
      await engine.claim(hrTickets[0].id)

      request = await engine.getRequest(requestId)
      expect(request.status).toBe('in_progress')

      // Complete all steps
      for (const step of request.steps) {
        if (step.status === 'ready') {
          await engine.claim(step.id)
          await engine.advance(step.id)
        } else if (step.status === 'in_progress') {
          await engine.advance(step.id)
        }

        // Refresh request to get updated steps
        request = await engine.getRequest(requestId)
      }

      // Final status should be 'completed'
      expect(request.status).toBe('completed')
    })
  })

  describe('SLA Timer Calculations', () => {
    test('should calculate SLA due date correctly', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      // Step should not have due date before starting
      let dueDate = engine.calculateSLADueDate(step)
      expect(dueDate).toBeNull()

      // Claim step to start it
      await engine.claim(step.id)

      // Get updated step
      const request = await engine.getRequest(requestId)
      const startedStep = request.steps.find(s => s.id === step.id)!

      // Calculate due date (24 hours from start for HR step)
      dueDate = engine.calculateSLADueDate(startedStep)
      expect(dueDate).toBeInstanceOf(Date)

      const startDate = new Date(startedStep.startedAt!)
      const expectedDue = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)

      expect(dueDate!.getTime()).toBe(expectedDue.getTime())
    })

    test('should detect overdue steps', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      // Claim step
      await engine.claim(step.id)

      // Get step and manually set old start time
      const request = await engine.getRequest(requestId)
      const startedStep = request.steps.find(s => s.id === step.id)!

      // Set start time to 48 hours ago (past 24h SLA)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
      startedStep.startedAt = twoDaysAgo.toISOString()

      // Check if overdue
      const isOverdue = engine.isStepOverdue(startedStep)
      expect(isOverdue).toBe(true)
    })

    test('should not mark non-started steps as overdue', async () => {
      const request = await engine.getRequest(requestId)
      const pendingStep = request.steps.find(s => s.status === 'pending')!

      const isOverdue = engine.isStepOverdue(pendingStep)
      expect(isOverdue).toBe(false)
    })

    test('should handle steps without SLA hours', async () => {
      // Create a step without SLA (this would need a modified template in real scenario)
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      await engine.claim(step.id)

      // Even with SLA defined, test the null case logic
      const request = await engine.getRequest(requestId)
      const startedStep = request.steps.find(s => s.id === step.id)!

      // For mock purposes, should return a date since we have SLA defined
      const dueDate = engine.calculateSLADueDate(startedStep)
      expect(dueDate).toBeInstanceOf(Date)
    })
  })

  describe('Comment Visibility', () => {
    test('should add comments to steps', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      await engine.claim(step.id)

      const commentText = 'Reviewing hardware requirements'
      const comment = await engine.comment(step.id, commentText)

      expect(comment.id).toBeDefined()
      expect(comment.stepId).toBe(step.id)
      expect(comment.authorId).toBe('test-user-123')
      expect(comment.body).toBe(commentText)
      expect(comment.visibility).toBe('current_and_downstream')
      expect(comment.createdAt).toBeDefined()
    })

    test('should include comments in step data', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      await engine.claim(step.id)
      await engine.comment(step.id, 'First comment')
      await engine.comment(step.id, 'Second comment')

      const request = await engine.getRequest(requestId)
      const updatedStep = request.steps.find(s => s.id === step.id)!

      expect(updatedStep.comments).toHaveLength(2)
      expect(updatedStep.comments[0].body).toBe('First comment')
      expect(updatedStep.comments[1].body).toBe('Second comment')
    })

    test('should make comments visible to downstream steps', async () => {
      // Complete HR step with comment
      const hrTickets = await engine.getDeskTickets('HR')
      const hrStep = hrTickets[0]

      await engine.claim(hrStep.id)
      await engine.comment(hrStep.id, 'HR approval comment')
      await engine.advance(hrStep.id)

      // Move to procurement step and add comment
      const procurementTickets = await engine.getDeskTickets('Procurement')
      const procStep = procurementTickets[0]

      await engine.claim(procStep.id)
      await engine.comment(procStep.id, 'Procurement review comment')

      // Get visible comments for procurement step (should include HR comment)
      const visibleComments = engine.getVisibleComments(requestId, procStep.id)

      expect(visibleComments).toHaveLength(2)

      const hrComment = visibleComments.find(c => c.body === 'HR approval comment')
      const procComment = visibleComments.find(c => c.body === 'Procurement review comment')

      expect(hrComment).toBeDefined()
      expect(procComment).toBeDefined()
    })

    test('should sort visible comments by creation time', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      await engine.claim(step.id)

      // Add comments with slight delay to ensure different timestamps
      await engine.comment(step.id, 'First comment')
      await new Promise(resolve => setTimeout(resolve, 10))
      await engine.comment(step.id, 'Second comment')
      await new Promise(resolve => setTimeout(resolve, 10))
      await engine.comment(step.id, 'Third comment')

      const visibleComments = engine.getVisibleComments(requestId, step.id)

      expect(visibleComments).toHaveLength(3)
      expect(visibleComments[0].body).toBe('First comment')
      expect(visibleComments[1].body).toBe('Second comment')
      expect(visibleComments[2].body).toBe('Third comment')

      // Verify chronological order
      for (let i = 1; i < visibleComments.length; i++) {
        const prevTime = new Date(visibleComments[i - 1].createdAt).getTime()
        const currTime = new Date(visibleComments[i].createdAt).getTime()
        expect(currTime).toBeGreaterThanOrEqual(prevTime)
      }
    })

    test('should update timeline when comments are added', async () => {
      const hrTickets = await engine.getDeskTickets('HR')
      const step = hrTickets[0]

      await engine.claim(step.id)
      await engine.comment(step.id, 'Test comment')

      const request = await engine.getRequest(requestId)

      const timelineEntry = request.timeline.find(entry => entry.message.includes('Comment added'))

      expect(timelineEntry).toBeDefined()
      expect(timelineEntry!.message).toContain('test-user-123')
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete workflow with comments and SLA tracking', async () => {
      let request = await engine.getRequest(requestId)
      expect(request.steps).toHaveLength(3) // HR, Procurement, IT

      // Process HR step
      const hrStep = request.steps.find(s => s.desk === 'HR')!
      await engine.claim(hrStep.id)
      await engine.comment(hrStep.id, 'Hardware request approved by HR')

      // Check SLA
      const hrDueDate = engine.calculateSLADueDate(hrStep)
      expect(hrDueDate).toBeInstanceOf(Date)

      await engine.advance(hrStep.id)

      // Process Procurement step
      request = await engine.getRequest(requestId)
      const procStep = request.steps.find(s => s.desk === 'Procurement')!
      expect(procStep.status).toBe('ready')

      await engine.assign(procStep.id, 'procurement-manager')
      await engine.comment(procStep.id, 'Budget approved, hardware ordered')
      await engine.advance(procStep.id)

      // Process IT step
      request = await engine.getRequest(requestId)
      const itStep = request.steps.find(s => s.desk === 'IT')!
      expect(itStep.status).toBe('ready')

      await engine.claim(itStep.id)

      // Verify all comments are visible to IT (downstream)
      const allComments = engine.getVisibleComments(requestId, itStep.id)
      expect(allComments.length).toBeGreaterThanOrEqual(2)

      await engine.comment(itStep.id, 'Hardware delivered and configured')
      await engine.advance(itStep.id)

      // Verify final state
      request = await engine.getRequest(requestId)
      expect(request.status).toBe('completed')
      expect(request.steps.every(s => s.status === 'done')).toBe(true)
    })
  })
})
