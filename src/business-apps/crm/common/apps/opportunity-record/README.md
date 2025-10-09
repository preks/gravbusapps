# Opportunity Record - Stage Transition Workflows

This module integrates with the custom-flow-engine to handle opportunity stage transition conditions and approvals.

## Overview

The opportunity record now supports conditional stage transitions that require approval workflows before allowing stage changes. This ensures proper governance and approval processes for critical stage transitions.

## Features

- **Conditional Stage Transitions**: Define conditions that must be met before stage changes
- **Workflow Integration**: Seamless integration with custom-flow-engine
- **Real-time Status**: Live tracking of approval workflow status
- **Flexible Configuration**: Configurable conditions based on pipeline and opportunity value
- **User-friendly UI**: Clear workflow status display and management

## Architecture

### Components

1. **StageProgression**: Enhanced to check conditions and manage workflows
2. **WorkflowsStatusModal**: Displays workflow status and progress
3. **WorkflowStatusItem**: Individual workflow status display
4. **WorkflowStatusService**: API integration with custom-flow-engine

### Configuration

Stage transition conditions are defined in `config/stageTransitionConditions.ts`:

```typescript
export const DEFAULT_STAGE_TRANSITION_CONDITIONS: StageTransitionCondition[] = [
  {
    id: 'discovery-to-qualification',
    fromStage: 'Discovery',
    toStage: 'Qualification',
    pipelineId: 'default-pipeline',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'opportunity-stage-approval',
        requiredAssignments: {
          organizationalUnits: ['SALES_MANAGEMENT'],
          capabilities: ['OPPORTUNITY_APPROVAL']
        }
      }
    ]
  }
]
```

## Usage

### Basic Stage Transition

```typescript
import { useWorkflowStatus } from './hooks/useWorkflowStatus'

const { checkStageTransitionConditions, startStageTransitionWorkflows } = useWorkflowStatus({
  opportunityId,
  accessToken
})

// Check if conditions exist
const conditions = checkStageTransitionConditions('Discovery', 'Qualification')

if (conditions.length > 0) {
  // Start approval workflows
  await startStageTransitionWorkflows(conditions, opportunityData)
}
```

### Workflow Status Monitoring

```typescript
import { WorkflowsStatusModal } from './components/WorkflowsStatusModal';

<WorkflowsStatusModal
  visible={modalVisible}
  workflows={activeWorkflows}
  opportunityId={opportunityId}
  fromStage="Discovery"
  toStage="Qualification"
  opportunityData={opportunityData}
  accessToken={accessToken}
  onWorkflowsCompleted={handleStageChange}
  onCancel={handleCancel}
/>
```

## API Integration

The module integrates with the custom-flow-engine via REST API:

- **Workflow Execution**: `POST /api/templates/{id}/execute`
- **Workflow Status**: `GET /api/flow/{id}`
- **Active Workflows**: `GET /api/flow?entityId={id}&entityType=OPPORTUNITY`

## Configuration

### Environment Variables

```bash
NEXT_PUBLIC_FLOW_ENGINE_URL=http://localhost:3000
```

### Workflow Templates

The following workflow templates should be created in the custom-flow-engine:

1. **opportunity-stage-approval**: Standard approval workflow
2. **high-value-opportunity-approval**: High-value opportunity approval

## Workflow

1. User clicks on stage in StageProgression
2. System checks for transition conditions
3. If conditions exist:
   - Check for existing active workflows
   - If none exist, start new workflows
   - Show workflow status modal
4. User monitors approval progress
5. Once all workflows complete, stage change is allowed
6. Opportunity stage is updated

## Error Handling

- API failures are gracefully handled with user-friendly messages
- Fallback to direct stage change if workflow system is unavailable
- Loading states and error displays for better UX

## Testing

The implementation includes comprehensive error handling and loading states. Test scenarios:

1. **No Conditions**: Direct stage change
2. **With Conditions**: Workflow initiation and monitoring
3. **API Failures**: Graceful degradation
4. **Workflow Completion**: Automatic stage change

## Future Enhancements

- Admin interface for condition configuration
- Email notifications for pending approvals
- Workflow analytics and reporting
- Integration with other business processes
