# Blink (Quick Task) Creation API for FlowBot

## Overview

FlowBot needs to call the CFlow API to create blinks (quick tasks). This document provides the exact API endpoint and payload structure.

## API Endpoint

```
POST {CFLOW_BASE_URL}/api/templates/execute-dynamic
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

## Request Payload Structure

```typescript
{
  "templateDefinition": {
    "type": "TEMPLATE",
    "name": "Task Title",
    "description": "Quick Task: Task Title",
    "version": 1,
    "steps": [
      {
        "type": "TASK",
        "title": "Task Title",
        "message": "Task description/message",
        "form": [],
        "links": [],  // Optional: document attachments
        "assignment": {
          "assignmentMode": "ASSIGN",
          "targets": null,
          "allowReassignment": false
        },
        "dueDate": "2024-12-31T23:59:59.999Z"  // OR use "dueInMinutes": 4320
      }
    ],
    "tags": {
      "app": "quick-task",
      "blinkGroupId": "blink_group_1234567890_initiatorUserId",
      "assignedUserId": "assigneeUserId"
    }
  },
  "initiatorId": "initiatorUserId",
  "stepAssignments": {
    "step_0": {
      "assignment": {
        "assignmentMode": "ASSIGN",
        "targets": {
          "users": ["assigneeUserId"],
          "capabilities": [],
          "organizationalUnits": [],
          "companies": [],
          "siteLocations": [],
          "costCenters": [],
          "matrixTeams": []
        },
        "allowReassignment": false
      }
    }
  }
}
```

## FlowBot Integration Requirements

### Tool Function: `create_blink`

**Parameters:**

- `title` (string, required): Task title
- `message` (string, required): Task description
- `assignee_user_ids` (array of strings, required): One or more user IDs
- `due_date` (string, optional): ISO date string (YYYY-MM-DD)
- `priority` (string, optional): "low" | "medium" | "high" (defaults to medium)
- `initiator_id` (string, required): User ID of the person creating the blink

### Multi-Assignee Support

When multiple assignees are provided, create one workflow instance per assignee:

- Generate unique `blinkGroupId`: `blink_group_{timestamp}_{initiatorId}`
- Include same `blinkGroupId` in all workflows
- Set unique `assignedUserId` for each workflow

### Due Date Handling

**Option 1: Specific Date**

```json
{
  "dueDate": "2024-12-31T23:59:59.999Z"
}
```

**Option 2: Priority-based (if no date provided)**

```json
{
  "dueInMinutes": 4320 // 3 days for medium priority
}
```

**Priority to Minutes Mapping:**

- `high`: 1440 (1 day)
- `medium`: 4320 (3 days)
- `low`: 10080 (1 week)

### Document Attachments (Optional)

If files are uploaded, include them in the `links` array:

```json
{
  "links": [
    {
      "name": "document.pdf",
      "url": "/files/api/v1/tenant/downloads/quick-task/{fileId}",
      "type": "document:{fileId}"
    }
  ]
}
```

## Response Structure

**Success (200 OK):**

```json
{
  "status": "success",
  "data": {
    "workflowId": "workflow-uuid",
    "templateName": "Task Title",
    "status": "RUNNING"
  }
}
```

**Error (400/500):**

```json
{
  "status": "error",
  "message": "Error description"
}
```

## Environment Configuration

FlowBot needs access to:

- `CFLOW_BASE_URL`: CFlow API base URL
- User's `accessToken`: For authentication
- User's `employeeId` or `userId`: As initiatorId

## Example Implementation (Python)

```python
import requests
from datetime import datetime, timedelta
from typing import List, Optional

def create_blink(
    access_token: str,
    cflow_base_url: str,
    initiator_id: str,
    title: str,
    message: str,
    assignee_user_ids: List[str],
    due_date: Optional[str] = None,
    priority: str = "medium"
) -> dict:
    """
    Create a blink (quick task) via CFlow API

    Args:
        access_token: User's authentication token
        cflow_base_url: CFlow API base URL
        initiator_id: User ID of the person creating the blink
        title: Task title
        message: Task description
        assignee_user_ids: List of user IDs to assign the task to
        due_date: Optional ISO date string (YYYY-MM-DD)
        priority: Task priority (low, medium, high)

    Returns:
        dict: Response with workflow IDs
    """

    # Generate unique group ID for multi-assignee blinks
    timestamp = int(datetime.now().timestamp() * 1000)
    blink_group_id = f"blink_group_{timestamp}_{initiator_id}"

    # Calculate due configuration
    if due_date:
        due_config = {"dueDate": f"{due_date}T23:59:59.999Z"}
    else:
        priority_minutes = {
            "high": 1440,
            "medium": 4320,
            "low": 10080
        }
        due_config = {"dueInMinutes": priority_minutes.get(priority, 4320)}

    results = []

    # Create one workflow per assignee
    for user_id in assignee_user_ids:
        payload = {
            "templateDefinition": {
                "type": "TEMPLATE",
                "name": title,
                "description": f"Quick Task: {title}",
                "version": 1,
                "steps": [
                    {
                        "type": "TASK",
                        "title": title,
                        "message": message,
                        "form": [],
                        "links": [],
                        "assignment": {
                            "assignmentMode": "ASSIGN",
                            "targets": None,
                            "allowReassignment": False
                        },
                        **due_config
                    }
                ],
                "tags": {
                    "app": "quick-task",
                    "blinkGroupId": blink_group_id,
                    "assignedUserId": user_id
                }
            },
            "initiatorId": initiator_id,
            "stepAssignments": {
                "step_0": {
                    "assignment": {
                        "assignmentMode": "ASSIGN",
                        "targets": {
                            "users": [user_id],
                            "capabilities": [],
                            "organizationalUnits": [],
                            "companies": [],
                            "siteLocations": [],
                            "costCenters": [],
                            "matrixTeams": []
                        },
                        "allowReassignment": False
                    }
                }
            }
        }

        response = requests.post(
            f"{cflow_base_url}/api/templates/execute-dynamic",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json=payload
        )

        response.raise_for_status()
        results.append(response.json())

    return {
        "success": True,
        "count": len(results),
        "workflows": results,
        "blinkGroupId": blink_group_id,
        "assigneeCount": len(assignee_user_ids)
    }
```

## Testing

**Test Payload:**

```bash
curl -X POST {CFLOW_BASE_URL}/api/templates/execute-dynamic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "templateDefinition": {
      "type": "TEMPLATE",
      "name": "Test Blink",
      "description": "Quick Task: Test Blink",
      "version": 1,
      "steps": [{
        "type": "TASK",
        "title": "Test Blink",
        "message": "This is a test quick task",
        "form": [],
        "links": [],
        "assignment": {
          "assignmentMode": "ASSIGN",
          "targets": null,
          "allowReassignment": false
        },
        "dueInMinutes": 4320
      }],
      "tags": {
        "app": "quick-task",
        "blinkGroupId": "blink_group_test_123",
        "assignedUserId": "test-user-id"
      }
    },
    "initiatorId": "test-initiator-id",
    "stepAssignments": {
      "step_0": {
        "assignment": {
          "assignmentMode": "ASSIGN",
          "targets": {
            "users": ["test-user-id"],
            "capabilities": [],
            "organizationalUnits": [],
            "companies": [],
            "siteLocations": [],
            "costCenters": [],
            "matrixTeams": []
          },
          "allowReassignment": false
        }
      }
    }
  }'
```

## Entity Type for EveryAI Display

When returning blink entities to EveryAI for display:

```json
{
  "type": "entity",
  "entity": "blink",
  "id": "{workflowId}",
  "operation": "create"
}
```

EveryAI will then fetch and display the blink using the BlinkDisplay component.
