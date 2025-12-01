/**
 * Mock Workflow Engine Implementation
 * Simulates workflow operations for Services+ development and testing
 * Will be replaced by ConductorWorkflowEngineAdapter in production
 */

import { 
  WorkflowEngine, 
  SubmittedRequest, 
  StepInstance, 
  Comment, 
  StepReceiver,
  StepStatus
} from '../types';

// In-memory storage for development
let mockRequests: SubmittedRequest[] = [];
let requestIdCounter = 1;
let commentIdCounter = 1;

// Initialize with sample requests for demonstration
const initializeSampleRequests = () => {
  if (mockRequests.length === 0) {
    // Sample HR Onboarding Request
    const hrRequest: SubmittedRequest = {
      id: 'req-sample-hr-001',
      templateId: 'hr-onboard',
      templateVersion: 1,
      requesterId: 'user-123',
      createdAt: '2024-01-15T09:30:00Z',
      status: 'open',
      titleSnapshot: 'Employee Onboarding',
      categoryIdSnapshot: 'hr',
      formData: {
        employeeName: 'Sarah Johnson',
        employeeEmail: 'sarah.johnson@company.com',
        department: 'Engineering',
        position: 'Senior Software Engineer',
        startDate: '2024-02-01',
        manager: 'John Smith',
        workLocation: 'Remote',
        equipmentNeeded: 'Laptop, Monitor, Headset',
        specialRequirements: 'macOS preferred for development work. Access to VPN and development tools required.'
      },
      steps: [
        {
          id: 'step-hr-001-1',
          defId: 'hr-review',
          name: 'HR Review',
          desk: 'HR',
          status: 'done',
          startedAt: '2024-01-15T09:45:00Z',
          finishedAt: '2024-01-15T14:20:00Z',
          comments: [
            {
              id: 'comment-1',
              stepId: 'step-hr-001-1',
              authorId: 'hr-manager',
              createdAt: '2024-01-15T14:15:00Z',
              body: 'All documentation looks good. Employee information verified and approved.',
              visibility: 'current_and_downstream'
            }
          ],
          requestId: 'req-sample-hr-001'
        },
        {
          id: 'step-hr-001-2',
          defId: 'it-setup',
          name: 'IT Account Setup',
          desk: 'IT',
          status: 'in_progress',
          startedAt: '2024-01-15T14:25:00Z',
          assignedToUserId: 'it-admin-1',
          comments: [],
          requestId: 'req-sample-hr-001'
        },
        {
          id: 'step-hr-001-3',
          defId: 'badge-access',
          name: 'Badge & Access Setup',
          desk: 'Security',
          status: 'pending',
          comments: [],
          requestId: 'req-sample-hr-001'
        }
      ],
      timeline: [
        { at: '2024-01-15T09:30:00Z', message: 'Request submitted: Employee Onboarding' },
        { at: '2024-01-15T09:45:00Z', message: 'Step "HR Review" started' },
        { at: '2024-01-15T14:20:00Z', message: 'Step "HR Review" completed' },
        { at: '2024-01-15T14:25:00Z', message: 'Step "IT Account Setup" is now ready for IT' },
        { at: '2024-01-15T14:30:00Z', message: 'Step "IT Account Setup" claimed by IT Admin' }
      ]
    };

    // Sample IT Hardware Request
    const itRequest: SubmittedRequest = {
      id: 'req-sample-it-001',
      templateId: 'it-hardware',
      templateVersion: 1,
      requesterId: 'user-123',
      createdAt: '2024-01-12T10:15:00Z',
      status: 'completed',
      titleSnapshot: 'Hardware Request',
      categoryIdSnapshot: 'it',
      formData: {
        requestType: 'New Equipment',
        itemDescription: 'MacBook Pro 16-inch',
        businessJustification: 'Current laptop is outdated and causing productivity issues. Need more powerful machine for development work.',
        estimatedCost: '$2,899',
        urgency: 'Medium',
        deliveryLocation: 'Office - Floor 3, Desk 45',
        additionalNotes: 'Please include standard software package and ensure macOS is latest version.'
      },
      steps: [
        {
          id: 'step-it-001-1',
          defId: 'it-review',
          name: 'IT Review',
          desk: 'IT',
          status: 'done',
          startedAt: '2024-01-12T10:30:00Z',
          finishedAt: '2024-01-12T11:45:00Z',
          comments: [
            {
              id: 'comment-2',
              stepId: 'step-it-001-1',
              authorId: 'it-reviewer',
              createdAt: '2024-01-12T11:40:00Z',
              body: 'Request approved. Specifications meet requirements for development work.',
              visibility: 'current_and_downstream'
            }
          ],
          requestId: 'req-sample-it-001'
        },
        {
          id: 'step-it-001-2',
          defId: 'budget-approval',
          name: 'Budget Approval',
          desk: 'Finance',
          status: 'done',
          startedAt: '2024-01-12T12:00:00Z',
          finishedAt: '2024-01-13T09:15:00Z',
          comments: [
            {
              id: 'comment-3',
              stepId: 'step-it-001-2',
              authorId: 'finance-manager',
              createdAt: '2024-01-13T09:10:00Z',
              body: 'Budget approved. Purchase order can proceed.',
              visibility: 'current_and_downstream'
            }
          ],
          requestId: 'req-sample-it-001'
        },
        {
          id: 'step-it-001-3',
          defId: 'procurement',
          name: 'Hardware Procurement',
          desk: 'Procurement',
          status: 'done',
          startedAt: '2024-01-13T09:20:00Z',
          finishedAt: '2024-01-14T16:30:00Z',
          comments: [
            {
              id: 'comment-4',
              stepId: 'step-it-001-3',
              authorId: 'procurement-agent',
              createdAt: '2024-01-14T16:25:00Z',
              body: 'Hardware ordered and delivered. Setup completed.',
              visibility: 'current_and_downstream'
            }
          ],
          requestId: 'req-sample-it-001'
        }
      ],
      timeline: [
        { at: '2024-01-12T10:15:00Z', message: 'Request submitted: Hardware Request' },
        { at: '2024-01-12T10:30:00Z', message: 'Step "IT Review" started' },
        { at: '2024-01-12T11:45:00Z', message: 'Step "IT Review" completed' },
        { at: '2024-01-12T12:00:00Z', message: 'Step "Budget Approval" is now ready for Finance' },
        { at: '2024-01-13T09:15:00Z', message: 'Step "Budget Approval" completed' },
        { at: '2024-01-13T09:20:00Z', message: 'Step "Hardware Procurement" is now ready for Procurement' },
        { at: '2024-01-14T16:30:00Z', message: 'Step "Hardware Procurement" completed' },
        { at: '2024-01-14T16:30:00Z', message: 'Request completed successfully' }
      ]
    };

    mockRequests.push(hrRequest, itRequest);
    requestIdCounter = 3;
  }
};

export class MockWorkflowEngine implements WorkflowEngine {
  private currentUserId = 'user-123'; // TODO: Get from auth context

  async startRequest(templateKey: string, formData: any): Promise<string> {
    const requestId = `req-${Date.now()}-${requestIdCounter++}`;
    
    // Simulate network delay
    await this.delay(1000);

    // Create mock steps based on template
    const steps = this.createMockSteps(templateKey, requestId);
    
    // Make first step ready
    if (steps.length > 0) {
      steps[0].status = 'ready';
      steps[0].startedAt = new Date().toISOString();
    }

    const newRequest: SubmittedRequest = {
      id: requestId,
      templateId: templateKey,
      templateVersion: 1,
      requesterId: this.currentUserId,
      createdAt: new Date().toISOString(),
      status: 'open',
      titleSnapshot: this.getServiceTitle(templateKey),
      categoryIdSnapshot: this.getCategoryFromTemplateKey(templateKey),
      formData,
      steps,
      timeline: [
        {
          at: new Date().toISOString(),
          message: `Request submitted: ${this.getServiceTitle(templateKey)}`
        },
        {
          at: new Date().toISOString(),
          message: `Step 1 (${steps[0]?.name || 'Initial Review'}) is now ready for ${steps[0]?.desk || 'processing'}`
        }
      ]
    };

    mockRequests.push(newRequest);
    
    // Simulate some progress after a delay
    setTimeout(() => this.simulateProgress(requestId), 3000);
    
    return requestId;
  }

  async getRequest(requestId: string): Promise<SubmittedRequest> {
    await this.delay(300);
    
    const request = mockRequests.find(r => r.id === requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    return { ...request }; // Return copy to prevent mutations
  }

  async getMyRequests(): Promise<SubmittedRequest[]> {
    // Initialize sample requests if needed
    initializeSampleRequests();
    
    await this.delay(500);
    
    // Return requests for current user, sorted by creation date (newest first)
    return mockRequests
      .filter(r => r.requesterId === this.currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r })); // Return copies
  }

  async getDeskTickets(desk: StepReceiver): Promise<StepInstance[]> {
    await this.delay(400);
    
    const tickets: StepInstance[] = [];
    
    for (const request of mockRequests) {
      for (const step of request.steps) {
        if (step.desk === desk && (step.status === 'ready' || step.status === 'in_progress')) {
          tickets.push({ ...step });
        }
      }
    }
    
    return tickets;
  }

  async claim(stepId: string): Promise<void> {
    await this.delay(300);
    
    const { request, step } = this.findStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);
    
    if (step.status !== 'ready') {
      throw new Error(`Step ${stepId} is not ready for claiming`);
    }
    
    step.status = 'in_progress';
    step.claimedByUserId = this.currentUserId;
    step.startedAt = new Date().toISOString();
    
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" claimed by agent`
    });
  }

  async assign(stepId: string, userId: string): Promise<void> {
    await this.delay(300);
    
    const { request, step } = this.findStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);
    
    step.assignedToUserId = userId;
    
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" assigned to user ${userId}`
    });
  }

  async advance(stepId: string, payload?: any): Promise<void> {
    await this.delay(800);
    
    const { request, step } = this.findStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);
    
    // Mark current step as done
    step.status = 'done';
    step.finishedAt = new Date().toISOString();
    
    // Find next steps
    const stepIndex = request.steps.findIndex(s => s.id === stepId);
    const nextSteps = request.steps.filter((s, index) => {
      return index > stepIndex && 
             (s.requires?.length === 0 || 
              s.requires?.every(reqId => request.steps.find(rs => rs.id === reqId)?.status === 'done'));
    });
    
    // Make next steps ready
    nextSteps.forEach(nextStep => {
      if (nextStep.status === 'pending') {
        nextStep.status = 'ready';
        nextStep.startedAt = new Date().toISOString();
      }
    });
    
    // Update timeline
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" completed`
    });
    
    if (nextSteps.length > 0) {
      nextSteps.forEach(nextStep => {
        request.timeline.push({
          at: new Date().toISOString(),
          message: `Step "${nextStep.name}" is now ready for ${nextStep.desk}`
        });
      });
    } else {
      // Check if all steps are done
      const allDone = request.steps.every(s => s.status === 'done');
      if (allDone) {
        request.status = 'completed';
        request.timeline.push({
          at: new Date().toISOString(),
          message: 'Request completed successfully'
        });
      }
    }
  }

  async comment(stepId: string, body: string): Promise<Comment> {
    await this.delay(300);
    
    const { request, step } = this.findStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);
    
    const comment: Comment = {
      id: `comment-${commentIdCounter++}`,
      stepId,
      authorId: this.currentUserId,
      createdAt: new Date().toISOString(),
      body,
      visibility: 'current_and_downstream'
    };
    
    step.comments.push(comment);
    
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Comment added to step "${step.name}"`
    });
    
    return comment;
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private findStep(stepId: string): { request: SubmittedRequest; step: StepInstance | undefined } {
    for (const request of mockRequests) {
      const step = request.steps.find(s => s.id === stepId);
      if (step) {
        return { request, step };
      }
    }
    return { request: mockRequests[0], step: undefined };
  }

  private createMockSteps(templateKey: string, requestId: string): StepInstance[] {
    const stepTemplates = this.getStepTemplates(templateKey);
    
    return stepTemplates.map((template, index) => ({
      id: `step-${requestId}-${index + 1}`,
      defId: template.id,
      name: template.name,
      desk: template.receiver,
      status: 'pending' as StepStatus,
      assignedToUserId: undefined,
      claimedByUserId: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      comments: [],
      requestId
    }));
  }

  private getStepTemplates(templateKey: string) {
    const stepTemplates = {
      'hr-onboard': [
        { id: 'hr-review', name: 'HR Review', receiver: 'HR' as StepReceiver },
        { id: 'it-setup', name: 'IT Account Setup', receiver: 'IT' as StepReceiver },
        { id: 'badge-access', name: 'Badge & Access Setup', receiver: 'Security' as StepReceiver }
      ],
      'hr-contract-change': [
        { id: 'hr-review', name: 'HR Review', receiver: 'HR' as StepReceiver },
        { id: 'legal-review', name: 'Legal Review', receiver: 'Legal' as StepReceiver },
        { id: 'approval', name: 'Final Approval', receiver: 'HR' as StepReceiver }
      ],
      'it-hardware': [
        { id: 'it-review', name: 'IT Review', receiver: 'IT' as StepReceiver },
        { id: 'budget-approval', name: 'Budget Approval', receiver: 'Finance' as StepReceiver },
        { id: 'procurement', name: 'Hardware Procurement', receiver: 'Procurement' as StepReceiver }
      ],
      'it-software-access': [
        { id: 'it-review', name: 'IT Review', receiver: 'IT' as StepReceiver },
        { id: 'security-check', name: 'Security Approval', receiver: 'Security' as StepReceiver }
      ]
    };

    return stepTemplates[templateKey as keyof typeof stepTemplates] || [
      { id: 'general-review', name: 'Review', receiver: 'Admin' as StepReceiver }
    ];
  }

  private getServiceTitle(templateKey: string): string {
    const titles = {
      'hr-onboard': 'Employee Onboarding',
      'hr-contract-change': 'Contract Change Request',
      'it-hardware': 'New Hardware Request',
      'it-software-access': 'Software Access Request'
    };
    
    return titles[templateKey as keyof typeof titles] || 'General Service Request';
  }

  private getCategoryFromTemplateKey(templateKey: string): string {
    if (templateKey.startsWith('hr-')) return 'hr';
    if (templateKey.startsWith('it-')) return 'it';
    return 'admin';
  }

  private simulateProgress(requestId: string): void {
    const request = mockRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'open') return;

    // Simulate first step progress
    const firstStep = request.steps.find(s => s.status === 'ready');
    if (firstStep) {
      firstStep.status = 'in_progress';
      firstStep.claimedByUserId = 'agent-456';
      
      request.timeline.push({
        at: new Date().toISOString(),
        message: `Step "${firstStep.name}" started by ${firstStep.desk} team`
      });

      // Complete first step after another delay
      setTimeout(() => {
        if (firstStep.status === 'in_progress') {
          this.advance(firstStep.id).catch(console.error);
        }
      }, 5000);
    }
  }
}

// Export singleton instance for app use
export const mockWorkflowEngine = new MockWorkflowEngine();
