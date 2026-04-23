# Personal AI Agents - Implementation Guide

## Overview

Personal AI Agents allow users to create autonomous agents that monitor events, run on schedules, and send notifications. Users can create agents naturally through chat by messaging @Every.

## Architecture

### Components

1. **Frontend (gravity-business-apps)**
   - Type definitions: `src/business-apps/platform/apps/personal-agents/types/`
   - Services: `src/business-apps/platform/apps/personal-agents/services/`
   - Hooks: `src/business-apps/platform/apps/personal-agents/hooks/`
   - Components: `src/business-apps/platform/apps/personal-agents/components/`
   - Chat integration: `src/business-apps/platform/apps/chat/hooks/usePersonalAgentIntegration.ts`

2. **Backend Services Required**
   - Prompt Manager: Parses natural language into agent configs
   - custom-flow-engine: Stores agents, executes schedules/events
   - Notification service: Sends Blink notifications

### Data Flow

```
User: "@Every inform me when there's activity in account ABC"
    ↓
Chat detects agent creation intent
    ↓
Agent Parser Service (uses Prompt Manager AI)
    ↓
Parse Result shown in confirmation dialog
    ↓
User confirms → Agent Registry Service creates agent
    ↓
Backend stores agent + schedules execution
    ↓
Agent triggers (schedule/event)
    ↓
Agent Actions Service executes (query + notify)
    ↓
Blink notification sent to user's EveryBox
```

## User Experience

### Creating an Agent

1. User types in chat: `@Every inform me when there is new activity in CRM account ABC`
2. System detects agent creation intent
3. AI parses the request into structured config
4. Confirmation dialog shows:
   - Agent name and description
   - Trigger configuration (event/schedule)
   - Actions to perform
   - Confidence score
5. User confirms
6. Agent is created (initially paused)
7. User can activate in Agent Management UI

### Example Requests

**Event-based:**

- "inform me when there is a new activity in CRM account ABC"
- "notify me when an expense needs approval"
- "alert me when an opportunity moves to closing stage"

**Schedule-based:**

- "send me a list of new opportunities each Monday at 10 am"
- "remind me every Friday at 5pm to review pending expenses"
- "send me a weekly summary of new contacts"

## Integration with Chat

### Detection

The system detects agent creation patterns in messages containing @Every:

```typescript
// Patterns detected:
;-'inform me when...' -
  'notify me when...' -
  'send me ... every/each ...' -
  'remind me...' -
  'alert me...' -
  'monitor...' -
  'watch for...'
```

### Modified Chat Flow

```typescript
// In Chat.tsx handleSendMessage
const {
  showAgentDialog,
  currentParseResult,
  processMessageForAgentCreation,
  confirmAgentCreation,
  cancelAgentCreation
} = usePersonalAgentIntegration(context)

// Before sending to AI
if (hasEveryMention(entityReferences)) {
  const isAgentRequest = await processMessageForAgentCreation(
    content,
    currentModule
  )

  if (isAgentRequest) {
    // Show confirmation dialog instead of sending to AI chat
    return
  }

  // Otherwise, process as normal AI chat
  sendToEveryAI(content)
}

// Render dialog
<AgentCreationDialog
  isOpen={showAgentDialog}
  parseResult={currentParseResult}
  onConfirm={async () => {
    const agent = await confirmAgentCreation()
    if (agent) {
      // Show success message in chat
      showToast(`Agent "${agent.name}" created successfully!`)
    }
  }}
  onCancel={cancelAgentCreation}
/>
```

## Backend Implementation Requirements

### 1. Agent Registry API (custom-flow-engine)

```typescript
// Endpoints needed:
POST /api/agents                    // Create agent
GET /api/agents?userId=...          // List user's agents
GET /api/agents/:id                 // Get agent details
PATCH /api/agents/:id               // Update agent
DELETE /api/agents/:id              // Delete agent
POST /api/agents/:id/test           // Test agent manually
GET /api/agents/:id/executions      // Get execution history
```

### 2. Agent Execution Engine

**For Scheduled Agents:**

- Use cron scheduler or custom-flow-engine scheduled flows
- Parse schedule config into cron expression
- Execute agent actions on schedule
- Store execution results

**For Event-based Agents:**

- Subscribe to entity change events (webhooks/message queue)
- Filter events based on agent config
- Execute agent actions when event matches
- Store execution results

### 3. Agent Actions Executor

**Query Action:**

- Execute GraphQL queries
- Transform results for notifications
- Handle errors gracefully

**Notify Action:**

- Send Blink notifications to user's EveryBox
- Support different priorities
- Include action URLs for quick access

### 4. Prompt Manager Integration

Create an Enterprise Agent prompt for agent parsing:

- Name: "Agent Parser v1"
- System Prompt: See `src/business-apps/platform/apps/personal-agents/prompts/agent-parser-prompt.ts`
- Response: Structured JSON with agent configuration
- Tools: None initially, can add query tools later

## Agent Management UI

Users should be able to:

- View all their agents
- See agent status (active/paused/error)
- View execution history
- Edit agent configuration
- Pause/activate agents
- Delete agents
- Test agents manually

## Security Considerations

1. **User Isolation**: Agents can only access data the user has permission to see
2. **Rate Limiting**: Limit number of agents per user (e.g., 10-20)
3. **Execution Limits**: Prevent infinite loops, limit execution frequency
4. **Notification Limits**: Cap daily notifications per agent
5. **Query Validation**: Validate GraphQL queries before execution
6. **Access Control**: Agents inherit user's permissions

## Testing

### Unit Tests

- Agent parser service
- Agent actions service
- Detection patterns
- Schedule parsing

### Integration Tests

- End-to-end agent creation from chat
- Scheduled execution
- Event-triggered execution
- Notification delivery

### User Acceptance Tests

- Create agent via chat
- Verify notifications arrive
- Edit and pause agents
- Delete agents

## Future Enhancements

1. **Advanced Triggers**
   - Complex conditions (AND/OR logic)
   - Multi-entity monitoring
   - Threshold-based triggers

2. **Advanced Actions**
   - Update entity data
   - Start workflows
   - Call external APIs
   - Chain multiple agents

3. **AI Improvements**
   - Learn from user corrections
   - Suggest agent improvements
   - Auto-tune schedules based on usage

4. **Collaboration**
   - Share agents with team
   - Team-wide agents
   - Agent templates

5. **Analytics**
   - Agent performance metrics
   - Cost tracking
   - Usage insights

## Migration Path

1. **Phase 1: Core System** (Current)
   - ✅ Frontend types and services
   - ✅ Chat integration
   - ⏳ Backend API implementation
   - ⏳ Prompt Manager integration

2. **Phase 2: Execution**
   - Scheduler implementation
   - Event subscription system
   - Action execution
   - Notification integration

3. **Phase 3: Management UI**
   - Agent list view
   - Agent editor
   - Execution history
   - Testing tools

4. **Phase 4: Polish**
   - Error handling
   - Performance optimization
   - Advanced features
   - Documentation

## API Examples

### Create Agent

```http
POST /api/agents
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user123",
  "name": "Weekly Opportunities Report",
  "description": "Sends list of new opportunities every Monday",
  "triggerType": "schedule",
  "scheduleConfig": {
    "type": "weekly",
    "dayOfWeek": 1,
    "time": "10:00"
  },
  "actions": [
    {
      "type": "query",
      "entityType": "opportunity",
      "query": "query GetOpportunities($limit: Int) { opportunities(limit: $limit) { id name stage amount } }",
      "variables": { "limit": 10 }
    },
    {
      "type": "notify",
      "channel": "blink",
      "template": "New opportunities this week: {{results.0.opportunities}}",
      "priority": "normal"
    }
  ],
  "status": "paused",
  "originalPrompt": "send me a list of new opportunities each Monday at 10 am",
  "parsedBy": "ai"
}
```

### Test Agent

```http
POST /api/agents/agent123/test
Authorization: Bearer {token}

Response:
{
  "agentId": "agent123",
  "executionId": "exec_123",
  "startTime": "2025-12-07T10:00:00Z",
  "endTime": "2025-12-07T10:00:02Z",
  "status": "success",
  "notificationsSent": 1,
  "data": [...]
}
```

## Conclusion

Personal AI Agents provide a powerful way for users to automate repetitive tasks and stay informed about important changes. The natural language interface via @Every makes it accessible to all users without technical knowledge.

The system is designed to be:

- **User-friendly**: Create agents through natural conversation
- **Flexible**: Support various trigger types and actions
- **Secure**: Respect user permissions and data access
- **Scalable**: Handle many agents and executions efficiently
- **Extensible**: Easy to add new trigger types and actions
