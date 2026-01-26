# Chat & RealtimeKit Debug Logging

All RTK (RealtimeKit) and Chat-related debug logs are now **disabled by default** in production to keep the console clean.

## Quick Start - Enable Debug Logs

### Option 1: Browser Console (Runtime)

Open your browser console and type:

```javascript
enableRtkDebug()
```

Then reload the page to see all RTK debug logs.

To disable again:

```javascript
disableRtkDebug()
```

### Option 2: Environment Variable (Development)

Add to your `.env.local` or `.env.development`:

```bash
VITE_RTK_DEBUG=true
```

## What Gets Logged

When debug logging is enabled, you'll see:

- `[Calendar]` - Calendar meeting and call initiation logs
- `[RTK]` - RealtimeKit SDK operations (call lifecycle, tracks, etc.)
- `[RTK Modal]` - Group call modal rendering and state
- `[RTK Virtual Background]` - Virtual background effects
- `[RTK Minimized]` - Minimized call view

## Production Behavior

In production:

- Debug logs (`.log`, `.debug`, `.warn`) are **silent** by default
- Error logs (`.error`) **always show** to catch critical issues

## Implementation Details

All debug logging uses the `rtkDebug` utility from `src/business-apps/platform/apps/chat/utils/rtkDebug.ts`:

```typescript
import { rtkDebug } from '../utils/rtkDebug'

// Instead of console.log()
rtkDebug.log('[RTK] Starting call...')

// Errors always show
rtkDebug.error('[RTK] Failed to start:', error)
```

## Troubleshooting

**Q: I enabled debug mode but don't see logs**  
A: Make sure you reloaded the page after running `enableRtkDebug()`

**Q: How do I check if debug mode is on?**  
A: Open Application → Local Storage → look for `RTK_DEBUG` key set to `"true"`

**Q: Can I enable debug logs for a specific feature only?**  
A: Currently, it's all-or-nothing. You can filter in your browser console using the log prefixes (e.g., filter for `[RTK Modal]`)

## Related Files

- `utils/rtkDebug.ts` - Debug utility implementation
- `hooks/useRealtimeKitGroupCall.ts` - Main RTK call logic
- `components/GroupCallModalRtk.tsx` - RTK call UI
- `services/rtkVirtualBackground.ts` - Virtual background service
- `calendar/Calendar.tsx` - Calendar meeting integration
