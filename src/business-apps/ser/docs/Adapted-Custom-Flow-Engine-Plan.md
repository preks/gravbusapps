# Adapted Custom Flow Engine Integration Plan for Services+

## 🎯 **Based on CRM Implementation Analysis**

After examining the `feature/crm-conditions-igor` branch, I've found an **excellent integration pattern** that we can adapt for Services+. The CRM implementation provides a perfect blueprint for Service Desk and Service Portal integration.

## 📋 **CRM Integration Insights**

### **🔧 Key Architecture Pattern**
```typescript
// CRM Pattern: WorkflowStatusService.ts
class WorkflowStatusService {
  private static readonly FLOW_ENGINE_BASE_URL = process.env.NEXT_PUBLIC_FLOW_ENGINE_URL || 'http://localhost:3000';
  
  // Environment-based configuration
  // Persistent storage with localStorage fallback
  // Direct REST API integration
  // Strong TypeScript interfaces
}
```

### **🌐 API Integration Pattern**
```typescript
// CRM Uses These Exact Endpoints:
POST /api/templates/{templateId}/execute  // Start workflow
GET /api/flow/correlation/{correlationId} // Get workflows by entity
GET /api/flow/{flowId}                   // Get workflow details
GET /api/tasks/user/{userId}             // Get user tasks (PERFECT for Service Desk!)
POST /api/tasks/{taskId}/claim           // Claim task (PERFECT for Service Desk!)
POST /api/tasks/{taskId}/complete        // Complete task (PERFECT for Service Desk!)
```

### **🎯 Perfect Services+ Mapping**
| Services+ Need | CRM Implementation | Custom Flow Engine API |
|---------------|-------------------|----------------------|
| `startRequest()` | `executeWorkflow()` | `POST /api/templates/{id}/execute` |
| `getDeskTickets(desk)` | Similar pattern | `GET /api/tasks/user/{userId}` + filtering |
| `claim(stepId)` | Manual approval | `POST /api/tasks/{taskId}/claim` |
| `assign(stepId, userId)` | Workflow assignment | `POST /api/tasks/{taskId}/reassign` |
| `advance(stepId)` | `completeWorkflowStep()` | `POST /api/tasks/{taskId}/complete` |
| `getRequest(requestId)` | `getWorkflowDetails()` | `GET /api/flow/{flowId}` |
| `comment(stepId, body)` | Comments system | `GET/POST /api/flow/{flowId}/comments` |

## 🚀 **Adapted Implementation Plan**

### **Phase 1: Core Service Integration (Week 1)**

#### **1.1 Create CustomFlowEngineService**
Based on CRM's `WorkflowStatusService.ts`:

```typescript
// src/business-apps/ser/services/CustomFlowEngineService.ts
export class CustomFlowEngineService {
  private static readonly FLOW_ENGINE_BASE_URL = process.env.NEXT_PUBLIC_FLOW_ENGINE_URL || 'http://localhost:3000';
  private static readonly STORAGE_KEY = 'services_plus_requests';

  // API Methods
  static async startServiceRequest(templateKey: string, formData: any, accessToken: string): Promise<string> {
    const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/templates/${templateKey}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        correlationId: crypto.randomUUID(), // Service request ID
        runtimeParameters: {
          serviceType: templateKey,
          requesterId: getCurrentUserId(),
          submittedAt: new Date().toISOString(),
          ...formData
        },
        context: {
          entityType: 'SERVICE_REQUEST',
          serviceCategory: this.getServiceCategoryFromTemplate(templateKey)
        }
      })
    });
    
    const result = await response.json();
    return result.data.workflowId; // This becomes our requestId
  }

  static async getDeskTickets(desk: StepReceiver, userId: string, accessToken: string): Promise<StepInstance[]> {
    // Get tasks assigned to capability (desk)
    const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/tasks/user/${userId}?capability=${desk}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const tasks = await response.json();
    return tasks.map(this.mapTaskToStepInstance);
  }

  static async claimTicket(stepId: string, userId: string, accessToken: string): Promise<void> {
    await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/tasks/${stepId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    });
  }

  static async assignTicket(stepId: string, userId: string, assigneeId: string, accessToken: string): Promise<void> {
    await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/tasks/${stepId}/reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ currentUserId: userId, newUserId: assigneeId })
    });
  }

  static async advanceTicket(stepId: string, payload: any, accessToken: string): Promise<void> {
    await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/tasks/${stepId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ outputData: payload })
    });
  }

  static async getServiceRequest(requestId: string, accessToken: string): Promise<SubmittedRequest> {
    const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/${requestId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const flow = await response.json();
    return this.mapFlowToSubmittedRequest(flow);
  }

  static async addComment(stepId: string, body: string, authorId: string, accessToken: string): Promise<Comment> {
    // Implementation for comments
    const response = await fetch(`${this.FLOW_ENGINE_BASE_URL}/api/flow/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        stepId,
        body,
        authorId,
        visibility: 'current_and_downstream'
      })
    });
    
    return response.json();
  }

  // Mapping utilities
  private static mapTaskToStepInstance(task: any): StepInstance {
    return {
      id: task.id,
      defId: task.type,
      name: task.title,
      desk: this.mapCapabilityToDesk(task.assignment?.targets?.capabilities?.[0]),
      status: this.mapTaskStatusToStepStatus(task.status),
      assignedToUserId: task.assignment?.assignedTo,
      claimedByUserId: task.assignment?.assignedTo, // Same in this context
      startedAt: task.scheduledAt,
      finishedAt: task.completed ? new Date().toISOString() : undefined,
      comments: [], // Fetch separately if needed
      requestId: task.flowId
    };
  }

  private static mapTaskStatusToStepStatus(taskStatus: string): StepStatus {
    switch (taskStatus) {
      case 'OPEN': return 'ready';
      case 'IN_PROGRESS': return 'in_progress';
      case 'COMPLETED': return 'done';
      case 'REJECTED': return 'canceled';
      default: return 'pending';
    }
  }

  private static mapCapabilityToDesk(capability: string): StepReceiver {
    // Map capability to desk based on Services+ taxonomy
    if (capability?.includes('IT')) return 'IT';
    if (capability?.includes('HR')) return 'HR';
    if (capability?.includes('FINANCE')) return 'Finance';
    // ... more mappings
    return 'Admin'; // Default fallback
  }
}
```

#### **1.2 Create CustomFlowEngineAdapter**
Replace MockWorkflowEngineAdapter:

```typescript
// src/business-apps/ser/services/CustomFlowEngineAdapter.ts
export class CustomFlowEngineAdapter implements WorkflowEngine {
  constructor(
    private config: { baseUrl: string; accessToken: string }
  ) {}

  async startRequest(templateKey: string, formData: any): Promise<string> {
    return CustomFlowEngineService.startServiceRequest(templateKey, formData, this.config.accessToken);
  }

  async getRequest(requestId: string): Promise<SubmittedRequest> {
    return CustomFlowEngineService.getServiceRequest(requestId, this.config.accessToken);
  }

  async getMyRequests(): Promise<SubmittedRequest[]> {
    // Get all requests for current user
    const userId = getCurrentUserId();
    return CustomFlowEngineService.getMyServiceRequests(userId, this.config.accessToken);
  }

  async getDeskTickets(desk: StepReceiver): Promise<StepInstance[]> {
    const userId = getCurrentUserId();
    return CustomFlowEngineService.getDeskTickets(desk, userId, this.config.accessToken);
  }

  async claim(stepId: string): Promise<void> {
    const userId = getCurrentUserId();
    return CustomFlowEngineService.claimTicket(stepId, userId, this.config.accessToken);
  }

  async assign(stepId: string, assigneeId: string): Promise<void> {
    const userId = getCurrentUserId();
    return CustomFlowEngineService.assignTicket(stepId, userId, assigneeId, this.config.accessToken);
  }

  async advance(stepId: string, payload?: any): Promise<void> {
    return CustomFlowEngineService.advanceTicket(stepId, payload, this.config.accessToken);
  }

  async comment(stepId: string, body: string): Promise<Comment> {
    const userId = getCurrentUserId();
    return CustomFlowEngineService.addComment(stepId, body, userId, this.config.accessToken);
  }
}
```

#### **1.3 Update WorkflowEngineProvider**
```typescript
// src/business-apps/ser/services/workflowEngineProvider.ts
export function getWorkflowEngine(): WorkflowEngine {
  const flowEngineUrl = env('NEXT_PUBLIC_FLOW_ENGINE_URL');
  
  if (process.env.NODE_ENV === 'development' && !flowEngineUrl) {
    console.warn('NEXT_PUBLIC_FLOW_ENGINE_URL not set, using MockWorkflowEngineAdapter');
    return getMockWorkflowEngine();
  }
  
  return new CustomFlowEngineAdapter({
    baseUrl: flowEngineUrl,
    accessToken: getCurrentAccessToken()
  });
}
```

### **Phase 2: Service Templates Creation (Week 2)**

#### **2.1 HR Service Templates**
Based on CRM's template structure:

```typescript
// Register in custom-flow-engine
const hrOnboardingTemplate = {
  type: 'SELF_SERVICE',
  name: 'Employee Onboarding',
  description: 'Complete employee onboarding process',
  version: 1,
  initStep: {
    title: 'New Employee Information',
    form: [
      { type: 'TEXT', name: 'firstName', label: 'First Name', required: true },
      { type: 'TEXT', name: 'lastName', label: 'Last Name', required: true },
      { type: 'DATE', name: 'startDate', label: 'Start Date', required: true },
      { type: 'SELECT', name: 'department', label: 'Department', options: [...] }
    ]
  },
  steps: [
    {
      type: 'TASK',
      title: 'Setup IT Account',
      assignment: {
        targets: { capabilities: ['IT_Manager'] },
        assignmentMode: 'CLAIM',
        allowReassignment: true
      },
      dueInMinutes: 1440, // 24 hours
      form: [
        { type: 'TEXT', name: 'username', label: 'Username' },
        { type: 'SELECT', name: 'laptop', label: 'Laptop Type' }
      ]
    },
    {
      type: 'TASK',
      title: 'HR Documentation',
      assignment: {
        targets: { capabilities: ['HR_Manager'] },
        assignmentMode: 'CLAIM'
      },
      dueInMinutes: 2880 // 48 hours
    }
  ]
};
```

#### **2.2 IT Service Templates**
```typescript
const itLicenseRequestTemplate = {
  type: 'SELF_SERVICE',
  name: 'Software License Request',
  description: 'Request new software licenses',
  version: 1,
  initStep: {
    title: 'License Request Details',
    form: [
      { type: 'SELECT', name: 'software', label: 'Software', options: ['Office 365', 'Adobe Creative', 'Visual Studio'] },
      { type: 'NUMBER', name: 'licenseCount', label: 'Number of Licenses', required: true },
      { type: 'TEXTAREA', name: 'businessJustification', label: 'Business Justification', required: true }
    ]
  },
  steps: [
    {
      type: 'TASK',
      title: 'IT Review',
      assignment: {
        targets: { capabilities: ['IT_Manager'] },
        assignmentMode: 'CLAIM'
      },
      dueInMinutes: 1440
    },
    {
      type: 'APPROVAL',
      title: 'Budget Approval',
      assignment: {
        targets: { capabilities: ['Finance_Manager'] },
        assignmentMode: 'CLAIM'
      },
      dueInMinutes: 2880
    },
    {
      type: 'TASK',
      title: 'License Provisioning',
      assignment: {
        targets: { capabilities: ['IT_Administrator'] },
        assignmentMode: 'ASSIGN'
      },
      dueInMinutes: 720
    }
  ]
};
```

### **Phase 3: Environment & Configuration (Week 1)**

#### **3.1 Environment Variables**
```bash
# .env
NEXT_PUBLIC_FLOW_ENGINE_URL=http://localhost:3000
CUSTOM_FLOW_ENGINE_API_PREFIX=api/v1
```

#### **3.2 Template Registration Script**
Adapt CRM's registration script:

```bash
#!/bin/bash
# scripts/register-services-plus-templates.sh

DEFAULT_FLOW_ENGINE_URL="http://localhost:3000"
FLOW_ENGINE_URL="${1:-$DEFAULT_FLOW_ENGINE_URL}"

echo "🚀 Registering Services+ workflow templates with custom-flow-engine at $FLOW_ENGINE_URL"

# HR Templates
echo "📋 Registering HR templates..."
curl -X POST "$FLOW_ENGINE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d @templates/hr-onboarding.json

curl -X POST "$FLOW_ENGINE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d @templates/hr-offboarding.json

# IT Templates  
echo "💻 Registering IT templates..."
curl -X POST "$FLOW_ENGINE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d @templates/it-license-request.json

curl -X POST "$FLOW_ENGINE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d @templates/it-hardware-request.json

# Travel Templates
echo "✈️ Registering Travel templates..."
curl -X POST "$FLOW_ENGINE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d @templates/travel-booking.json

echo "✅ Services+ templates registered successfully!"
```

### **Phase 4: Real-time Updates (Week 3)**

#### **4.1 WebSocket Integration**
Based on CRM's polling pattern, add WebSocket for real-time updates:

```typescript
// src/business-apps/ser/hooks/useWebSocketUpdates.ts
export const useWebSocketUpdates = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const flowEngineUrl = env('NEXT_PUBLIC_FLOW_ENGINE_URL');
    const wsUrl = flowEngineUrl.replace('http', 'ws') + '/api/tasks/subscribe';
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'task:claimed':
          // Update task list optimistically
          updateTaskInList(data.taskId, { claimedByUserId: data.userId });
          showToast('Task claimed', 'success');
          break;
          
        case 'task:completed':
          // Update task status
          updateTaskInList(data.taskId, { status: 'done' });
          showToast('Task completed', 'success');
          break;
          
        case 'task:assigned':
          // Update assignment
          updateTaskInList(data.taskId, { assignedToUserId: data.assigneeId });
          showToast('Task assigned', 'info');
          break;
      }
    };
    
    setSocket(ws);
    
    return () => ws.close();
  }, []);
  
  return socket;
};
```

### **Phase 5: Service Portal Integration (Week 2)**

#### **5.1 Service Catalog with Templates**
```typescript
// src/business-apps/ser/apps/service-portal/components/ServiceCatalog.tsx
export const ServiceCatalog = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [templates, setTemplates] = useState<ServiceRequestTemplate[]>([]);
  
  useEffect(() => {
    // Fetch available templates from custom-flow-engine
    CustomFlowEngineService.getAvailableTemplates(accessToken)
      .then(setTemplates);
  }, []);
  
  const handleServiceRequest = async (templateKey: string, formData: any) => {
    try {
      const requestId = await CustomFlowEngineService.startServiceRequest(
        templateKey, 
        formData, 
        accessToken
      );
      
      showToast('Service request submitted successfully', 'success');
      navigate(`/portal/my-requests/${requestId}`);
    } catch (error) {
      showToast('Failed to submit service request', 'error');
    }
  };
  
  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
      {templates.map(template => (
        <ServiceRequestCard
          key={template.id}
          template={template}
          onSubmit={(formData) => handleServiceRequest(template.key, formData)}
        />
      ))}
    </div>
  );
};
```

## 📊 **Implementation Benefits**

### **✅ Proven Pattern**
- Based on working CRM integration
- Same API endpoints and patterns
- Tested error handling and fallbacks
- Strong TypeScript interfaces

### **🚀 Rapid Development**
- Copy-paste-adapt pattern from CRM
- Minimal new architecture decisions
- Proven environment configuration
- Ready-to-use template registration

### **🎯 Perfect API Match**
- No complex adapters needed
- Direct REST API usage
- Real-time capabilities ready
- Full Services+ feature coverage

## 🎯 **Updated Roadmap**

### **Week 1: Foundation**
- ✅ Create CustomFlowEngineService (based on WorkflowStatusService)
- ✅ Create CustomFlowEngineAdapter (replace Mock)
- ✅ Update environment configuration
- ✅ Test basic operations (claim, assign, complete)

### **Week 2: Templates & Portal**
- ✅ Create HR/IT/Travel service templates
- ✅ Register templates in custom-flow-engine
- ✅ Build Service Portal catalog integration
- ✅ Test end-to-end request submission

### **Week 3: Real-time & Polish**
- ✅ Add WebSocket real-time updates
- ✅ Implement notification system
- ✅ Performance optimization
- ✅ Error handling and monitoring

### **Week 4: Production Ready**
- ✅ Security review and access controls
- ✅ Load testing with realistic data
- ✅ Documentation and team training
- ✅ Production deployment preparation

## 💡 **Key Success Factors**

### **🔄 Reuse CRM Pattern**
1. **Copy** `WorkflowStatusService.ts` architecture
2. **Adapt** methods for Services+ domain
3. **Extend** with Service Desk specific features
4. **Leverage** proven error handling

### **⚡ Rapid Implementation**  
1. **Use** existing CRM environment setup
2. **Reuse** template registration scripts
3. **Adapt** TypeScript interfaces
4. **Copy** localStorage fallback pattern

### **🎯 Focus on Business Value**
1. **Prioritize** core Service Desk operations
2. **Implement** Service Portal catalog second
3. **Add** real-time features third
4. **Polish** with advanced features last

## 🚀 **Next Steps**

**Start this week with Phase 1** - the CRM pattern gives us a **perfect blueprint** for Services+ integration. We can have a working custom-flow-engine integration in **days, not weeks**!

**This eliminates our biggest production blocker while leveraging proven, working code.** 🎯

---

## 📋 **Implementation Checklist**

### **Phase 1: Core Integration ✅**
- [ ] Copy and adapt `WorkflowStatusService.ts` 
- [ ] Create `CustomFlowEngineAdapter.ts`
- [ ] Update `workflowEngineProvider.ts`
- [ ] Add environment variables
- [ ] Test basic API connectivity

### **Phase 2: Service Templates ✅**  
- [ ] Create HR service templates
- [ ] Create IT service templates
- [ ] Create Travel service templates
- [ ] Register templates via script
- [ ] Test template execution

### **Phase 3: Service Portal ✅**
- [ ] Build service catalog component
- [ ] Implement form rendering
- [ ] Add request submission flow
- [ ] Create "My Requests" page
- [ ] Test end-to-end submission

### **Phase 4: Real-time & Production ✅**
- [ ] Add WebSocket real-time updates
- [ ] Implement notification system
- [ ] Performance testing
- [ ] Security review
- [ ] Production deployment

**Ready to start Phase 1 immediately!** 🚀
