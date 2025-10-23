# AI Builder Publish Error Handling Enhancement

## Overview

Enhanced the AI Builder's publishing functionality to automatically handle errors and successes more intelligently by integrating them directly into the chat interface.

## Changes Made

### 1. Enhanced Error Handling

**Previous Behavior:**

- Errors were shown in browser alerts
- User had to manually copy and paste errors into chat
- AI couldn't see the error context

**New Behavior:**

- Errors are automatically inserted into the chat as a user message
- AI immediately sees the error and can analyze/fix it
- User just needs to wait for AI to respond with fixes
- Publish dialog closes automatically to show the chat

**Implementation:**

```typescript
// When publish fails, error is added to chat
setMessages(prev => [
  ...prev,
  {
    role: 'user',
    content: `The screen publishing failed with the following error:

\`\`\`
${errorMessage}
\`\`\`

Please analyze the error, fix the issues, and let me know when it's ready to republish.`,
    timestamp: new Date()
  }
])
```

### 2. Success Link Generation

**Previous Behavior:**

- Success URL was constructed from API response's resourceUrl
- Format: `https://newwork-dev.newwork.com${result.resourceUrl}`

**New Behavior:**

- Success URL is constructed from screen path
- Format: `https://newwork-dev.newwork.com/platform/apps/${screenPath}`
- Also adds success message to chat confirming publication

**Example:**

- Screen path: `crm/customers/apps/lead-list`
- Generated URL: `https://newwork-dev.newwork.com/platform/apps/crm/customers/apps/lead-list`

### 3. Detailed Error Extraction

Enhanced both `publishScreen` functions (local and in publishClient.ts) to extract detailed error information:

```typescript
// Extract detailed error information from API response
if (!response.ok) {
  let errorDetails = 'Failed to publish screen'
  try {
    const errorData = await response.json()
    errorDetails = errorData.error || errorData.message || errorData.details || errorDetails

    if (errorData.buildError) {
      errorDetails = `Build Error:\n${errorData.buildError}`
    }

    if (errorData.stderr) {
      errorDetails = `${errorDetails}\n\nError Output:\n${errorData.stderr}`
    }
  } catch (parseError) {
    try {
      errorDetails = await response.text()
    } catch {
      errorDetails = `HTTP ${response.status}: ${response.statusText}`
    }
  }

  throw new Error(errorDetails)
}
```

### 4. Access Token Integration

Added access token support for authenticated API calls:

**Interface Update:**

```typescript
interface PublishRequest {
  files: Array<{ path: string; content: string; changeType: string }>
  screenPath: string
  resourceUrl: string
  sessionId: string
  accessToken: string // NEW
}
```

**Component Props Update:**

```typescript
export const AIBuilder: React.FC<BusinessAppContextProps> = context => {
  // Now has access to context.accessToken
}
```

## Files Modified

### 1. `/src/business-apps/platform/apps/ai-builder/AIBuilder.tsx`

- Updated component to receive `context` props
- Modified `PublishRequest` interface to include `accessToken`
- Enhanced `publishScreen` function to:
  - Use Authorization header with access token
  - Extract detailed error messages from API
- Updated `handlePublish` to:
  - Generate correct URL format
  - Add error messages to chat automatically
  - Add success messages to chat
  - Close dialog on error to show chat

### 2. `/src/business-apps/platform/apps/ai-builder/api/publishClient.ts`

- Defined `GeneratedFile` interface locally (removed broken import)
- Updated `PublishRequest` interface to include `accessToken`
- Enhanced error extraction logic in `publishScreen` function
- Changed return behavior to throw errors with full details

## User Experience Improvements

### Error Flow (Before)

1. User clicks "Publish Screen"
2. Error occurs
3. Alert shows generic error message
4. User must copy error from console/alert
5. User pastes error into chat
6. AI responds with fix

### Error Flow (After)

1. User clicks "Publish Screen"
2. Error occurs
3. Error automatically appears in chat
4. AI immediately analyzes and provides fix
5. User can republish when ready

### Success Flow (Before)

1. User clicks "Publish Screen"
2. Success banner appears with URL
3. User must manually navigate or copy link

### Success Flow (After)

1. User clicks "Publish Screen"
2. Success banner appears with clickable link
3. Success message also appears in chat
4. Link format: `https://newwork-dev.newwork.com/platform/apps/SCREEN_PATH`
5. User can click banner link to open in new tab

## Testing Recommendations

1. **Test error handling:**
   - Create a screen with intentional import errors
   - Verify error appears in chat automatically
   - Verify AI can see and respond to error

2. **Test success handling:**
   - Publish a valid screen
   - Verify URL format is correct
   - Verify link opens in new tab
   - Verify success message appears in chat

3. **Test edge cases:**
   - Network timeout errors
   - Invalid screen paths
   - Missing files
   - Build errors with stack traces

## API Error Format Expectations

The enhanced error handling expects API errors in this format:

```json
{
  "error": "Main error message",
  "message": "Alternative error message",
  "details": "Detailed information",
  "buildError": "Full build error with stack trace",
  "stderr": "Standard error output from build process"
}
```

The code will use the first available field in this priority order:

1. `error`
2. `message`
3. `details`
4. HTTP status text

If `buildError` or `stderr` are present, they will be appended to provide more context.

## Benefits

1. **Faster iteration:** No manual copy-paste needed
2. **Better context:** AI sees full error immediately
3. **Clearer URLs:** Standard format makes links predictable
4. **Better UX:** Seamless error-to-fix workflow
5. **More resilient:** Handles various error response formats

## Future Enhancements

1. Add retry button in chat for failed publishes
2. Show publish progress in chat (building, uploading, registering)
3. Add validation before publish to catch common errors
4. Store publish history in chat for reference
