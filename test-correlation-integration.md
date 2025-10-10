# Testing Correlation ID Integration

## Overview

This guide helps you test the new `correlationId` based workflow query integration that replaces `localStorage` as the primary source for tracking active workflows.

## Prerequisites

1. Both services must be running:
   - `custom-flow-engine` on port 3000
   - `gravity-business-apps` on port 5173

2. Templates must be registered in the `custom-flow-engine`

## Test Steps

### 1. Start Services

```bash
# Terminal 1 - Start custom-flow-engine
cd ../custom-flow-engine
npm run dev

# Terminal 2 - Start gravity-business-apps
cd gravity-business-apps
npm run dev
```

### 2. Navigate to Opportunity Record

1. Open browser to `http://localhost:5173`
2. Navigate to an Opportunity Record page (e.g., opportunity ID: `8a8a7c88-36d1-496b-8604-420b83fe1e91`)
3. Look for the "Stage Transition Workflow" card

### 3. Test Workflow Creation

1. Click "Start Workflow" button
2. Check browser console for logs:
   - Should see: `Getting active workflows for opportunity: [opportunityId]`
   - Should see API call to: `GET /api/flow/correlation/[opportunityId]`
   - Should see workflow creation logs

### 4. Test Workflow Retrieval

1. Click "Check Existing" button
2. Check browser console for logs:
   - Should see: `API response for correlation [opportunityId]: [response]`
   - Should see: `Successfully fetched [X] workflows for opportunity [opportunityId]`

### 5. Verify Database Storage

1. Check `custom-flow-engine` logs for:
   - `INFO: Getting flows by correlation ID: [opportunityId]`
   - `SUCCESS: Retrieved [X] flows for correlation ID [opportunityId]`

### 6. Test Fallback Behavior

1. Stop the `custom-flow-engine` service
2. Click "Check Existing" button
3. Should see fallback to `localStorage` data
4. Should see: `Falling back to localStorage data...`

## Expected Results

### Success Indicators

- ✅ Workflows are created with `correlationId` in the database
- ✅ Workflows are retrieved via API call to `/api/flow/correlation/[opportunityId]`
- ✅ UI displays workflows from the API response
- ✅ Fallback to `localStorage` works when API is unavailable

### Console Logs to Look For

```
Getting active workflows for opportunity: 8a8a7c88-36d1-496b-8604-420b83fe1e91
API response for correlation 8a8a7c88-36d1-496b-8604-420b83fe1e91: {status: "success", data: {flows: [...]}}
Successfully fetched 2 workflows for opportunity 8a8a7c88-36d1-496b-8604-420b83fe1e91
```

### Network Tab

- Should see `GET /api/flow/correlation/[opportunityId]` calls
- Should see `POST /api/templates/[templateId]/execute` calls with `correlationId` in body

## Troubleshooting

### If workflows are not found:

1. Check if `custom-flow-engine` is running on port 3000
2. Verify templates are registered: `GET /api/templates`
3. Check database connection in `custom-flow-engine` logs

### If API calls fail:

1. Check CORS settings in `custom-flow-engine`
2. Verify `NEXT_PUBLIC_FLOW_ENGINE_URL` environment variable
3. Check network connectivity between services

### If TypeScript errors occur:

1. Run `npm run build` to check for compilation errors
2. Verify all imports are correct
3. Check type definitions in `stageTransition.ts`

## Next Steps

After successful testing:

1. Remove fallback `localStorage` logic (optional)
2. Implement real-time updates
3. Add comprehensive error handling
4. Implement workflow cancellation
5. Add user permissions for step approval
