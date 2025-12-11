# API Response Format Fix

## Issue

**Error**: `sourceTemplates.map is not a function`

**Root Cause**: The `getTemplates` API function wasn't handling the actual response format from custom-flow-engine.

---

## API Response Format

### custom-flow-engine Returns

```typescript
// GET /api/templates
{
  "status": "success",
  "count": 15,
  "templates": [
    {
      "id": "template-001",
      "name": "Employee Onboarding",
      "type": "TEMPLATE",
      "version": 1,
      "steps": [...],
      // ... other fields
    }
  ]
}
```

---

## Old Code (Broken)

```typescript
async getTemplates(baseUrl: string, apiKey: string): Promise<FlowTemplate[]> {
  try {
    const response = await axios.get(`${baseUrl}/api/templates`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    return response.data.templates || response.data;  // ❌ Too simple
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
    throw error;
  }
}
```

**Problem**:

- If `response.data.templates` doesn't exist, falls back to `response.data`
- `response.data` might be an object with `{status, count, templates}`, not an array
- Calling `.map()` on an object fails

---

## New Code (Fixed)

```typescript
async getTemplates(baseUrl: string, apiKey: string): Promise<FlowTemplate[]> {
  try {
    console.log(`Fetching templates from: ${baseUrl}/api/templates`);
    const response = await axios.get(`${baseUrl}/api/templates`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log('Template API response:', response.data);

    // Handle different response formats
    let templates: FlowTemplate[];

    if (Array.isArray(response.data)) {
      // Response is directly an array
      templates = response.data;
    } else if (response.data.templates && Array.isArray(response.data.templates)) {
      // Response has a templates property
      templates = response.data.templates;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      // Response has a data property
      templates = response.data.data;
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error(`Unexpected response format. Expected array of templates, got: ${typeof response.data}`);
    }

    console.log(`Successfully fetched ${templates.length} templates`);
    return templates;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.response?.status, error.response?.data);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
    throw error;
  }
}
```

**Improvements**:

- ✅ Logs the exact API response for debugging
- ✅ Handles multiple response formats
- ✅ Always returns an array
- ✅ Provides clear error messages
- ✅ Shows what was received if format is unexpected

---

## Expected Console Output

### On Success

```
Fetching templates from: https://newwork-dev.newwork.com/flow-engine/api/templates
Template API response: { status: 'success', count: 5, templates: [...] }
Successfully fetched 5 templates
Comparing templates: Current (DEV) → STAGING
Fetched 5 templates from source, 3 from target
Comparison complete: 5 templates analyzed
```

### On Error

```
Fetching templates from: https://newwork-dev.newwork.com/flow-engine/api/templates
Template API response: { error: 'Unauthorized' }
Unexpected response format: { error: 'Unauthorized' }
Comparison failed: Unexpected response format. Expected array of templates, got: object
```

---

## Supported Response Formats

The updated code supports **3 different response formats**:

### Format 1: Object with templates property (custom-flow-engine default)

```json
{
  "status": "success",
  "count": 5,
  "templates": [...]
}
```

### Format 2: Direct array (some APIs)

```json
[
  { "id": "...", "name": "..." },
  { "id": "...", "name": "..." }
]
```

### Format 3: Object with data property (alternative format)

```json
{
  "status": "success",
  "data": [...]
}
```

---

## Testing the Fix

### After Refresh

1. **Open Template Manager**
2. **Select 2 instances**
3. **Click "Compare Templates"**
4. **Check console** for:

   ```
   ✅ Template API response: { status: 'success', count: X, templates: [...] }
   ✅ Successfully fetched X templates
   ✅ Comparison complete: X templates analyzed
   ```

5. **See comparison table** with template list

---

## If Still Failing

### Check Console Output

```javascript
// The fix logs the actual response
Template API response: { ... }
```

**Look for**:

- What is the response structure?
- Is `templates` present?
- Is it an array?
- What HTTP status code?

### Common Issues

1. **401 Unauthorized**:
   - Token expired → Refresh page
   - Wrong API key → Check catalog metadata

2. **403 Forbidden**:
   - Insufficient permissions
   - API key doesn't have template read access

3. **404 Not Found**:
   - Wrong baseUrl
   - API endpoint doesn't exist on that instance
   - Check: `{baseUrl}/api/templates`

4. **Empty templates array**:
   - No templates exist in that instance
   - Filter parameters excluding all templates

---

## Related Fixes

**Also fixed in this session**:

1. ✅ Health check endpoint: `/api/health` → `/api`
2. ✅ Health check authentication: Added `accessToken` fallback
3. ✅ Instance loading: GraphQL instead of REST API
4. ✅ Error messages: Removed VITE environment variable references

---

## Success Criteria

- ✅ **No `.map is not a function` errors**
- ✅ **Console shows:** `Successfully fetched X templates`
- ✅ **Comparison table** displays templates
- ✅ **Summary card** shows comparison statistics

---

_Fix applied: December 9, 2025_
_API endpoint: GET /api/templates_
_Response format: {status, count, templates: []}_
