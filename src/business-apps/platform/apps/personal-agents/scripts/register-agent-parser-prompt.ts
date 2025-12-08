/**
 * Script to register the agent parser prompt in Prompt Manager
 *
 * Usage:
 * 1. Open browser console on https://newwork-dev.newwork.com
 * 2. Copy and paste this script
 * 3. Call: await registerAgentParserPrompt('YOUR_ACCESS_TOKEN', 'YOUR_USER_ID', 'YOUR_WORKSPACE_ID')
 */

interface PromptRegistration {
  name: string
  description: string
  type: string
  systemContent: string
  userContent: string
  tools?: string[]
  modelId: string
  workspaceId: string
}

export async function registerAgentParserPrompt(
  accessToken: string,
  userId: string,
  workspaceId: string
): Promise<void> {
  const baseUrl = 'https://newwork-dev.newwork.com/prompt-manager'

  const systemPrompt = `You are an AI assistant that helps users create personal agents. 
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
      "eventType": "crm.account.activity.created|crm.opportunity.stage.changed|task.completed|hr.employee.absence.started|...",
      "filters": {
        "accountId": "...",
        "opportunityId": "...",
        "status": "...",
        "etc": "..."
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
          "message": "New activity detected on account ABC",
          "notificationTemplate": "New activity on account ABC: {{activity.type}} - {{activity.description}}"
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
          "query": "query GetNewOpportunities { opportunities(where: { createdAt: { _gte: \\"7 days ago\\" } }, order_by: { createdAt: desc }) { id name stage estimatedValue createdAt } }",
          "variables": {}
        }
      },
      {
        "type": "notification",
        "config": {
          "notificationType": "blink",
          "title": "Weekly Opportunities Report",
          "message": "Here are the new opportunities from last week",
          "notificationTemplate": "New opportunities this week: {{opportunities.length}} total"
        }
      }
    ]
  }
}

Be specific and precise. Always return valid JSON.`

  const userPrompt = `Parse this agent request and create a configuration:

"{userRequest}"

User context:
- User ID: {userId}
- Current time: {timestamp}

Respond ONLY with valid JSON matching the schema above.`

  const promptPayload: PromptRegistration = {
    name: 'agent_parser_v1',
    description: 'Parses natural language requests into Personal AI Agent configurations',
    type: 'task-expert',
    systemContent: systemPrompt,
    userContent: userPrompt,
    tools: [],
    modelId: 'gpt-4o', // or whatever model ID is configured
    workspaceId: workspaceId
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/prompts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(promptPayload)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to register prompt: ${response.status} ${error}`)
    }

    const result = await response.json()
    console.log('✅ Agent parser prompt registered successfully:', result)
    console.log('Prompt ID:', result._id)
    return result
  } catch (error) {
    console.error('❌ Failed to register prompt:', error)
    throw error
  }
}

// For manual execution in browser console:
if (typeof window !== 'undefined') {
  ;(window as any).registerAgentParserPrompt = registerAgentParserPrompt
  console.log(
    '📝 Registration function loaded. Call: await registerAgentParserPrompt(accessToken, userId, workspaceId)'
  )
}
