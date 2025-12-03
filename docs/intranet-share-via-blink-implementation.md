# Intranet "Share via Blink" Implementation Guide

## Overview

This document provides a complete implementation guide for adding a "Share via Blink" feature to the intranet application. This feature allows users to share news articles, knowledge articles, documents, or questions with employees using the Blink flow system (similar to EveryBox).

## Reference Branch

The complete Blink implementation exists in the `NO-TICKET_digital-workplace` branch of the `gravity-business-apps` repository at:

```
/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps
```

## Architecture Overview

### Entity Reference Flow

When sharing content via Blink, entity references are stored in **two places** for different purposes:

#### 1. In Workflow Links (for task inbox display)

```typescript
const entityLink: Link = {
  name: 'Article Title', // Display name
  url: '/intranet/articles/123', // URL to navigate to
  type: 'entity:news-article', // Type identifier (entity:{type})
  metadata: {
    entityType: 'news-article', // Entity type
    entityId: 'article-123' // Entity ID
  }
}
```

#### 2. In Workflow Tags (for outbox list display)

```typescript
tags: {
  app: 'quick-task',
  entityType: "news-article",
  entityId: "article-123",
  entityName: "Article Title",
  entityDisplayUrl: "/intranet/articles/123"
}
```

### How Entity References Display in EveryBox

**In Task Detail View (Inbox):**

- Shows "Related To" section with badge showing entity type
- Clickable link to navigate to the original content
- Uses `LinkIcon` and `ExternalLink` icons
- See `TaskDetailDialog.tsx` lines 378-399 in reference branch

## Key Components to Reference

### 1. Employee Search Component (REUSE THIS - REQUIRED)

**Path:** `src/business-apps/flow/common/components/flow-quick-task/SearchableEmployeeCombobox.tsx`

**Features:**

- Multi-select employee picker with avatars
- Search functionality with debouncing
- Shows selected employees as chips
- Full-screen modal dialog for selection
- Handles base64 avatar conversion and caching
- Supports both single and multi-select modes

**Usage:**

```typescript
import { SearchableEmployeeCombobox } from
  '@/business-apps/flow/common/components/flow-quick-task'

<SearchableEmployeeCombobox
  options={employeeOptions}
  value={selectedEmployeeIds}
  onValueChange={setSelectedEmployeeIds}
  onSearchChange={handleSearch}
  placeholder="Select employees..."
  searchPlaceholder="Search employees..."
  multiple={true}
  loading={isLoadingEmployees}
/>
```

### 2. Quick Task Service (REUSE THIS - REQUIRED)

**Path:** `src/business-apps/flow/common/components/flow-quick-task/services/QuickTaskFlowService.ts`

**Key Methods:**

- `QuickTaskFlowService.executeQuickTask()` - Main method to create Blinks
- `createAssignmentTargets()` - Helper for assignment structure

**Features:**

- Supports multi-assignee (creates separate workflow for each user)
- Automatically groups workflows with `blinkGroupId`
- **Entity Reference Support:** Pass `entityType`, `entityId`, `entityName`, `entityDisplayUrl` in formData
- These references are stored in both workflow `links` and `tags`

**Method Signature:**

```typescript
interface ExecuteQuickTaskOptions {
  formData: QuickTaskFormData
  uploadResults?: any[]
  accessToken: string
  initiatorId: string
  apiBaseUrl: string
}

QuickTaskFlowService.executeQuickTask(options: ExecuteQuickTaskOptions): Promise<any>
```

### 3. Quick Task Modal (CAN REUSE OR CUSTOMIZE)

**Path:** `src/business-apps/flow/common/components/flow-quick-task/QuickTaskModal.tsx`

**Features:**

- Pre-built modal wrapper for Quick Task creation
- Gradient header with Zap icon
- Responsive design with proper overflow handling
- Configurable title and description
- Automatic modal close on successful submission

**Props Interface:**

```typescript
interface QuickTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId?: string
  onSubmit: (data: QuickTaskFormData) => Promise<void>
  title?: string
  description?: string
  config?: QuickTaskFormConfig
}
```

### 4. Quick Task Form Data Interface

**Path:** `src/business-apps/flow/common/components/flow-quick-task/types.ts`

```typescript
export interface QuickTaskFormData {
  title: string
  message: string
  documents: QuickTaskUploadFile[]
  assignedUserIds: string[] // Array for multiple users
  dueDate: string
  // Entity reference fields (ADD THESE for share feature)
  entityType?: string
  entityId?: string
  entityName?: string
  entityDisplayUrl?: string
  entityMetadata?: Record<string, any>
}
```

### 5. EveryBox Implementation Reference

**Path:** `src/business-apps/platform/apps/every-box/EveryBox.tsx`

**Key Lines:** 198-263 - Shows complete Blink submission flow including:

- File upload handling
- Calling `QuickTaskFlowService.executeQuickTask()`
- Success/error messaging
- Background data refresh

## Implementation Steps

### Step 1: Install Required Imports

```typescript
// Quick Task components and services
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService
} from '@/business-apps/flow/common/components/flow-quick-task'

// File upload client (if needed)
import { FileClient } from '@/common/network/files/FileClient'

// Environment configuration
import { env } from '@/common/env/EnvUtils'

// UI components
import { Button } from '@newwork/nw-design-system'
import { Share } from 'lucide-react'
import { message } from 'antd'
```

### Step 2: Create Share Dialog Component

Create a new file: `src/components/share-dialog/ShareDialog.tsx`

```typescript
import React from 'react'
import { message } from 'antd'
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService
} from '@/business-apps/flow/common/components/flow-quick-task'
import { env } from '@/common/env/EnvUtils'

export interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId: string
  // Entity being shared
  entityType: 'news-article' | 'knowledge-article' | 'document' | 'question'
  entityId: string
  entityName: string
  entityDisplayUrl: string
  entityMetadata?: Record<string, any>
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  currentUserId,
  entityType,
  entityId,
  entityName,
  entityDisplayUrl,
  entityMetadata
}) => {
  const handleShare = async (data: QuickTaskFormData) => {
    try {
      // Add entity reference to form data
      const formDataWithEntity: QuickTaskFormData = {
        ...data,
        entityType,
        entityId,
        entityName,
        entityDisplayUrl,
        entityMetadata
      }

      const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') ||
        'https://newwork-dev.newwork.com/flow-engine'

      // Execute the quick task with entity reference
      await QuickTaskFlowService.executeQuickTask({
        formData: formDataWithEntity,
        uploadResults: [], // No file uploads for share
        accessToken,
        initiatorId: currentUserId,
        apiBaseUrl: baseUrl
      })

      message.success(`Shared "${entityName}" with ${data.assignedUserIds.length} employee(s) successfully!`)
    } catch (error) {
      message.error(`Failed to share: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error // Re-throw to prevent modal from closing
    }
  }

  return (
    <QuickTaskModal
      open={open}
      onOpenChange={onOpenChange}
      accessToken={accessToken}
      currentUserId={currentUserId}
      onSubmit={handleShare}
      title="Share via Blink"
      description="Share this content with employees instantly"
      config={{
        assigneeSelector: { mode: 'employee-search', required: true },
        enableFileUpload: false, // Disable file upload for share
        enableDueDate: true,
        maxFiles: 0
      }}
    />
  )
}
```

### Step 3: Add Share Button to Content Pages

Update your news article, knowledge article, document, or question components:

```typescript
import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Share } from 'lucide-react'
import { ShareDialog } from '@/components/share-dialog/ShareDialog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ContentPageProps extends BusinessAppContextProps {
  // Your existing props
}

export const ContentPage: React.FC<ContentPageProps> = (context) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Example: News article data
  const article = {
    id: 'article-123',
    title: 'Important Company Announcement',
    url: `/intranet/news/${article.id}`
  }

  return (
    <div>
      {/* Your existing content */}

      {/* Share Button */}
      <Button
        onClick={() => setShareDialogOpen(true)}
        variant="outline"
        data-testid="article-share-button"
      >
        <Share className="gba:h-4 gba:w-4 gba:mr-2" />
        Share
      </Button>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        accessToken={context.accessToken}
        currentUserId={context.userInfo?.id || ''}
        entityType="news-article"
        entityId={article.id}
        entityName={article.title}
        entityDisplayUrl={article.url}
        entityMetadata={{
          // Optional: Add any additional context
          category: 'company-news',
          publishedDate: '2025-01-15'
        }}
      />
    </div>
  )
}
```

### Step 4: Entity Type Mapping

Map your intranet content types to entity type identifiers:

| Content Type        | Entity Type ID      | Display Name        | Example URL                    |
| ------------------- | ------------------- | ------------------- | ------------------------------ |
| News Article        | `news-article`      | "News Article"      | `/intranet/news/{id}`          |
| Knowledge Article   | `knowledge-article` | "Knowledge Article" | `/intranet/knowledge/{id}`     |
| Document            | `document`          | "Document"          | `/intranet/documents/{id}`     |
| Question/Discussion | `question`          | "Question"          | `/intranet/questions/{id}`     |
| Policy              | `policy`            | "Policy"            | `/intranet/policies/{id}`      |
| Announcement        | `announcement`      | "Announcement"      | `/intranet/announcements/{id}` |

**TypeScript Type Definition:**

```typescript
export type IntranetEntityType =
  | 'news-article'
  | 'knowledge-article'
  | 'document'
  | 'question'
  | 'policy'
  | 'announcement'
```

### Step 5: Add Index Export (Optional)

Create `src/components/share-dialog/index.ts`:

```typescript
export { ShareDialog } from './ShareDialog'
export type { ShareDialogProps } from './ShareDialog'
```

## Configuration Options

### Quick Task Modal Config

```typescript
interface QuickTaskFormConfig {
  // Assignee selector configuration
  assigneeSelector?: {
    mode: 'employee-search' // Use employee search component
    required?: boolean // Make assignee selection required
  }

  // File upload configuration
  enableFileUpload?: boolean // Enable/disable file upload
  maxFiles?: number // Maximum number of files
  maxFileSize?: number // Max file size in MB
  allowedFileTypes?: string[] // Allowed file extensions

  // Due date configuration
  enableDueDate?: boolean // Enable/disable due date picker

  // UI configuration
  layout?: 'default' | 'compact' // Form layout style
  taskName?: string // Button text override
}
```

**Recommended Config for Share:**

```typescript
config={{
  assigneeSelector: { mode: 'employee-search', required: true },
  enableFileUpload: false,
  enableDueDate: true,
  maxFiles: 0
}}
```

## How It Works

### 1. User Flow

1. User clicks "Share" button on content page
2. Share dialog opens with Quick Task form
3. User searches and selects employee(s) from SearchableEmployeeCombobox
4. User optionally adds a message and due date
5. User clicks "Share" / "Create Blink"
6. System creates separate workflow for each selected employee (grouped by `blinkGroupId`)
7. Each workflow includes entity reference in both `links` and `tags`
8. Success message shows, dialog closes

### 2. Recipient Flow

1. Recipient sees new task in EveryBox inbox
2. Task shows shared content title and message
3. "Related To" section displays with entity type badge
4. Clicking entity link navigates to original content in intranet
5. Recipient can complete or respond to the Blink

### 3. Sender Flow

1. Sender sees created Blinks in EveryBox outbox
2. If multiple employees selected, shows grouped entry (e.g., "3 employees")
3. Shows completion status (e.g., "2/3 completed")
4. Can track who has viewed/completed the shared content

## Technical Details

### Multi-Assignee Workflow Creation

When sharing with multiple employees, the service:

1. Generates unique `blinkGroupId` = `blink_group_{timestamp}_{initiatorId}`
2. Creates separate workflow instance for each employee
3. Tags each workflow with:
   - `blinkGroupId` - for grouping in outbox
   - `assignedUserId` - to identify recipient
   - Entity reference fields - for display
4. Groups workflows in outbox view by `blinkGroupId`

**Example:**

```typescript
// Share with 3 employees creates 3 workflows:
{
  workflow1: { tags: { blinkGroupId: 'blink_group_123', assignedUserId: 'user-1' } },
  workflow2: { tags: { blinkGroupId: 'blink_group_123', assignedUserId: 'user-2' } },
  workflow3: { tags: { blinkGroupId: 'blink_group_123', assignedUserId: 'user-3' } }
}
// Displayed as single grouped entry in outbox showing "3 employees, 1/3 completed"
```

### Entity Reference Storage

**In Workflow Links Array:**

```typescript
links: [
  {
    name: 'Important Company Announcement',
    url: '/intranet/news/article-123',
    type: 'entity:news-article',
    metadata: {
      entityType: 'news-article',
      entityId: 'article-123'
    }
  }
]
```

**In Workflow Tags Object:**

```typescript
tags: {
  app: 'quick-task',
  blinkGroupId: 'blink_group_1234567890_user-abc',
  assignedUserId: 'user-xyz',
  entityType: "news-article",
  entityId: "article-123",
  entityName: "Important Company Announcement",
  entityDisplayUrl: "/intranet/news/article-123"
}
```

**Why Both?**

- `links` - Used by task detail view to display "Related To" section
- `tags` - Used by outbox list view (list API doesn't return links)

## Testing Checklist

### Functional Testing

- [ ] Share button appears on all content types
- [ ] Share dialog opens with correct entity information
- [ ] Employee search works (search, select, multi-select)
- [ ] Can share with single employee
- [ ] Can share with multiple employees (3+)
- [ ] Custom message and due date are optional
- [ ] Success message displays after share
- [ ] Dialog closes after successful share

### EveryBox Integration

- [ ] Shared content appears in recipient's inbox
- [ ] Task title matches shared content title
- [ ] "Related To" section displays with correct entity type badge
- [ ] Clicking entity link navigates to correct content
- [ ] Entity name is clickable and has hover effect
- [ ] ExternalLink icon appears on hover

### Outbox Display

- [ ] Shared Blinks appear in sender's outbox
- [ ] Multi-employee shares show as grouped entry
- [ ] Completion count shows correctly (e.g., "2/3 completed")
- [ ] Entity type badge displays in outbox cards
- [ ] Can expand grouped entry to see individual workflows

### Error Handling

- [ ] Error message if no employees selected
- [ ] Error message if API call fails
- [ ] Dialog stays open on error
- [ ] Proper error messages for network failures

### Performance

- [ ] Employee search debounces properly (no excessive API calls)
- [ ] Avatar images load and cache correctly
- [ ] Dialog opens and closes smoothly
- [ ] Large employee list (100+) performs well

## Troubleshooting

### Common Issues

#### 1. Employee Search Not Working

**Problem:** SearchableEmployeeCombobox shows no results

**Solution:**

- Verify `useEmployeeSearch` hook is implemented
- Check GraphQL/API endpoint for employee data
- Ensure access token is passed correctly
- Check browser console for API errors

#### 2. Entity Link Not Appearing in Task Detail

**Problem:** "Related To" section doesn't show in inbox

**Solution:**

- Verify entity reference is in `formData` before calling `executeQuickTask()`
- Check that `entityType`, `entityId`, `entityName`, and `entityDisplayUrl` are all provided
- Inspect workflow in database - check `links` array
- See `TaskDetailDialog.tsx` line 240 for link detection logic

#### 3. Navigation Not Working

**Problem:** Clicking entity link doesn't navigate

**Solution:**

- Ensure `entityDisplayUrl` is a valid route in your app
- Check that route is registered in your router
- Verify `navigateTo()` utility is working
- Use absolute paths, not relative paths

#### 4. Workflows Not Grouping in Outbox

**Problem:** Multiple workflows show as separate entries instead of grouped

**Solution:**

- Verify `blinkGroupId` is being set in workflow tags
- Check `useOutboxFlows.ts` line 177-227 for grouping logic
- Ensure all workflows from same share have identical `blinkGroupId`
- Check browser console for grouping errors

#### 5. File Upload Issues (if enabled)

**Problem:** Files not uploading or attaching

**Solution:**

- See `EveryBox.tsx` lines 204-241 for file upload example
- Verify `FileClient` is configured correctly
- Check file size limits
- Ensure proper `originFileObj` is present

## Advanced Customization

### Custom Share Dialog

If you need a custom UI instead of QuickTaskModal:

```typescript
import { QuickTaskForm } from '@/business-apps/flow/common/components/flow-quick-task'

export const CustomShareDialog: React.FC<ShareDialogProps> = (props) => {
  return (
    <YourCustomModal>
      <YourCustomHeader />
      <QuickTaskForm
        accessToken={props.accessToken}
        currentUserId={props.currentUserId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        config={{
          assigneeSelector: { mode: 'employee-search', required: true },
          enableFileUpload: false,
          enableDueDate: true
        }}
      />
    </YourCustomModal>
  )
}
```

### Custom Entity Display in Task Detail

To customize how your entity references appear:

1. Fork `TaskDetailDialog.tsx` component
2. Add custom logic for your entity types
3. Modify the "Related To" section rendering (lines 378-399)
4. Add entity-specific badges, icons, or previews

### Adding Entity Metadata

Pass additional context in `entityMetadata`:

```typescript
<ShareDialog
  entityMetadata={{
    category: 'company-news',
    author: 'John Doe',
    publishedDate: '2025-01-15',
    tags: ['important', 'all-hands'],
    thumbnailUrl: '/images/article-thumb.jpg'
  }}
/>
```

Access in custom task detail view:

```typescript
const metadata = entityLink?.metadata?.entityMetadata
const category = metadata?.category
const author = metadata?.author
```

## API Requirements

### Flow Engine API

Ensure your environment has:

- `NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL` configured
- Flow Engine API accessible with bearer token authentication
- `/api/templates/execute-dynamic` endpoint available

### Employee Search API

Implement `useEmployeeSearch` hook or use existing:

- GraphQL query for employee search
- Returns: `{ id, firstName, lastName, displayName, avatar (base64) }`
- Supports search by name
- Handles pagination

## Security Considerations

1. **Access Control:** Verify user has permission to share content
2. **Token Validation:** Ensure access token is valid before API calls
3. **Input Sanitization:** Sanitize entity names and messages
4. **URL Validation:** Validate `entityDisplayUrl` is internal route
5. **Employee Selection:** Verify selected employees are valid and accessible

## Performance Optimization

1. **Debounce Employee Search:** Already implemented in SearchableEmployeeCombobox (300ms)
2. **Avatar Caching:** Component caches base64-to-ObjectURL conversions
3. **Parallel Workflow Creation:** Multiple workflows created in parallel with `Promise.all()`
4. **Lazy Load Modal:** Only render ShareDialog when needed
5. **Background Refresh:** EveryBox refreshes data in background after share

## Support and Maintenance

### Key Files to Monitor

- `QuickTaskFlowService.ts` - Workflow creation logic
- `SearchableEmployeeCombobox.tsx` - Employee selection UI
- `TaskDetailDialog.tsx` - Entity display in inbox
- `useOutboxFlows.ts` - Outbox grouping logic

### Future Enhancements

- [ ] Share analytics (who viewed, when)
- [ ] Share templates (pre-filled messages)
- [ ] Share scheduling (send at specific time)
- [ ] Share permissions (restrict by role)
- [ ] Bulk share (share multiple items at once)
- [ ] Share notifications (email/push notifications)
- [ ] Share comments (allow recipients to comment)

## Conclusion

This implementation leverages the existing Blink infrastructure to add sharing functionality to your intranet. By reusing the `SearchableEmployeeCombobox` and `QuickTaskFlowService`, you get a consistent, tested, and feature-complete sharing experience with minimal custom code.

The entity reference system ensures that shared content is properly linked and accessible from the EveryBox inbox, providing a seamless experience for both senders and recipients.

For questions or issues, refer to the reference implementation in the `NO-TICKET_digital-workplace` branch or contact the platform team.
