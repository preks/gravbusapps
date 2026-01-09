# Document Apps - Word-like Document Editor

Create, edit, and manage documents with a rich text editor, similar to Microsoft Word.

## Overview

The Document Apps module allows users to:

1. **Create** new documents from scratch or templates
2. **Upload** existing Word documents (.docx) with formatting preserved
3. **Edit** with a full-featured rich text editor (ReactQuill)
4. **Manage Templates** - create, use, and share document templates
5. **Send for Approval** - integrated approval workflow
6. **Export** to Word (.doc) and PDF formats

## Features

### Rich Text Editing

- Full formatting toolbar with headers (H1-H6)
- Text styling: bold, italic, underline, strikethrough
- Lists: bullet, numbered, and checklist
- Text alignment and indentation
- Colors: text color and background color
- Links, images, and embedded media
- Blockquotes and code blocks
- Auto-save functionality

### Word Upload

- Drag-and-drop file upload
- Uses mammoth.js for .docx parsing
- Preserves formatting, styles, and images
- Supports .docx and .doc formats

### Template Management

- Built-in templates (NDA, Letters, Reports, etc.)
- Create custom templates from any document
- Public and private template sharing
- Categorized template gallery

### Approval Workflow

- Send documents for review and approval
- Select multiple approvers
- Add messages and due dates
- Track approval status

## Quick Start

```tsx
import { DocumentAppsHub } from '@/business-apps/platform/apps/document-apps'

const MyComponent = () => {
  return <DocumentAppsHub accessToken={accessToken} userInfo={userInfo} />
}
```

## Components

| Component                 | Description                             |
| ------------------------- | --------------------------------------- |
| \`DocumentAppsHub\`       | Main entry point - manage all documents |
| \`DocumentEditor\`        | Rich text editor component              |
| \`WordUploader\`          | Drag-drop Word file upload              |
| \`TemplateGallery\`       | Browse and select templates             |
| \`DocumentPreviewCard\`   | Document card for list view             |
| \`SendForApprovalDialog\` | Approval workflow dialog                |

## Hooks

| Hook                     | Description                          |
| ------------------------ | ------------------------------------ |
| \`useWordParser\`        | Parse Word documents with mammoth.js |
| \`useDocumentApps\`      | CRUD operations for documents        |
| \`useDocumentTemplates\` | Template management                  |

## Types

Key types are defined in \`types/document.ts\`:

- \`Document\` - Complete document definition
- \`DocumentSummary\` - Light document for lists
- \`DocumentTemplate\` - Template definition
- \`ParsedWordDocument\` - Word parsing result
- \`ApprovalWorkflowConfig\` - Approval configuration

## Architecture

```
document-apps/
+-- DocumentAppsHub.tsx      # Main hub component
+-- DocumentEditor.tsx       # Rich text editor
+-- components/              # Reusable components
    +-- WordUploader.tsx
    +-- DocumentPreviewCard.tsx
    +-- TemplateGallery.tsx
    +-- SendForApprovalDialog.tsx
+-- hooks/                   # Custom hooks
    +-- useWordParser.ts
    +-- useDocumentApps.ts
    +-- useDocumentTemplates.ts
+-- services/                # Business logic
    +-- DocumentFileStorageService.ts
    +-- DocumentApprovalService.ts
+-- utils/                   # Utilities
    +-- exportUtils.ts
+-- types/                   # TypeScript types
    +-- document.ts
```

## Dependencies

- **react-quill** - Rich text editor (already in project)
- **mammoth** - Word document parsing

## Styling

Uses the same design tokens and patterns as Spreadsheet Apps:

- NEWWORK Design System components
- Primary gradient accents
- Card-based layouts
- Consistent with Spreadsheet Apps branding

## Related

- [Spreadsheet Apps](../spreadsheet-apps/README.md) - Excel-to-App generator
- [Document Creator](../../core/documents/apps/document-creator/README.md) - Contract templates
