# Document Reviewer Setup Guide

This guide explains how to set up the Document Reviewer agent in Prompt Manager and integrate it with the frontend.

## Overview

The Document Reviewer is an AI agent that analyzes documents (knowledge articles, contracts, policies, etc.) and provides structured annotations that can be displayed as visual highlights and comments in the UI.

### Components

1. **`document_observer` Tool** - Fetches and prepares document content for analysis
2. **`document_reviewer` Agent** - AI prompt that analyzes documents and generates annotations
3. **Frontend Components** - React components to display annotations

## Step 1: Register the Tool

### Option A: Via Task Expert Studio (Recommended)

1. Navigate to **Task Expert Studio**: https://newwork-dev.newwork.com/platform/apps/task-expert-studio

2. Go to the **Tools** tab

3. Click **New Tool**

4. Fill in the form:
   - **Name**: `document_observer`
   - **Description**: `Fetches and analyzes documents from the NEWWORK platform for AI-powered review`
   - **Type**: `function`
   - **Runtime**: `js-runtime`

5. Copy the source code from `definitions/document-observer-tool.ts` (the `DOCUMENT_OBSERVER_SOURCE` constant)

6. Set up the schema:
   - Input Schema: Copy from `DOCUMENT_OBSERVER_INPUT_SCHEMA`
   - Output Schema: Copy from `DOCUMENT_OBSERVER_OUTPUT_SCHEMA`

7. Click **Save**

### Option B: Via API

```typescript
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { DOCUMENT_OBSERVER_TOOL } from '@/business-apps/ai/apps/document-reviewer'

const client = usePromptManagerClient(accessToken)

// Create the tool
await client.createFunctionTool(DOCUMENT_OBSERVER_TOOL)
```

### Option C: Via Script

```typescript
// scripts/register-document-reviewer.ts
import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { DOCUMENT_OBSERVER_TOOL, createDocumentReviewerAgent } from '@/business-apps/ai/apps/document-reviewer'

async function register(accessToken: string, workspaceId: string, modelId: string) {
  promptManagerClient.setAccessToken(accessToken)

  // 1. Create the tool
  console.log('Creating document_observer tool...')
  const tool = await promptManagerClient.createFunctionTool(DOCUMENT_OBSERVER_TOOL)
  console.log('Tool created:', tool._id)

  // 2. Create the agent
  console.log('Creating document_reviewer agent...')
  const agentConfig = createDocumentReviewerAgent(workspaceId, modelId)
  const agent = await promptManagerClient.createPrompt(agentConfig)
  console.log('Agent created:', agent._id)

  return { tool, agent }
}
```

## Step 2: Register the Agent

### Option A: Via Task Expert Studio

1. Navigate to **Task Expert Studio**

2. Go to the **Task Experts** tab

3. Click **New Task Expert**

4. Fill in the form:
   - **Name**: `document_reviewer`
   - **Description**: `AI-powered document reviewer that provides structured annotations`
   - **Workspace**: Select your workspace
   - **Model**: Select GPT-4 or equivalent

5. **System Prompt**: Copy from `DOCUMENT_REVIEWER_SYSTEM_PROMPT` in `definitions/document-reviewer-agent.ts`

6. **User Prompt**: Copy from `DOCUMENT_REVIEWER_USER_PROMPT`

7. **Tools**: Select `document_observer` from the list

8. **Model Settings**:
   - Temperature: `0.3`
   - Max Tokens: `4096`

9. **Response Schema**: Copy from `DOCUMENT_REVIEWER_RESPONSE_SCHEMA`

10. Click **Save**

### Option B: Via API

```typescript
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { createDocumentReviewerAgent } from '@/business-apps/ai/apps/document-reviewer'

const client = usePromptManagerClient(accessToken)

// Create the agent (you need workspace and model IDs from your environment)
const agentConfig = createDocumentReviewerAgent(workspaceId, modelId)
await client.createPrompt(agentConfig)
```

## Step 3: Integrate with Frontend

### Basic Usage

```tsx
import React from 'react'
import { useDocumentReview, DocumentAnnotationOverlay } from '@/business-apps/ai/apps/document-reviewer'

const DocumentViewer: React.FC<{ documentId: string; content: string; accessToken: string }> = ({
  documentId,
  content,
  accessToken
}) => {
  const { annotations, selectedAnnotation, isLoading, error, quickReview, selectAnnotation, resolveAnnotation } =
    useDocumentReview({ accessToken })

  const handleReview = async () => {
    await quickReview(documentId, 'knowledge_article', 'all')
  }

  return (
    <div>
      <button onClick={handleReview} disabled={isLoading}>
        {isLoading ? 'Reviewing...' : 'Review Document'}
      </button>

      {error && <div className="error">{error}</div>}

      <DocumentAnnotationOverlay
        content={content}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotation?.id}
        isLoading={isLoading}
        onAnnotationClick={ann => selectAnnotation(ann.id)}
        onResolve={ann => resolveAnnotation(ann.id)}
      />
    </div>
  )
}
```

### Integration with Knowledge Article View

```tsx
// In KnowledgeArticleView.tsx or similar
import { useDocumentReview, DocumentAnnotationOverlay } from '@/business-apps/ai/apps/document-reviewer'

const KnowledgeArticleView: React.FC<Props> = ({ item, accessToken, ...props }) => {
  const { annotations, selectedAnnotation, isLoading, quickReview, selectAnnotation, resolveAnnotation } =
    useDocumentReview({ accessToken })

  // Add review button to the UI
  const handleReview = () => {
    quickReview(item.id, 'knowledge_article', 'grammar')
  }

  return (
    <div>
      {/* Your existing article header */}
      <Button onClick={handleReview}>AI Review</Button>

      {/* Wrap content with annotation overlay */}
      <DocumentAnnotationOverlay
        content={item.content || ''}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotation?.id}
        isLoading={isLoading}
        onAnnotationClick={ann => selectAnnotation(ann.id)}
        onResolve={ann => resolveAnnotation(ann.id)}
      />
    </div>
  )
}
```

### With Conversational Chat Sidebar Integration

The document reviewer supports **natural language requests** through the chat sidebar. Users can say things like:

- _"Review this document for grammar issues"_
- _"Check this article for compliance"_
- _"Proofread this"_
- _"Analyze this contract for legal risks"_

#### Step 1: Wrap Your App with the Provider

```tsx
// In your main App or layout
import { DocumentReviewProvider } from '@/business-apps/ai/apps/document-reviewer'

const App = () => (
  <DocumentReviewProvider>
    <YourLayout>
      <DocumentView />
      <ChatSidebar />
    </YourLayout>
  </DocumentReviewProvider>
)
```

#### Step 2: Register Documents in Views

```tsx
// In KnowledgeArticleView.tsx or any document view
import { useDocumentViewAnnotations, DocumentAnnotationOverlay } from '@/business-apps/ai/apps/document-reviewer'

const KnowledgeArticleView = ({ item, accessToken }) => {
  // Register this document with the review system
  const { annotations, selectedAnnotationId, isReviewing, selectAnnotation, resolveAnnotation, requestReview } =
    useDocumentViewAnnotations(item.id, 'knowledge_article', {
      title: item.title,
      content: item.content
    })

  return (
    <div>
      {/* Optional: Add a review button */}
      <Button onClick={() => requestReview('grammar')}>Quick Grammar Check</Button>

      {/* Wrap content with annotation overlay */}
      <DocumentAnnotationOverlay
        content={item.content}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotationId}
        isLoading={isReviewing}
        onAnnotationClick={ann => selectAnnotation(ann.id)}
        onResolve={ann => resolveAnnotation(ann.id)}
      />
    </div>
  )
}
```

#### Step 3: Integrate with Chat

```tsx
// In your Chat component or a wrapper
import { useDocumentReviewChat, useDocumentReviewContext } from '@/business-apps/ai/apps/document-reviewer'

const ChatWithDocumentReview = ({ accessToken }) => {
  const { currentDocument, setAnnotations, setIsReviewing } = useDocumentReviewContext()

  const { processMessage, isReviewRequest, isReviewing } = useDocumentReviewChat({
    accessToken,
    documentContext: currentDocument,
    onAnnotationsReady: (annotations, documentId) => {
      // Annotations are automatically dispatched via event
      console.log('Review complete!', annotations.length, 'issues found')
    }
  })

  // In your message handler
  const handleSendMessage = async (message: string) => {
    // Check if this is a document review request
    if (isReviewRequest(message)) {
      const result = await processMessage(message)

      if (result.handled) {
        // Show the AI's reply in the chat
        addMessageToChat({
          role: 'assistant',
          content: result.chatReply
        })
        return
      }
    }

    // Otherwise, send to regular chat handler
    sendToEveryAI(message)
  }

  return (
    <Chat
      onSendMessage={handleSendMessage}
      // Show review indicator when reviewing
      isProcessing={isReviewing}
    />
  )
}
```

#### Natural Language Examples

The system understands various ways to request reviews:

| User Says                       | Detected Review Type |
| ------------------------------- | -------------------- |
| "Review this document"          | `all`                |
| "Check the grammar"             | `grammar`            |
| "Proofread this article"        | `grammar`            |
| "Check for compliance issues"   | `compliance`         |
| "Review for legal risks"        | `legal`              |
| "Is this information accurate?" | `factual`            |
| "Check the writing style"       | `style`              |
| "Make sure this is accessible"  | `accessibility`      |
| "Check brand voice"             | `brand`              |
| "Any security concerns?"        | `security`           |

#### Chat Response Format

When a review completes, the chat will display a summary like:

```
📝 I've finished reviewing "Employee Onboarding Guide". Here's what I found:

🔴 **2 critical issues** - these should be addressed immediately
🟡 **5 warnings** - recommended fixes
🔵 **3 suggestions** - optional improvements

Found outdated policy references and some grammar issues.

📊 Overall score: **78/100**

I've highlighted all the issues in the document. Click on any highlight to see details and suggested fixes.
```

## Review Types

| Type            | Description                      | Use Case              |
| --------------- | -------------------------------- | --------------------- |
| `grammar`       | Spelling, grammar, punctuation   | Quick content polish  |
| `compliance`    | Policy and regulatory compliance | Audits, policies      |
| `legal`         | Legal language and risks         | Contracts, agreements |
| `factual`       | Accuracy and outdated info       | Knowledge articles    |
| `style`         | Tone, clarity, readability       | All content           |
| `accessibility` | Accessibility best practices     | Public content        |
| `brand`         | Brand voice and terminology      | Marketing content     |
| `security`      | Sensitive data, PII              | All documents         |
| `all`           | Comprehensive review             | Thorough review       |

## Preset Configurations

```typescript
import { REVIEW_PRESETS } from '@/business-apps/ai/apps/document-reviewer'

// Quick grammar check
await reviewDocument({
  documentId,
  contentType: 'knowledge_article',
  config: REVIEW_PRESETS.quickGrammar
})

// Legal contract review
await reviewDocument({
  documentId,
  contentType: 'contract',
  config: REVIEW_PRESETS.legalContract
})

// Full knowledge article review
await reviewDocument({
  documentId,
  contentType: 'knowledge_article',
  config: REVIEW_PRESETS.knowledgeArticle
})
```

## Troubleshooting

### "Agent not found" Error

1. Ensure the agent is registered in Prompt Manager with name `document_reviewer`
2. Check the workspace ID matches your environment
3. Verify the `document_observer` tool is attached to the agent

### No Annotations Returned

1. Check that document content is being fetched correctly
2. Verify the document ID exists and is accessible
3. Check the review type is appropriate for the content

### Incorrect Character Offsets

1. Ensure the content passed to the overlay matches what was analyzed
2. HTML content may have different offsets than plain text
3. Consider stripping HTML before analysis for accurate offsets

## Testing

### Test in Task Expert Studio

1. Open the `document_reviewer` agent in Task Expert Studio
2. Click **Test**
3. Enter a test request:

```
Review this document for grammar issues.

Document Details:
- Document ID: test-doc-123
- Content Type: knowledge_article
- Review Type: grammar
```

4. Check the JSON response for properly formatted annotations

### Test Programmatically

```typescript
import { useDocumentReview } from '@/business-apps/ai/apps/document-reviewer'

// In your test component
const { quickReview } = useDocumentReview({ accessToken })

const testReview = async () => {
  const response = await quickReview('test-document-id', 'knowledge_article', 'grammar')
  console.log('Review results:', response)
  console.log('Annotations:', response.annotations)
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend                                   │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐│
│  │ useDocumentReview │───▶│ DocumentAnnotationOverlay          ││
│  │      Hook        │    │ - Renders highlights                ││
│  └────────┬─────────┘    │ - Shows annotation cards            ││
│           │              │ - Navigation & filtering            ││
│           │              └─────────────────────────────────────┘│
├───────────┼─────────────────────────────────────────────────────┤
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │               Prompt Manager                                ││
│  │  ┌────────────────────┐    ┌─────────────────────────────┐ ││
│  │  │ document_reviewer  │───▶│ document_observer (tool)    │ ││
│  │  │     (agent)        │    │ - Fetches document content  │ ││
│  │  └────────────────────┘    │ - Prepares for analysis     │ ││
│  │           │                └─────────────────────────────┘ ││
│  │           ▼                                                 ││
│  │  ┌────────────────────┐                                    ││
│  │  │    GPT-4 / LLM     │                                    ││
│  │  │  Analyzes content  │                                    ││
│  │  │  Generates JSON    │                                    ││
│  │  └────────────────────┘                                    ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Register the tool and agent** in Prompt Manager
2. **Test** using Task Expert Studio
3. **Integrate** into your document views
4. **Customize** review presets for your content types
5. **Add** chat sidebar integration for conversational reviews
