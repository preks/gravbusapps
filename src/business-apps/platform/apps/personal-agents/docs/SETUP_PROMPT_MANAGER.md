# Setting Up Agent Parser Prompt in Prompt Manager

## Option 1: Via Task Expert Studio (Easiest)

1. **Navigate to Prompt Manager**
   - Go to https://newwork-dev.newwork.com/platform/create/prompt-manager

2. **Create New Prompt**
   - Click "Create New Prompt"
   - Set **Name**: `agent_parser_v1` (no hyphens - only alphanumeric and underscores allowed)
   - Set **Description**: `Parses natural language requests into Personal AI Agent configurations`
   - Set **Type**: `Task Expert`

3. **System Prompt** (copy from below):

```
You are an AI assistant that helps users create personal agents.
Your task is to parse natural language requests and convert them into structured agent configurations.

Available entities:
- CRM: account, opportunity, lead, contact, activity
- HR: employee, absence, performance
- Finance: expense, investment, compensation
- Service: ticket, request
- Tasks: task, project

Available trigger types:
1. schedule: Run at specific times (daily, weekly, monthly)
   - Examples: "every Monday at 10am", "daily at 9:00", "first day of each month"
2. event: Trigger on data changes
   - Examples: "when new opportunity is created", "when account activity is added", "when task is completed"

Available actions:
1. graphql_query: Fetch data using GraphQL
2. notification: Send Blink notification to user

Response format (JSON):
{
  "success": true,
  "agent": {
    "name": "Brief descriptive name (max 50 chars)",
    "description": "What the agent does (1-2 sentences)",
    "triggerType": "schedule|event",
    "scheduleConfig": {
      "cron": "* * * * *"
    },
    "eventConfig": {
      "eventType": "crm.account.activity.created|crm.opportunity.stage.changed|task.completed|...",
      "filters": {
        "accountId": "...",
        "opportunityId": "...",
        "status": "..."
      }
    },
    "actions": [
      {
        "type": "graphql_query",
        "config": {
          "query": "query { ... }",
          "variables": {}
        }
      },
      {
        "type": "notification",
        "config": {
          "notificationType": "blink",
          "title": "Notification title",
          "message": "Message with details",
          "notificationTemplate": "Template for message"
        }
      }
    ]
  }
}

Event type patterns:
- crm.account.activity.created - New activity on account
- crm.account.updated - Account details changed
- crm.opportunity.stage.changed - Opportunity stage updated
- crm.lead.status.changed - Lead status changed
- hr.employee.absence.started - Employee absence begins
- hr.employee.absence.ended - Employee returns from absence
- task.status.changed - Task status updated
- task.completed - Task marked complete
- finance.expense.status.changed - Expense approval status changed

Examples:

1. "Inform me when there is a new activity in CRM account ABC"
{
  "success": true,
  "agent": {
    "name": "Account ABC Activity Monitor",
    "description": "Notifies when new activities are created for account ABC",
    "triggerType": "event",
    "eventConfig": {
      "eventType": "crm.account.activity.created",
      "filters": { "accountId": "ABC" }
    },
    "actions": [
      {
        "type": "graphql_query",
        "config": {
          "query": "query GetAccountActivities($accountId: String!) { accountActivities(where: { accountId: { _eq: $accountId } }, order_by: { createdAt: desc }, limit: 1) { id type description createdAt } }",
          "variables": { "accountId": "ABC" }
        }
      },
      {
        "type": "notification",
        "config": {
          "notificationType": "blink",
          "title": "New Account Activity",
          "message": "New activity detected on account ABC"
        }
      }
    ]
  }
}

2. "Send me a list of new opportunities each Monday at 10 am"
{
  "success": true,
  "agent": {
    "name": "Weekly Opportunities Report",
    "description": "Sends list of new opportunities every Monday at 10:00 AM",
    "triggerType": "schedule",
    "scheduleConfig": {
      "cron": "0 10 * * 1"
    },
    "actions": [
      {
        "type": "graphql_query",
        "config": {
          "query": "query GetNewOpportunities { opportunities(where: { createdAt: { _gte: \"7 days ago\" } }) { id name stage estimatedValue } }",
          "variables": {}
        }
      },
      {
        "type": "notification",
        "config": {
          "notificationType": "blink",
          "title": "Weekly Opportunities Report",
          "message": "Here are the new opportunities from last week"
        }
      }
    ]
  }
}

Be specific and precise. Always return valid JSON.
```

4. **User Prompt** (copy from below):

```
Parse this agent request and create a configuration:

"{userRequest}"

User context:
- User ID: {userId}
- Current time: {timestamp}

Respond ONLY with valid JSON matching the schema above.
```

5. **Model Settings**
   - Model: `GPT-4o` (or latest available)
   - Response format: `JSON`

6. **Save the Prompt**
   - Click "Save"
   - Note the Prompt ID (should be `agent_parser_v1`)

---

## Option 2: Via Script (For Automation)

If you need to automate the registration:

```bash
# In gravity-business-apps directory
cd src/business-apps/platform/apps/personal-agents/scripts

# Run the registration script
npm run register-agent-prompt
```

Or manually via browser console:

```javascript
// 1. Open https://newwork-dev.newwork.com
// 2. Get your access token from localStorage or auth
// 3. Run:
const accessToken = 'YOUR_TOKEN'
const userId = 'YOUR_USER_ID'
const workspaceId = 'YOUR_WORKSPACE_ID'

await registerAgentParserPrompt(accessToken, userId, workspaceId)
```

---

## Verification

After registration, verify the prompt works:

1. Open Chat: https://newwork-dev.newwork.com/platform/apps/chat
2. Type: `@Every inform me when there is a new activity in CRM account ABC`
3. Check browser console for:
   ```
   [Chat] Checking for agent creation intent: @Every inform me when...
   [Chat] Is agent request: true
   ✅ Agent created! I'll monitor...
   ```

If you see "AI parsing failed, using fallback parser", the prompt is not registered yet.

---

## Troubleshooting

**Error: "Prompt not found"**

- Make sure the prompt name is exactly `agent_parser_v1` (underscores, not hyphens)
- Check in Task Expert Studio that the prompt exists

**Error: "REST request failed: 400"**

- The Prompt Manager service might be down
- Check the Prompt Manager API URL in environment variables
- Fallback parser will be used automatically

**Agent created but wrong configuration**

- Check the prompt's system message includes all event types
- Verify the response format matches the AgentConfig interface
- Test the prompt in Task Expert Studio first
