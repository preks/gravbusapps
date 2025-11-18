# EveryAI Reminder Feature - Implementation Complete ✅

## Overview

Full reminder functionality implemented using Conductor WAIT tasks. Users can set reminders via natural language in EveryAI, and they'll appear in the RemindersPanel when due.

---

## What Was Implemented

### 1. **FlowBot Backend Tool** ✅

**File:** `/NW FlowBot/src/api/tools/reminder.py`

- `create_reminder` tool for FlowBot
- Natural language time parsing with `dateparser`
- Creates Conductor workflow with WAIT task
- Registered `reminder` entity type

**Example Usage:**

```
User: "Remind me to call Hans tomorrow at 4 PM"
FlowBot: Creates workflow → WAIT task until 4 PM → User notification
```

---

### 2. **Conductor Workflow** ✅

**File:** `/custom-flow-engine/flows/workflows/USER_REMINDER.json`

**Workflow Steps:**

1. **WAIT Task** - Pauses until `reminderDateTime`
2. **USER_TASK** - Creates INFORMATION task assigned to user

**Input Parameters:**

- `reminderId` - Unique reminder ID
- `userId` - User employee ID
- `reminderTitle` - "Call Hans-Ulrich"
- `reminderMessage` - Optional notes
- `reminderDateTime` - ISO datetime string
- `reminderDateTimeFormatted` - Display string
- `createdAt` - Creation timestamp
- `originalInput` - User's natural language input

---

### 3. **Frontend Components** ✅

#### **ReminderDisplay Component**

**File:** `src/business-apps/platform/apps/every-ai/components/displays/ReminderDisplay.tsx`

- Shows reminder confirmation card after creation
- Displays title, time, message
- Fetches workflow data from Conductor
- Shows status (Pending/Running/Completed)

#### **RemindersPanel Component**

**File:** `src/business-apps/platform/apps/every-ai/components/RemindersPanel.tsx`

- Polls Conductor every 60 seconds
- Shows all active reminders for user
- Highlights due reminders in red
- Shows time remaining with "in 2 hours", "tomorrow at 4 PM"
- Cancel reminder functionality
- Empty state when no reminders

#### **EveryAI Integration**

**File:** `src/business-apps/platform/apps/every-ai/EveryAI.tsx`

- Bell icon in top-right corner
- Click to open RemindersPanel
- Panel overlays conversation area

---

### 4. **Type Definitions** ✅

**File:** `src/business-apps/platform/apps/every-ai/types/models.ts`

- Added `reminder` and `blink` to `EntityData` union
- Created `ReminderData` type for structured reminder info
- Added `ReminderData` to `DisplayData` union

---

### 5. **OutputRenderers Integration** ✅

**File:** `src/business-apps/platform/apps/every-ai/components/OutputRenderers.tsx`

- Imported `ReminderDisplay` component
- Added `case 'reminder'` handler
- Renders `ReminderDisplay` for reminder entities

---

## How It Works

### **User Experience Flow:**

```
1. User opens EveryAI
   ↓
2. Types: "Remind me to call Hans tomorrow at 4 PM"
   ↓
3. FlowBot parses time → Creates Conductor workflow
   ↓
4. ReminderDisplay shows confirmation card
   ↓
5. Workflow enters WAIT state (invisible to user)
   ↓
6. User clicks bell icon → RemindersPanel opens
   ↓
7. Sees: "Call Hans-Ulrich - Tomorrow at 4:00 PM UTC"
   ↓
8. Tomorrow at 4 PM:
   - WAIT task completes
   - Reminder appears in panel with "DUE" badge in red
   ↓
9. User clicks reminder (future: opens detail view)
   Or clicks ✕ to dismiss
```

---

## API Endpoints Used

### **Conductor APIs:**

1. **Start Workflow:**
   - `POST /flow-engine/api/workflow/start`
   - Body: `USER_REMINDER` workflow with input parameters

2. **Search Workflows:**
   - `GET /flow-engine/api/workflow/search`
   - Query: `tags.app = 'reminder' AND tags.userId = '{userId}' AND status IN (RUNNING, SCHEDULED)`

3. **Get Workflow:**
   - `GET /flow-engine/api/workflow/{workflowId}`
   - Returns workflow details and status

4. **Cancel Workflow:**
   - `DELETE /flow-engine/api/workflow/{workflowId}`
   - Cancels the reminder workflow

---

## Testing

### **1. Create Reminder:**

```
User: "Remind me to call Hans in 2 minutes"
Expected:
- ReminderDisplay appears with confirmation
- Bell icon shows in top-right
```

### **2. View Reminders:**

```
Click bell icon
Expected:
- RemindersPanel opens
- Shows "Call Hans" reminder
- Shows "in 2 minutes" or "in 1 minute"
```

### **3. Wait for Due Time:**

```
After 2 minutes pass:
Expected:
- Reminder gets "DUE" badge in red
- Time shows "a few seconds ago"
```

### **4. Cancel Reminder:**

```
Click ✕ on reminder
Expected:
- Confirmation dialog
- Reminder removed from list
- Workflow deleted in Conductor
```

### **5. Natural Language Parsing:**

Test various time formats:

- "tomorrow at 4 PM"
- "in 2 hours"
- "next Monday at 9 AM"
- "December 15 at 3:30 PM"
- "in 5 minutes"

---

## Configuration

### **Required Environment Variables (FlowBot):**

- `MONGO_USER` - MongoDB username
- `MONGO_PASS` - MongoDB password
- `MONGO_URL` - MongoDB Atlas URL

### **Required Dependencies:**

FlowBot:

- `dateparser` - Natural language time parsing
- `pytz` - Timezone handling

EveryAI:

- `dayjs` with `relativeTime` plugin
- `@newwork/nw-design-system`

---

## Future Enhancements

### **Priority 1: User Notifications**

When reminder becomes due:

- Browser push notification
- Desktop notification
- Sound/vibration (mobile)

### **Priority 2: Reminder Actions**

- Snooze reminder (5 min, 1 hour, tomorrow)
- Mark as complete
- Edit reminder time/message

### **Priority 3: Recurring Reminders**

- "Remind me every Monday at 9 AM"
- "Remind me daily at 10 AM"

### **Priority 4: Smart Reminders**

- "Remind me when I'm back in office" (location-based)
- "Remind me before the meeting" (calendar integration)
- "Remind me if no response from Hans in 2 days" (conditional)

---

## Known Limitations

1. **Timezone Handling:**
   - Currently uses UTC by default
   - Need to fetch user's timezone from profile

2. **No Browser Notifications:**
   - User must check RemindersPanel manually
   - No notification when reminder is due

3. **No Persistence:**
   - Reminders only stored in Conductor workflows
   - No separate database for reminder history

4. **No Edit Functionality:**
   - Cannot edit reminder after creation
   - Must cancel and create new one

---

## Architecture Notes

### **Why Conductor WAIT Tasks?**

- Built-in time-based triggering
- No need for separate cron/scheduler
- Workflow orchestration handles retry/failure
- Tags allow querying user's reminders
- Scalable to thousands of reminders

### **Why Not MongoDB?**

- Conductor already tracks workflow state
- WAIT task handles timing automatically
- No duplicate storage needed
- Easier to query active reminders

### **Why Polling?**

- Simple implementation
- 60-second intervals acceptable for reminders
- No WebSocket/SSE complexity
- Can upgrade to push later

---

## Deployment Checklist

### **FlowBot (Backend):**

- [ ] Install `dateparser` package
- [ ] Register `USER_REMINDER` workflow in Conductor
- [ ] Test workflow execution
- [ ] Verify WAIT task works

### **EveryAI (Frontend):**

- [ ] Build frontend bundle
- [ ] Deploy to platform
- [ ] Test bell icon appears
- [ ] Test RemindersPanel opens

### **Conductor:**

- [ ] Upload `USER_REMINDER.json` workflow
- [ ] Verify workflow registered
- [ ] Test workflow start API
- [ ] Test workflow search API

---

## Support & Troubleshooting

### **Reminder Not Created:**

Check FlowBot logs for:

- Time parsing errors
- Conductor API failures
- Invalid workflow payload

### **Reminder Not Appearing in Panel:**

Check:

- User ID matches in workflow tags
- Workflow status is RUNNING or SCHEDULED
- Search query syntax correct

### **WAIT Task Not Completing:**

Check:

- `reminderDateTime` is valid ISO string
- Time is in future
- Conductor WAIT task enabled

### **Panel Not Opening:**

Check:

- RemindersPanel component imported
- Button onClick handler working
- `showRemindersPanel` state updating

---

## Files Changed

### **Backend:**

1. `/NW FlowBot/src/api/tools/reminder.py` - NEW
2. `/NW FlowBot/src/api/tools/entity_types_names.json` - MODIFIED

### **Frontend:**

1. `/src/business-apps/platform/apps/every-ai/EveryAI.tsx` - MODIFIED
2. `/src/business-apps/platform/apps/every-ai/types/models.ts` - MODIFIED
3. `/src/business-apps/platform/apps/every-ai/components/OutputRenderers.tsx` - MODIFIED
4. `/src/business-apps/platform/apps/every-ai/components/RemindersPanel.tsx` - NEW
5. `/src/business-apps/platform/apps/every-ai/components/displays/ReminderDisplay.tsx` - NEW

### **Workflow:**

1. `/custom-flow-engine/flows/workflows/USER_REMINDER.json` - NEW

---

## Summary

✅ **Complete reminder system implemented**
✅ **Uses Conductor WAIT tasks**
✅ **Natural language time parsing**
✅ **Bell icon in EveryAI**
✅ **RemindersPanel with polling**
✅ **Confirmation cards**
✅ **Cancel functionality**

**Ready for testing!** 🚀

Try: "Remind me to call Hans in 2 minutes"
