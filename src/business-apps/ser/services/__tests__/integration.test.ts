import {
  getWorkflowEngine,
  resetWorkflowEngine,
  mockDataHelpers,
} from '../workflowEngineProvider';
import { MockWorkflowEngineAdapter } from '../MockWorkflowEngineAdapter';

describe('Service Desk and Portal Integration', () => {
  beforeEach(() => {
    resetWorkflowEngine();
  });

  afterEach(() => {
    resetWorkflowEngine();
  });

  test('should coordinate between Service Desk and Portal apps', async () => {
    // === PORTAL APP SCENARIO ===
    // User submits a request via Portal
    const portalEngine = getWorkflowEngine('portal-user-123');
    
    const requestId = await portalEngine.startRequest('new-hardware-request', {
      hardwareType: 'Laptop',
      justification: 'Development work requires more powerful machine',
      urgency: 'High',
    });

    // Portal should be able to track the user's requests
    const portalRequests = await portalEngine.getMyRequests();
    expect(portalRequests).toHaveLength(1);
    expect(portalRequests[0].id).toBe(requestId);
    expect(portalRequests[0].status).toBe('open');

    // === SERVICE DESK APP SCENARIO ===
    // Service desk specialist sees tickets in their queue
    const serviceDeskEngine = getWorkflowEngine('service-desk-user-456');
    
    // Should be the same engine instance (singleton)
    expect(serviceDeskEngine).toBe(portalEngine);

    // HR desk should see the new request as a ticket
    const hrTickets = await serviceDeskEngine.getDeskTickets('HR');
    expect(hrTickets).toHaveLength(1);
    
    const hrTicket = hrTickets[0];
    expect(hrTicket.requestId).toBe(requestId);
    expect(hrTicket.desk).toBe('HR');
    expect(hrTicket.status).toBe('ready');

    // === HR SPECIALIST WORKFLOW ===
    // HR specialist claims and processes the ticket
    await serviceDeskEngine.claim(hrTicket.id);
    await serviceDeskEngine.comment(
      hrTicket.id,
      'Request approved. Employee is eligible for hardware upgrade.'
    );

    // Verify SLA timer is working
    if (serviceDeskEngine instanceof MockWorkflowEngineAdapter) {
      const slaDate = serviceDeskEngine.calculateSLADueDate(hrTicket);
      expect(slaDate).toBeInstanceOf(Date);
      expect(serviceDeskEngine.isStepOverdue(hrTicket)).toBe(false);
    }

    await serviceDeskEngine.advance(hrTicket.id);

    // === PROCUREMENT DESK WORKFLOW ===
    // Procurement should now see the ticket (dependency resolved)
    const procurementTickets = await serviceDeskEngine.getDeskTickets('Procurement');
    expect(procurementTickets).toHaveLength(1);
    
    const procTicket = procurementTickets[0];
    expect(procTicket.requestId).toBe(requestId);
    expect(procTicket.status).toBe('ready');

    // Different user can be assigned to procurement
    await serviceDeskEngine.assign(procTicket.id, 'procurement-manager-789');
    await serviceDeskEngine.comment(
      procTicket.id,
      'Budget approved. Hardware has been ordered from vendor.'
    );
    await serviceDeskEngine.advance(procTicket.id);

    // === IT DESK WORKFLOW ===
    // IT should now see the final ticket
    const itTickets = await serviceDeskEngine.getDeskTickets('IT');
    expect(itTickets).toHaveLength(1);
    
    const itTicket = itTickets[0];
    expect(itTicket.requestId).toBe(requestId);

    await serviceDeskEngine.claim(itTicket.id);
    
    // === COMMENT VISIBILITY TEST ===
    // IT should see all upstream comments (downstream visibility)
    if (serviceDeskEngine instanceof MockWorkflowEngineAdapter) {
      const visibleComments = serviceDeskEngine.getVisibleComments(requestId, itTicket.id);
      expect(visibleComments.length).toBeGreaterThanOrEqual(2);
      
      const hrComment = visibleComments.find(c => c.body.includes('approved'));
      const procComment = visibleComments.find(c => c.body.includes('Budget approved'));
      
      expect(hrComment).toBeDefined();
      expect(procComment).toBeDefined();
    }

    await serviceDeskEngine.comment(
      itTicket.id,
      'Hardware received and configured. Ready for pickup.'
    );
    await serviceDeskEngine.advance(itTicket.id);

    // === PORTAL USER VERIFICATION ===
    // Portal user should see completed request
    const updatedRequest = await portalEngine.getRequest(requestId);
    expect(updatedRequest.status).toBe('completed');
    expect(updatedRequest.steps.every(s => s.status === 'done')).toBe(true);

    // Portal should show timeline of all activities
    expect(updatedRequest.timeline.length).toBeGreaterThan(3);
    expect(updatedRequest.timeline.some(t => t.message.includes('claimed'))).toBe(true);
    expect(updatedRequest.timeline.some(t => t.message.includes('completed'))).toBe(true);

    // === DESK QUEUE VERIFICATION ===
    // All desks should now be empty (no pending tickets)
    const finalHrTickets = await serviceDeskEngine.getDeskTickets('HR');
    const finalProcTickets = await serviceDeskEngine.getDeskTickets('Procurement');
    const finalItTickets = await serviceDeskEngine.getDeskTickets('IT');

    expect(finalHrTickets).toHaveLength(0);
    expect(finalProcTickets).toHaveLength(0);
    expect(finalItTickets).toHaveLength(0);
  });

  test('should handle multiple concurrent requests across desks', async () => {
    const engine = getWorkflowEngine('test-user');

    // Create multiple requests
    const request1 = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Monitor',
      justification: 'Dual screen setup',
      urgency: 'Low',
    });

    const request2 = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Keyboard',
      justification: 'Ergonomic improvement',
      urgency: 'Medium',
    });

    // HR should see both tickets
    const hrTickets = await engine.getDeskTickets('HR');
    expect(hrTickets).toHaveLength(2);

    // Process first request partially
    const ticket1 = hrTickets.find(t => t.requestId === request1)!;
    await engine.claim(ticket1.id);
    await engine.advance(ticket1.id);

    // Procurement should see one ticket
    const procTickets = await engine.getDeskTickets('Procurement');
    expect(procTickets).toHaveLength(1);
    expect(procTickets[0].requestId).toBe(request1);

    // HR should still have the second ticket
    const remainingHrTickets = await engine.getDeskTickets('HR');
    expect(remainingHrTickets).toHaveLength(1);
    expect(remainingHrTickets[0].requestId).toBe(request2);

    // Verify request statuses
    const req1Status = await engine.getRequest(request1);
    const req2Status = await engine.getRequest(request2);
    
    expect(req1Status.status).toBe('in_progress');
    expect(req2Status.status).toBe('open');
  });

  test('should maintain data consistency across app restarts', async () => {
    // Simulate first session (Portal app)
    let engine = getWorkflowEngine('user-123');
    const requestId = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Server',
      justification: 'Database performance',
      urgency: 'High',
    });

    const hrTickets = await engine.getDeskTickets('HR');
    await engine.claim(hrTickets[0].id);
    await engine.comment(hrTickets[0].id, 'Initial review completed');

    // Simulate app restart (reset engine reference but keep data)
    const originalData = await engine.getMyRequests();
    
    // Get engine again (should be same instance due to singleton)
    engine = getWorkflowEngine('user-123');
    
    // Data should persist
    const persistedData = await engine.getMyRequests();
    expect(persistedData).toEqual(originalData);

    // Can continue workflow
    const request = await engine.getRequest(requestId);
    const hrStep = request.steps.find(s => s.desk === 'HR')!;
    expect(hrStep.status).toBe('in_progress');
    expect(hrStep.comments).toHaveLength(1);
  });

  test('should handle error scenarios gracefully', async () => {
    const engine = getWorkflowEngine('error-test-user');

    // Test claiming non-existent step
    await expect(engine.claim('non-existent-step')).rejects.toThrow('Step not found');

    // Test advancing step that cannot be advanced
    const requestId = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Test',
      justification: 'Testing',
      urgency: 'Low',
    });

    const request = await engine.getRequest(requestId);
    const pendingStep = request.steps.find(s => s.status === 'pending')!;
    
    await expect(engine.advance(pendingStep.id)).rejects.toThrow('cannot be advanced');

    // Test commenting on non-existent step
    await expect(engine.comment('non-existent', 'test')).rejects.toThrow('Step not found');
  });

  test('should demonstrate SLA monitoring capabilities', async () => {
    const engine = getWorkflowEngine('sla-test-user') as MockWorkflowEngineAdapter;
    
    const requestId = await engine.startRequest('new-hardware-request', {
      hardwareType: 'Laptop',
      justification: 'SLA testing',
      urgency: 'High',
    });

    const hrTickets = await engine.getDeskTickets('HR');
    const hrTicket = hrTickets[0];

    // Before claiming - no SLA
    expect(engine.calculateSLADueDate(hrTicket)).toBeNull();
    expect(engine.isStepOverdue(hrTicket)).toBe(false);

    // After claiming - SLA active
    await engine.claim(hrTicket.id);
    
    const updatedRequest = await engine.getRequest(requestId);
    const claimedStep = updatedRequest.steps.find(s => s.id === hrTicket.id)!;
    
    const slaDate = engine.calculateSLADueDate(claimedStep);
    expect(slaDate).toBeInstanceOf(Date);
    expect(slaDate!.getTime()).toBeGreaterThan(Date.now()); // Future date
    
    // Should not be overdue initially
    expect(engine.isStepOverdue(claimedStep)).toBe(false);

    // Simulate overdue scenario
    claimedStep.startedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
    expect(engine.isStepOverdue(claimedStep)).toBe(true);
  });
});
