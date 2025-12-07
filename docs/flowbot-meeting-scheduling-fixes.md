# FlowBot schedule_meeting Tool - Required Fixes

## Issues Identified

1. **Timezone Issue**: Meetings are scheduled with 1-hour offset (e.g., user says 10:15 AM, meeting created at 11:15 AM)
2. **Participant Issue**: Other chat participants are not being added to meetings

## Root Cause

The `schedule_meeting` tool in FlowBot backend is not:
- Properly handling timezone conversion when creating meetings
- Using participant IDs (odId) directly from the provided context

## Current Frontend Implementation

The frontend (`useEveryAIChat.ts`) now provides:

### 1. Timezone Information
```
[TIMEZONE: User's timezone is Europe/Berlin (UTC+01:00). When scheduling meetings, interpret all times in this timezone.]
```

### 2. Participant ID Mappings
```
[PARTICIPANT_ID_MAPPING: Use these exact participant IDs when scheduling meetings: {"Denis Prekrat": "odId-123", "Emir Salihagic": "odId-456"}]
```

### 3. Explicit Instructions
```
CRITICAL REQUIREMENTS:
1. TIMEZONE HANDLING:
   - User's timezone is Europe/Berlin (UTC+01:00)
   - When user says a time like "10:15 AM", interpret it as Europe/Berlin time
   - ALWAYS pass timezone parameter as "Europe/Berlin" to schedule_meeting tool
   - Convert the time to ISO format with timezone

2. PARTICIPANT HANDLING:
   - ALWAYS include ALL chat participants by default (use PARTICIPANT_ID_MAPPING above)
   - Use the exact participant IDs (odId) from PARTICIPANT_ID_MAPPING, not names
   - Pass participant IDs as an array of odId strings, e.g. ["odId1", "odId2"]

3. TOOL CALL FORMAT:
   - Call schedule_meeting with: title, date (YYYY-MM-DD), time (HH:MM), duration (minutes), timezone ("Europe/Berlin"), participantIds (array of odId strings)
```

## Required Backend Fixes

### Fix 1: Timezone Handling in schedule_meeting Tool

**Current Problem**: Tool is likely interpreting times as UTC or server timezone instead of user's timezone.

**Required Fix**:
1. **Extract timezone from prompt context**: Look for `[TIMEZONE: User's timezone is Europe/Berlin (UTC+01:00)...]` in the prompt
2. **Accept `timezone` parameter in tool call**: The tool should accept `timezone` as a parameter (e.g., `"Europe/Berlin"`)
3. **Parse time in user's timezone**: When user provides time like "10:15 AM", interpret it in the specified timezone, NOT UTC
4. **Convert to ISO format preserving timezone**:
   ```python
   from datetime import datetime
   import pytz
   
   # Example: User says "tomorrow at 10:15 AM" in Europe/Berlin
   # Input: date="2025-12-08", time="10:15", timezone="Europe/Berlin"
   
   # Parse date and time in the specified timezone
   tz = pytz.timezone(timezone)  # "Europe/Berlin"
   naive_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
   local_dt = tz.localize(naive_dt)  # This creates datetime in Europe/Berlin timezone
   
   # Convert to ISO format with timezone offset
   startTime = local_dt.isoformat()  # "2025-12-08T10:15:00+01:00"
   
   # Calculate end time (add duration)
   endTime = (local_dt + timedelta(minutes=duration)).isoformat()
   ```

5. **When calling chat-service API** (`POST /chat-service/api/v1/meetings`), ensure:
   - `startTime` and `endTime` are in ISO format with timezone offset (e.g., `"2025-12-08T10:15:00+01:00"`)
   - `timezone` field is included in the request body (e.g., `"Europe/Berlin"`)

**API Call Format**:
```json
{
  "title": "Discussion about Sarma",
  "startTime": "2025-12-08T10:15:00+01:00",
  "endTime": "2025-12-08T11:15:00+01:00",
  "timezone": "Europe/Berlin",
  "participantIds": ["odId-123", "odId-456"]
}
```

### Fix 2: Participant ID Handling

**Current Problem**: Tool is trying to resolve participant names instead of using provided IDs.

**Required Fix**:
1. **Extract participant IDs from prompt**: Look for `[PARTICIPANT_ID_MAPPING: Use these exact participant IDs when scheduling meetings: {"Name1": "odId-123", "Name2": "odId-456"}]` in the prompt
2. **Parse the mapping**: Extract the JSON-like structure to get odId values
3. **Use IDs directly**: DO NOT attempt name resolution - use the odId values directly from the mapping
4. **Include ALL participants by default**: Unless user explicitly excludes someone, include ALL participants from PARTICIPANT_ID_MAPPING
5. **Also check MENTIONED_USER_ID_MAPPING**: If user mentions someone with @, include them from MENTIONED_USER_ID_MAPPING
6. **Pass as array**: Pass `participantIds` as an array of odId strings to the API

**Example Implementation**:
```python
import re
import json

def extract_participant_ids(prompt_text):
    """Extract participant IDs from prompt context"""
    participant_ids = []
    
    # Extract PARTICIPANT_ID_MAPPING
    mapping_match = re.search(r'\[PARTICIPANT_ID_MAPPING:.*?\{([^}]+)\}\]', prompt_text)
    if mapping_match:
        mapping_str = "{" + mapping_match.group(1) + "}"
        # Parse the mapping (handle the format {"Name": "odId", ...})
        # Extract odId values
        odid_matches = re.findall(r'"([a-f0-9-]+)"', mapping_str)
        participant_ids.extend(odid_matches)
    
    # Extract MENTIONED_USER_ID_MAPPING if present
    mentioned_match = re.search(r'\[MENTIONED_USER_ID_MAPPING:.*?\{([^}]+)\}\]', prompt_text)
    if mentioned_match:
        mentioned_str = "{" + mentioned_match.group(1) + "}"
        odid_matches = re.findall(r'"([a-f0-9-]+)"', mentioned_str)
        participant_ids.extend(odid_matches)
    
    # Remove duplicates
    return list(set(participant_ids))

# In schedule_meeting tool:
participant_ids = extract_participant_ids(prompt_text)
if not participant_ids:
    # Fallback: try to get from tool parameters if provided
    participant_ids = tool_params.get('participantIds', [])

schedule_meeting(
    title="Discussion about Sarma",
    date="2025-12-08",
    time="10:15",
    duration=60,
    timezone="Europe/Berlin",
    participantIds=participant_ids  # ["odId-123", "odId-456"]
)
```

## Expected API Request to chat-service

When FlowBot calls the chat-service API, it should send:

```json
POST /chat-service/api/v1/meetings
{
  "title": "Discussion about Sarma",
  "description": "",
  "startTime": "2025-12-08T10:15:00+01:00",
  "endTime": "2025-12-08T11:15:00+01:00",
  "timezone": "Europe/Berlin",
  "participantIds": ["odId-denise", "odId-emir"],
  "conversationId": "conv-123"
}
```

## Testing

After fixes, test with:
1. **Timezone**: User says "schedule meeting tomorrow at 10:15 AM" → Meeting should be at 10:15 AM in user's timezone
2. **Participants**: In a chat with 2 participants → Both should be added automatically

## Frontend Support

The frontend is already providing all necessary information:
- ✅ User timezone detection
- ✅ Participant ID mappings with odId
- ✅ Explicit instructions in prompt

The backend tool just needs to use this information correctly.

