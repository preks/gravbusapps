# Opportunity Stage Transition Conditions with Custom Flow Engine

## 🎯 Overview

Integration plan to use custom-flow-engine for handling stage transition conditions in opportunity management. This approach uses API-only integration without creating new database tables, leveraging the existing custom-flow-engine infrastructure.

## 🏗️ Architecture

### Core Concept
- Use custom-flow-engine API to execute and track workflow statuses
- No local database tables needed - all tracking via API calls
- Stage transitions require workflow completion before allowing changes

### Key Components
1. **Stage Transition Conditions** (Configuration-based)
2. **Workflow Status Service** (API integration)
3. **Enhanced Stage Progression Component**
4. **Workflow Status Modals**

## 📋 Implementation Plan

### Phase 1: Foundation (Week 1) ✅ COMPLETED
- [x] Define stage transition conditions configuration
- [x] Implement WorkflowStatusService with API-only approach
- [x] Add TypeScript interfaces and types
- [x] Create workflow templates in custom-flow-engine

### Phase 2: Integration (Week 2) ✅ COMPLETED
- [x] Enhance StageProgression component to check conditions
- [x] Create WorkflowsStatusModal component
- [x] Integrate with custom-flow-engine API
- [x] Add workflow execution and status checking

### Phase 3: Testing & Polish (Week 3) 🔄 IN PROGRESS
- [x] Error handling and loading states
- [x] UI/UX polish and documentation
- [ ] Unit tests for service methods
- [ ] Integration tests for workflow execution

## 🔧 Technical Implementation

### 1. Stage Transition Condition Definition
```typescript
interface StageTransitionCondition {
  id: string;
  fromStage: string;
  toStage: string;
  pipelineId: string;
  conditions: {
    type: 'APPROVAL' | 'TASK_COMPLETION' | 'DATA_VALIDATION';
    flowTemplateId: string;
    requiredAssignments?: AssignmentTarget;
    autoAssign?: boolean;
    timeoutMinutes?: number;
  }[];
  isActive: boolean;
}
```

### 2. Workflow Status Service
- `getActiveWorkflows()` - Query custom-flow-engine for active workflows
- `startStageTransitionWorkflow()` - Execute workflow for conditions
- `checkWorkflowsCompleted()` - Verify all workflows are completed
- `getWorkflowDetails()` - Get detailed workflow status

### 3. Enhanced Stage Progression
- Check for transition conditions before allowing stage changes
- Show workflow status modal for pending approvals
- Allow stage change only when all workflows are completed

### 4. Workflow Templates
- Standard approval workflow template
- Manager approval template for high-value opportunities
- Configurable assignment targets and timeouts

## 🎯 Benefits

1. **No Database Changes** - Uses existing custom-flow-engine infrastructure
2. **Real-time Status** - Always get current workflow status from source
3. **Simplified Architecture** - No data synchronization needed
4. **Scalable** - Leverages custom-flow-engine's built-in scalability
5. **Consistent** - Single source of truth for workflow status
6. **Maintenance** - Less code to maintain and fewer failure points

## 📁 File Structure

```
src/business-apps/crm/common/apps/opportunity-record/
├── services/
│   └── WorkflowStatusService.ts
├── components/
│   ├── WorkflowsStatusModal.tsx
│   └── WorkflowStatusItem.tsx
├── types/
│   └── stageTransition.ts
├── config/
│   └── stageTransitionConditions.ts
└── docs/
    └── stage-transition-plan.md
```

## 🔄 Workflow

1. User clicks on stage in StageProgression component
2. System checks for transition conditions (from config)
3. If conditions exist, check for active workflows
4. If no active workflows, start new workflow(s)
5. Show workflow status modal
6. Allow stage change only when all workflows complete
7. Update opportunity stage via existing API

## 🚀 Next Steps

1. Create configuration file for stage transition conditions
2. Implement WorkflowStatusService
3. Enhance StageProgression component
4. Create workflow status UI components
5. Test integration with custom-flow-engine
6. Add error handling and loading states 