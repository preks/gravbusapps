# Versioning, Locking & Publishing Integration Guide

This guide shows how to integrate versioning, locking, and publishing features into Documents, Notes, and Spreadsheets editors.

## Overview

The integration involves:

1. **useVersioning hook** - Auto-save, checkpoints, version history
2. **useFileLock hook** - Manual file locking
3. **usePublishing hook** - Publishing workflow
4. **UI Components** - Version history, lock controls, publish dialog

## Step 1: Import Required Dependencies

```typescript
import { useState } from 'react'
import { useVersioning } from '../shared/hooks/useVersioning'
import { useFileLock } from '../shared/hooks/useFileLock'
import { usePublishing } from '../shared/hooks/usePublishing'
import { VersionHistory } from '../shared/components/VersionHistory'
import { CheckpointDialog } from '../shared/components/CheckpointDialog'
import { AutoSaveIndicator } from '../shared/components/AutoSaveIndicator'
import { LockControls } from '../shared/components/LockControls'
import { StatusBadge } from '../shared/components/StatusBadge'
import { PublishDialog } from '../shared/components/PublishDialog'
import { DocumentApiService } from '../services/DocumentApiService'
// Or NoteApiService / SpreadsheetApiService
```

## Step 2: Initialize Hooks in Editor Component

```typescript
export const DocumentEditor: React.FC<Props> = ({ document, accessToken, currentUserId }) => {
  // Versioning
  const versioning = useVersioning({
    entityId: document.id,
    entityType: 'document',
    apiService: DocumentApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000, // 30 seconds
    onVersionCreated: (version) => {
      console.log('Version created:', version)
    },
    onError: (error) => {
      console.error('Versioning error:', error)
    }
  })

  // File locking
  const fileLock = useFileLock({
    entityId: document.id,
    entityType: 'document',
    currentUserId,
    // apiService: DocumentApiService, // Uncomment when backend is ready
    onLockAcquired: (lock) => {
      console.log('File locked:', lock)
    },
    onLockReleased: () => {
      console.log('File unlocked')
    }
  })

  // Publishing
  const publishing = usePublishing({
    entityId: document.id,
    entityType: 'document',
    currentStatus: document.publishMetadata?.status || 'draft',
    // apiService: DocumentApiService, // Uncomment when backend is ready
    onPublished: (metadata) => {
      console.log('Published:', metadata)
    }
  })

  // UI state
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // Editor change handler
  const handleEditorChange = () => {
    versioning.markAsChanged()
  }

  // Manual checkpoint
  const handleSaveCheckpoint = async (description: string) => {
    await versioning.createCheckpoint(description)
  }

  // Lock/unlock handlers
  const handleLock = async (reason?: string, duration?: number) => {
    await fileLock.acquireLock(reason, duration)
  }

  const handleUnlock = async () => {
    await fileLock.releaseLock()
  }

  // Publishing handlers
  const handlePublish = async (notes?: string, createCheckpoint?: boolean) => {
    await publishing.publish(notes, createCheckpoint)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        {/* Auto-save indicator */}
        <AutoSaveIndicator
          isSaving={versioning.isSaving}
          lastSaveTime={versioning.lastSaveTime}
          hasUnsavedChanges={versioning.hasUnsavedChanges}
          onManualSave={() => setShowCheckpointDialog(true)}
        />

        {/* Version history button */}
        <Button onClick={() => setShowVersionHistory(true)}>
          <Clock /> Version History
        </Button>

        {/* Lock controls */}
        <LockControls
          lock={fileLock.lock}
          canEdit={fileLock.canEdit}
          isLockedByMe={fileLock.isLockedByMe}
          isLocking={fileLock.isLocking}
          isUnlocking={fileLock.isUnlocking}
          onLock={handleLock}
          onUnlock={handleUnlock}
        />

        {/* Status badge */}
        <StatusBadge status={publishing.metadata?.status || 'draft'} />

        {/* Publish button */}
        <Button onClick={() => setShowPublishDialog(true)}>
          Publish
        </Button>
      </div>

      {/* Editor content */}
      <Editor
        content={document.content}
        onChange={handleEditorChange}
        readOnly={!fileLock.canEdit}
      />

      {/* Dialogs */}
      {showVersionHistory && (
        <VersionHistory
          versions={versioning.versions}
          isLoading={versioning.isLoading}
          onRestore={versioning.restoreVersion}
          onCompare={versioning.compareVersions}
          onClose={() => setShowVersionHistory(false)}
          currentVersion={versioning.currentVersion?.version}
        />
      )}

      {showCheckpointDialog && (
        <CheckpointDialog
          isOpen={showCheckpointDialog}
          onClose={() => setShowCheckpointDialog(false)}
          onSave={handleSaveCheckpoint}
          isSaving={versioning.isSaving}
        />
      )}

      {showPublishDialog && (
        <PublishDialog
          isOpen={showPublishDialog}
          onClose={() => setShowPublishDialog(false)}
          onPublish={handlePublish}
          isPublishing={publishing.isPublishing}
          entityType="document"
        />
      )}
    </div>
  )
}
```

## Step 3: Handle Lock State Changes

When a file is locked by another user, disable editing:

```typescript
// In TipTap or editor initialization
const editor = useEditor({
  editable: fileLock.canEdit && !isReadOnly
  // ... other config
})

// Update editor editability when lock state changes
useEffect(() => {
  editor?.setEditable(fileLock.canEdit && !isReadOnly)
}, [fileLock.canEdit, isReadOnly, editor])
```

## Step 4: Disable Yjs Collaboration When Locked

```typescript
// Pause Yjs provider when file is locked
useEffect(() => {
  if (document.id && yjsProviderRef.current) {
    if (fileLock.lock?.isLocked && !fileLock.isLockedByMe) {
      // Disconnect Yjs when locked by someone else
      yjsProviderRef.current.disconnect()
    } else {
      // Reconnect when unlocked
      yjsProviderRef.current.connect()
    }
  }
}, [fileLock.lock?.isLocked, fileLock.isLockedByMe, document.id])
```

## Step 5: Auto-save Integration

The auto-save is handled automatically by the `useVersioning` hook:

1. When content changes, call `versioning.markAsChanged()`
2. The hook will auto-save after 30 seconds (configurable)
3. Auto-save creates versions with `isAutoSave: true`
4. Old auto-save versions are cleaned up automatically

## Step 6: Manual Checkpoints

Users can create manual checkpoints (with `isCheckpoint: true`):

```typescript
const handleSaveCheckpoint = async (description: string) => {
  const version = await versioning.createCheckpoint(description)
  if (version) {
    // Show success message
  }
}
```

## Step 7: Version Restoration

Restore to a previous version (creates new version with old content):

```typescript
const handleRestore = async (versionNumber: number) => {
  const success = await versioning.restoreVersion(versionNumber)
  if (success) {
    // Reload document/note/spreadsheet
    // The editor will show the restored content
  }
}
```

## Step 8: Publishing Workflow

```typescript
// Publish
await publishing.publish('Ready for production', true)

// Move to review
await publishing.moveToReview()

// Archive
await publishing.archive()

// Unpublish (revert to draft)
await publishing.unpublish()
```

## Complete Example Integration

See the implementation in:

- `src/business-apps/platform/apps/document-apps/components/PagedDocumentEditor/`
- `src/business-apps/platform/apps/note-apps/NoteEditor.tsx`
- `src/business-apps/platform/apps/spreadsheet-apps/SpreadsheetAppViewer.tsx`

## Backend Requirements

### Already Implemented

- ✅ Versioning API (`/versions/...`)
- ✅ Version comparison
- ✅ Version restoration

### Requires Implementation

- ❌ Comments API (Phase 2)
- ❌ Locks API (Phase 3)
- ❌ Publishing endpoints (Phase 4)

Until backend endpoints are ready, the hooks will show appropriate warnings and the UI will display "not yet implemented" messages.

## Testing

Test scenarios:

1. Create and restore versions
2. Lock and unlock files
3. Publish and unpublish
4. Auto-save while editing
5. Manual checkpoints
6. Version comparison

## Notes

- Auto-save only works when file is not locked by another user
- Published documents can still have new versions created
- Version history is preserved even after publishing
- Lock expires automatically after TTL (default 4 hours)
- Yjs collaboration is disabled when file is locked
