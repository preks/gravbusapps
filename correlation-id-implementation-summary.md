# Correlation ID Implementation Summary

## What Was Implemented

### 1. Backend Changes (custom-flow-engine)

#### New Database Query Method

- **File**: `src/services/database/postgresWorkflowService.ts`
- **Method**: `getWorkflowsByCorrelationId(correlationId: string)`
- **Purpose**: Queries the `user_tasks` table to find workflows by `correlationId` stored in `input_data`

#### New API Endpoint

- **File**: `src/controllers/flowController.ts`
- **Method**: `getFlowsByCorrelationId(req, res)`
- **Purpose**: Exposes the database query via REST API

#### New Route

- **File**: `src/routes/flowRoutes.ts`
- **Route**: `GET /api/flow/correlation/:correlationId`
- **Purpose**: Maps the endpoint to the controller method

#### Workflow Input Enhancement

- **File**: `src/services/template/templateExecutionService.ts`
- **Change**: Modified `prepareWorkflowInput` to include `correlationId` in workflow input
- **Purpose**: Ensures `correlationId` is stored with each workflow in Conductor

### 2. Frontend Changes (gravity-business-apps)

#### Workflow Execution Enhancement

- **File**: `src/business-apps/crm/common/apps/opportunity-record/services/WorkflowStatusService.ts`
- **Change**: Added `correlationId: opportunityId` to `prepareWorkflowExecutionParams`
- **Purpose**: Passes the opportunity ID as correlation ID to the workflow engine

#### Primary Data Source Change

- **File**: `src/business-apps/crm/common/apps/opportunity-record/services/WorkflowStatusService.ts`
- **Method**: `getActiveWorkflows()`
- **Change**: Now uses `GET /api/flow/correlation/${opportunityId}` as primary source
- **Fallback**: Still uses `localStorage` if API fails

#### Type Safety Improvements

- **File**: `src/business-apps/crm/common/apps/opportunity-record/services/WorkflowStatusService.ts`
- **Change**: Added proper TypeScript type casting for `localStorage` operations
- **Purpose**: Fixed TypeScript compilation errors

## How It Works

### 1. Workflow Creation

```
Frontend → POST /api/templates/{templateId}/execute
  ↓
Body includes: { correlationId: "opportunityId", ... }
  ↓
custom-flow-engine stores correlationId in workflow input
  ↓
Workflow is created in Conductor with correlationId
```

### 2. Workflow Retrieval

```
Frontend → GET /api/flow/correlation/{opportunityId}
  ↓
custom-flow-engine queries database for workflows with matching correlationId
  ↓
Returns workflow list with progress, status, etc.
  ↓
Frontend displays workflows from API response
```

### 3. Fallback Mechanism

```
If API call fails:
  ↓
Fallback to localStorage data
  ↓
Display workflows from local storage
```

## Benefits

1. **Server-Side Tracking**: Workflows are now tracked in the database, not just browser storage
2. **Scalability**: Multiple users can see the same workflow status
3. **Persistence**: Workflow data survives browser restarts, cache clears, etc.
4. **Reliability**: Fallback mechanism ensures UI continues to work even if API is down
5. **Future-Proof**: `correlationId` is generic and can be used for other entities (projects, leads, etc.)

## Testing

Use the `test-correlation-integration.md` guide to verify the implementation works correctly.

## Next Steps

1. **Remove localStorage dependency** (optional - currently serves as fallback)
2. **Implement real-time updates** (polling or WebSocket)
3. **Add comprehensive error handling**
4. **Implement workflow cancellation**
5. **Add user permissions for step approval**
6. **Add audit trail for approvals**
