import type {
  WorkflowEngine,
  StepReceiver,
  StepInstance,
  SubmittedRequest,
  Comment,
  ServiceRequestTemplate,
  StepDefinition,
  StepStatus,
} from 'packages/services-plus-core';

/**
 * MockWorkflowEngineAdapter - In-memory implementation of WorkflowEngine interface
 * Provides full contract compliance for development and testing
 * Designed for drop-in replacement with ConductorWorkflowEngineAdapter
 */
export class MockWorkflowEngineAdapter implements WorkflowEngine {
  private requests: Map<string, SubmittedRequest> = new Map();
  private templates: Map<string, ServiceRequestTemplate> = new Map();
  private currentUserId: string = 'current-user-123';
  private requestCounter: number = 1;
  private commentCounter: number = 1;

  constructor(currentUserId?: string) {
    if (currentUserId) {
      this.currentUserId = currentUserId;
    }
    this.initializeMockTemplates();
  }

  /**
   * Initialize mock service request templates for testing
   */
  private initializeMockTemplates(): void {
    const mockTemplate: ServiceRequestTemplate = {
      id: 'template-001',
      categoryId: 'category-it',
      key: 'new-hardware-request',
      title: 'New Hardware Request',
      description: 'Request new hardware for employee',
      formSchema: {
        type: 'object',
        properties: {
          hardwareType: { type: 'string' },
          justification: { type: 'string' },
          urgency: { type: 'string', enum: ['Low', 'Medium', 'High'] },
        },
      },
      uiSchema: {},
      steps: [
        {
          id: 'step-manager-approval',
          name: 'Manager Approval',
          receiver: 'HR',
          slaHours: 24,
        },
        {
          id: 'step-procurement',
          name: 'Procurement Review',
          receiver: 'Procurement',
          requires: ['step-manager-approval'],
          slaHours: 48,
        },
        {
          id: 'step-it-fulfillment',
          name: 'IT Fulfillment',
          receiver: 'IT',
          requires: ['step-procurement'],
          slaHours: 72,
        },
      ],
      version: 1,
      enabled: true,
    };

    this.templates.set(mockTemplate.key, mockTemplate);
  }

  /**
   * Start a new service request workflow
   */
  async startRequest(templateKey: string, formData: any): Promise<string> {
    const template = this.templates.get(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    const requestId = `req-${this.requestCounter++}`;
    const now = new Date().toISOString();

    // Create step instances from template definitions
    const stepInstances: StepInstance[] = template.steps.map((stepDef) => ({
      id: `${requestId}-${stepDef.id}`,
      defId: stepDef.id,
      name: stepDef.name,
      desk: stepDef.receiver,
      status: this.getInitialStepStatus(stepDef, template.steps),
      assignedToUserId: undefined,
      claimedByUserId: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      comments: [],
      requestId,
    }));

    const request: SubmittedRequest = {
      id: requestId,
      templateId: template.id,
      templateVersion: template.version,
      requesterId: this.currentUserId,
      createdAt: now,
      status: 'open',
      titleSnapshot: template.title,
      categoryIdSnapshot: template.categoryId,
      formData,
      steps: stepInstances,
      timeline: [
        {
          at: now,
          message: `Request submitted by ${this.currentUserId}`,
        },
      ],
    };

    this.requests.set(requestId, request);

    // Start ready steps
    this.startReadySteps(requestId);

    return requestId;
  }

  /**
   * Get a specific request by ID
   */
  async getRequest(requestId: string): Promise<SubmittedRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }
    return { ...request, steps: [...request.steps] }; // Deep copy
  }

  /**
   * Get all requests for current user
   */
  async getMyRequests(): Promise<SubmittedRequest[]> {
    return Array.from(this.requests.values())
      .filter((req) => req.requesterId === this.currentUserId)
      .map((req) => ({ ...req, steps: [...req.steps] }));
  }

  /**
   * Get tickets for a specific desk
   */
  async getDeskTickets(desk: StepReceiver): Promise<StepInstance[]> {
    const tickets: StepInstance[] = [];

    for (const request of this.requests.values()) {
      for (const step of request.steps) {
        if (step.desk === desk && (step.status === 'ready' || step.status === 'in_progress')) {
          tickets.push({ ...step });
        }
      }
    }

    return tickets;
  }

  /**
   * Get detailed information for a specific ticket
   */
  async getTicketDetail(ticketId: string): Promise<StepInstance | null> {
    try {
      console.log(`[MockAdapter] Getting ticket detail for: ${ticketId}`);
      
      // Find the ticket across all requests
      for (const request of this.mockRequests) {
        const step = request.steps.find(s => s.id === ticketId);
        if (step) {
          console.log(`[MockAdapter] Found ticket detail for: ${ticketId}`);
          return step;
        }
      }
      
      console.warn(`[MockAdapter] Ticket not found: ${ticketId}`);
      return null;
    } catch (error) {
      console.error(`[MockAdapter] Error getting ticket detail:`, error);
      throw new Error(`Failed to get ticket detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim a step for the current user
   */
  async claim(stepId: string): Promise<void> {
    const { request, step } = this.findStep(stepId);
    
    if (step.status !== 'ready') {
      throw new Error(`Step ${stepId} is not ready for claiming (status: ${step.status})`);
    }

    if (step.claimedByUserId) {
      throw new Error(`Step ${stepId} is already claimed by ${step.claimedByUserId}`);
    }

    step.claimedByUserId = this.currentUserId;
    step.status = 'in_progress';
    step.startedAt = new Date().toISOString();

    // Add timeline entry
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" claimed by ${this.currentUserId}`,
    });

    // Update request status
    this.updateRequestStatus(request);
  }

  /**
   * Assign a step to a specific user
   */
  async assign(stepId: string, userId: string): Promise<void> {
    const { request, step } = this.findStep(stepId);

    if (step.status !== 'ready' && step.status !== 'in_progress') {
      throw new Error(`Step ${stepId} cannot be assigned (status: ${step.status})`);
    }

    step.assignedToUserId = userId;
    if (step.status === 'ready') {
      step.status = 'in_progress';
      step.startedAt = new Date().toISOString();
    }

    // Add timeline entry
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" assigned to ${userId}`,
    });

    // Update request status
    this.updateRequestStatus(request);
  }

  /**
   * Advance a step (mark as completed)
   */
  async advance(stepId: string, payload?: any): Promise<void> {
    const { request, step } = this.findStep(stepId);

    if (step.status !== 'in_progress') {
      throw new Error(`Step ${stepId} cannot be advanced (status: ${step.status})`);
    }

    step.status = 'done';
    step.finishedAt = new Date().toISOString();
    
    // Store form data if provided
    if (payload) {
      (step as any).formData = payload;
      console.log(`[MockAdapter] Step ${stepId} completed with form data:`, payload);
    }

    // Add timeline entry
    const formDataSummary = payload ? ' with form data' : '';
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Step "${step.name}" completed by ${step.assignedToUserId || step.claimedByUserId}${formDataSummary}`,
    });

    // Start dependent steps
    this.startReadySteps(request.id);

    // Update request status
    this.updateRequestStatus(request);
  }

  /**
   * Add a comment to a step
   */
  async comment(stepId: string, body: string): Promise<Comment> {
    const { request, step } = this.findStep(stepId);

    const comment: Comment = {
      id: `comment-${this.commentCounter++}`,
      stepId,
      authorId: this.currentUserId,
      createdAt: new Date().toISOString(),
      body,
      visibility: 'current_and_downstream',
    };

    step.comments.push(comment);

    // Add timeline entry
    request.timeline.push({
      at: new Date().toISOString(),
      message: `Comment added to "${step.name}" by ${this.currentUserId}`,
    });

    return { ...comment };
  }

  /**
   * Get comments visible to a specific step (current and upstream)
   */
  getVisibleComments(requestId: string, stepId: string): Comment[] {
    const request = this.requests.get(requestId);
    if (!request) return [];

    const template = this.templates.get('new-hardware-request'); // Simplified for mock
    if (!template) return [];

    const currentStepIndex = this.getStepExecutionOrder(request, stepId);
    const visibleComments: Comment[] = [];

    // Get comments from current and upstream steps
    for (const step of request.steps) {
      const stepIndex = this.getStepExecutionOrder(request, step.id);
      if (stepIndex <= currentStepIndex) {
        visibleComments.push(...step.comments);
      }
    }

    return visibleComments.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Calculate SLA due date for a step
   */
  calculateSLADueDate(step: StepInstance): Date | null {
    if (!step.startedAt) return null;

    const template = Array.from(this.templates.values())[0]; // Simplified for mock
    const stepDef = template?.steps.find(s => s.id === step.defId);
    
    if (!stepDef?.slaHours) return null;

    const startDate = new Date(step.startedAt);
    return new Date(startDate.getTime() + stepDef.slaHours * 60 * 60 * 1000);
  }

  /**
   * Check if step is overdue
   */
  isStepOverdue(step: StepInstance): boolean {
    const dueDate = this.calculateSLADueDate(step);
    return dueDate ? new Date() > dueDate : false;
  }

  // Private helper methods

  private findStep(stepId: string): { request: SubmittedRequest; step: StepInstance } {
    for (const request of this.requests.values()) {
      const step = request.steps.find(s => s.id === stepId);
      if (step) {
        return { request, step };
      }
    }
    throw new Error(`Step not found: ${stepId}`);
  }

  private getInitialStepStatus(stepDef: StepDefinition, allSteps: StepDefinition[]): StepStatus {
    // Step is ready if it has no dependencies
    return !stepDef.requires || stepDef.requires.length === 0 ? 'ready' : 'pending';
  }

  private startReadySteps(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) return;

    const template = this.templates.get('new-hardware-request'); // Simplified for mock
    if (!template) return;

    for (const step of request.steps) {
      if (step.status === 'pending') {
        const stepDef = template.steps.find(s => s.id === step.defId);
        if (stepDef && this.areRequirementsMet(step, request.steps)) {
          step.status = 'ready';
        }
      }
    }
  }

  private areRequirementsMet(step: StepInstance, allSteps: StepInstance[]): boolean {
    const template = this.templates.get('new-hardware-request'); // Simplified for mock
    if (!template) return true;

    const stepDef = template.steps.find(s => s.id === step.defId);
    if (!stepDef?.requires) return true;

    return stepDef.requires.every(reqId => {
      const reqStep = allSteps.find(s => s.defId === reqId);
      return reqStep?.status === 'done';
    });
  }

  private updateRequestStatus(request: SubmittedRequest): void {
    const allDone = request.steps.every(step => step.status === 'done');
    const anyInProgress = request.steps.some(step => step.status === 'in_progress' || step.status === 'ready');

    if (allDone) {
      request.status = 'completed';
    } else if (anyInProgress) {
      request.status = 'in_progress';
    }
  }

  private getStepExecutionOrder(request: SubmittedRequest, stepId: string): number {
    // Simplified order based on step index for mock
    return request.steps.findIndex(s => s.id === stepId);
  }

  // Test helper methods
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  clearAllData(): void {
    this.requests.clear();
    this.requestCounter = 1;
    this.commentCounter = 1;
  }
}
