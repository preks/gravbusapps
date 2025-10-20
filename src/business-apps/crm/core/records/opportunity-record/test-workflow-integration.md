# Stage Transition Workflow Testing Guide

## New Testing Interface

A dedicated **"Stage Transition Workflows"** card has been added to the Opportunity Record page. This card is separate from the existing StageProgression component and provides a clear interface for testing the workflow integration.

## How to Access the Testing Interface

1. **Navigate to an Opportunity Record**
   - Open your CRM application
   - Go to any opportunity record page
   - Look for the **"Stage Transition Workflows"** card (it appears after the stage progression section)

2. **Card Features**
   - Shows current stage and opportunity value
   - Displays "High Value" tag for opportunities ≥ $100,000
   - Dropdown selectors for "From Stage" and "To Stage"
   - Action buttons for testing workflows

## Testing Steps

### Step 1: Basic Setup

1. The card automatically shows your current stage
2. Select a target stage from the "To Stage" dropdown
3. Click **"Check Conditions"** to see if approval workflows are required

### Step 2: Test Different Scenarios

#### Scenario A: No Conditions Required

- **From**: New Opportunity
- **To**: In Qualification
- **Expected**: "No approval conditions required for this transition"

#### Scenario B: Single Approval Required

- **From**: New Opportunity
- **To**: In Qualification
- **Expected**: "Found 1 approval condition(s) for this transition"
- **Action**: Click **"Start Workflows"** to initiate approval

#### Scenario C: Multiple Approvals Required

- **From**: In Qualification
- **To**: Proposal In Progress
- **Expected**: "Found 2 approval condition(s) for this transition"
- **Conditions**: Budget Confirmation + Technical Review

#### Scenario D: High-Value Opportunity

- **Prerequisite**: Set opportunity value to ≥ $100,000
- **From**: In Qualification
- **To**: Proposal In Progress
- **Expected**: Additional "Executive Approval" condition appears

### Step 3: Workflow Management

#### Start New Workflows

1. After checking conditions, click **"Start Workflows"**
2. The Workflows Status Modal will open
3. You can see real-time status of each approval workflow

#### Check Existing Workflows

1. Click **"Check Existing"** to see if workflows are already running
2. If found, the modal will show current status
3. Useful for resuming interrupted testing

#### Monitor Progress

- **Pending**: Workflows waiting for approval
- **Running**: Workflows in progress
- **Completed**: All approvals received
- **Failed**: Workflows that encountered errors

### Step 4: Complete the Workflow

#### In the Custom Flow Engine

1. Navigate to the flow engine task management interface
2. Find the approval tasks for your opportunity
3. Complete the approval tasks
4. Return to the CRM opportunity record

#### In the CRM

1. The Workflows Status Modal will show "All Approvals Completed!"
2. Click **"Proceed with Stage Change"** to complete the transition
3. The opportunity stage will be updated

## Expected Behavior

### ✅ Success Indicators

- Conditions are correctly identified for stage transitions
- Workflows are created in the custom flow engine
- Real-time status updates in the modal
- High-value opportunities get additional conditions
- Error handling for API failures

### ❌ Common Issues

- **"Failed to start workflows"**: Check if flow engine is running
- **"No conditions found"**: Verify stage names match configuration
- **Modal doesn't open**: Check browser console for errors
- **Workflows not appearing**: Verify opportunity ID and stage names

## Debug Information

### Environment Variables

Make sure `NEXT_PUBLIC_FLOW_ENGINE_URL` is set in your `.env` file:

```
NEXT_PUBLIC_FLOW_ENGINE_URL=http://localhost:3000
```

### API Endpoints to Test

```bash
# Check if flow engine is running
curl http://localhost:3000/api/templates

# Check active workflows for an opportunity
curl "http://localhost:3000/api/flow?entityId=OPP123&entityType=OPPORTUNITY&status=RUNNING"
```

### Browser Developer Tools

- **Network Tab**: Monitor API calls to the flow engine
- **Console Tab**: Check for JavaScript errors
- **Application Tab**: Verify environment variables are loaded

## Test Cases Summary

| From Stage           | To Stage             | Expected Conditions    | High Value Additional |
| -------------------- | -------------------- | ---------------------- | --------------------- |
| New Opportunity      | In Qualification     | 1 (Manager Approval)   | None                  |
| In Qualification     | Proposal In Progress | 2 (Budget + Technical) | Executive Approval    |
| Proposal In Progress | Negotiation          | 2 (Acceptance + Legal) | None                  |
| Negotiation          | Closed               | 1 (Final Approval)     | None                  |

## Next Steps After Testing

1. **Create Production Workflow Templates** in the custom flow engine
2. **Configure User Assignments** for your organizational structure
3. **Set Up Monitoring** for workflow completion
4. **Document Templates** for your team's reference

## Troubleshooting

### Flow Engine Not Accessible

```bash
cd custom-flow-engine
docker-compose ps  # Check if containers are running
docker-compose logs flow-engine  # Check for errors
```

### Environment Variable Issues

- Verify `.env` file exists in project root
- Restart development server after adding environment variables
- Check browser console for environment variable loading

### Workflow Template Issues

- Ensure workflow templates are created in the flow engine
- Verify template IDs match the configuration
- Check template structure and assignment configurations
