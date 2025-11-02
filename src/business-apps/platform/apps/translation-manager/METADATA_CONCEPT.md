# Translation Manager - Metadata & Review Workflow

## Overview

Comprehensive metadata system for managing translation reviews, versioning, and approval workflows.

## 1. FTL File Metadata

### Structure

Each `.ftl` file contains metadata as top-level comments:

```ftl
# file-meta: {
#   "status": "approved",
#   "updatedBy": "user@example.com",
#   "updatedAt": "2025-01-01T12:00:00Z",
#   "reviewedAt": "2025-01-02T10:00:00Z",
#   "reviewedBy": "reviewer@example.com",
#   "reviewedKeys": ["welcome-message", "login-title"],
#   "notes": "Updated after marketing review"
# }

welcome-message = Hello {$name}!
login-title = Sign In
```

### Metadata Fields

- `status`: `proposed` | `approved` | `deprecated`
- `updatedBy`: Email of last editor
- `updatedAt`: ISO timestamp of last file update
- `reviewedAt`: ISO timestamp of last review
- `reviewedBy`: Email of reviewer
- `reviewedKeys`: Array of key IDs that have been reviewed
- `notes`: Optional reviewer comments

## 2. Change Detection

### Logic

A file **needs review** when:

```typescript
reviewedAt < lastModified OR !reviewedAt
```

### Visual Indicators

- ⚠️ "Needs Review" badge on files/locales
- Color-coded status in tree
- Review checkbox per translation key

## 3. LocalStorage Cache

### Purpose

- Auto-save unsaved changes locally
- Prevent data loss
- Track reviewed keys before PR

### Cache Structure

```typescript
{
  scopePath: string,
  translations: [
    { keyId: string, locale: string, value: ASTPattern, timestamp: number }
  ],
  reviews: [
    { keyId: string, reviewed: boolean, timestamp: number }
  ]
}
```

### Cache Key

`translation-manager-cache` in localStorage

## 4. Mark as Reviewed

### Per-Key Review

- Checkbox in editor panel: "Reviewed"
- Stored in cache
- Visual indicator in key list
- Required before saving to PR

### Bulk Review

- Table view shows all keys
- Review checkbox per row
- Filter by review status

## 5. Review Approval Workflow

### Workflow Steps

1. **Edit**: Make translation changes → cached locally
2. **Review**: Mark keys as reviewed → cached locally
3. **Save**: Create PR with:
   - Updated translation content
   - Updated `reviewedKeys` array
   - New `reviewedAt` timestamp
4. **Approval**: PR merged → `reviewedAt` updated in Git

### PR Requirements

- All keys must be marked as reviewed
- Save button disabled until all keys reviewed
- PR title: `translations: Update ${locale} in ${scope}`
- PR body: List of changed keys

### States

```
File Created → needs review (no reviewedAt)
  ↓
Keys Edited → needs review (updatedAt > reviewedAt)
  ↓
Keys Reviewed → pending save (cache only)
  ↓
PR Created → under review (PR open)
  ↓
PR Merged → approved (reviewedAt >= lastModified)
```

## 6. Locale Filter

### UI Location

Top bar filter dropdown

### Options

- "All Languages" (default)
- Individual locales: `en-US`, `de-DE`, `ro-RO`, etc.

### Behavior

- **Single-Key View**: Shows only selected locale in editor
- **Table View**: Shows only selected locale column
- Reviewer can focus on one language at a time

## 7. View Toggle

### Modes

#### Single-Key View (3-column)

```
[Tree] [Key List] [Editor Panel]
```

- Ideal for detailed editing
- Side-by-side comparison
- Variable management
- Review checkbox per key

#### Table View (All Keys)

```
[Tree] [Full Table]
```

- Overview of all keys
- Quick batch editing
- Export-friendly
- Bulk operations

### Toggle

Top bar buttons: "Single Key" | "All Keys (Table)"

## 8. Tree UI Improvements

### Changes

- ✅ Fully expanded by default
- ✅ No folder icons (only file icons 📄 for translation scopes)
- ✅ Hide `src` folder in hierarchy
- ✅ Clean, minimal design

### Hierarchy

```
Before:
└── src
    └── business-apps
        └── hr
            └── core

After:
└── business-apps
    └── hr
        └── core 📄
```

## 9. File Review Status

### Calculation

```typescript
file.needsReview = lastModified && reviewedAt ? new Date(lastModified) > new Date(reviewedAt) : !reviewedAt
```

### Display

- Badge in editor: "Needs Review"
- Color in tree (future)
- Filter by review status (future)

## 10. Future Enhancements (Not Implemented)

### PR Workflow

- Auto-create PR from UI
- Link to open PRs
- Sync review status from PR comments
- Auto-merge if approved

### Collaboration

- Real-time conflict detection
- Lock keys being edited
- Show who's editing what

### Analytics

- Translation coverage metrics
- Review velocity
- Key change history
- Time-to-review stats

### Export/Import

- Export to XLIFF, PO, JSON
- Import from translation services
- Bulk upload via CSV

---

**Status**: ✅ Core metadata system implemented  
**Remaining**: PR workflow integration (requires Git write operations)
