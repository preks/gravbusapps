# ContentArticleWriter - AI Agent Documentation

## Overview

**Agent Name:** `ContentArticleWriter`  
**Type:** General (Task Expert)  
**Description:** AI agent for generating and refining content entries with title, preview, content, and optional picture

## Agent Structure

Content entries consist of:

- **title**: A compelling, concise title (maximum 80 characters)
- **preview**: A brief summary or teaser text (maximum 180 characters)
- **content**: A full article with proper HTML formatting (all HTML tags are allowed)
- **picture**: Optional URL to an image (jpg, png, or web image format) or null
- **contentTypeId**: Optional UUID of the selected content type
- **contentCategoryIds**: Optional array of UUIDs for selected content categories
- **contentTagIds**: Optional array of UUIDs for selected content tags

## System Prompt

```text
You are a professional content creation and editing assistant specialized in generating and refining content entries.

Your task is to help users create and improve content entries with the following structure:
- title: A compelling, concise title (maximum 80 characters)
- preview: A brief summary or teaser text (maximum 180 characters)
- content: A full article with proper HTML formatting (you may use any valid HTML tags)
- picture: A URL to an image (jpg, png, or web image format). **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent, guess, or suggest image URLs without calling ImageFinder first.
- contentTypeId: UUID of the content type (selected from provided options)
- contentCategoryIds: Array of UUIDs for content categories (selected from provided options)
- contentTagIds: Array of UUIDs for content tags (selected from provided options)

Available Operations:

1. GENERATE: Create a new content entry from scratch based on a user's prompt
   - Generate an engaging title (max 80 chars)
   - Create a preview that entices readers (max 180 chars)
   - Write a complete, well-structured article with HTML formatting (any valid HTML tags are allowed)
   - **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent or suggest image URLs without using ImageFinder.
   - For contentTypeId select the best matching UUID from the provided type options.
   - For contentCategoryIds and contentTagIds select the best matching UUIDs from the provided options.

2. REFINE: Improve an existing content entry with various refinement options:
   a) IMPROVE: Modify content based on a specific user instruction
   b) SHORTEN: Condense the content while maintaining key information and message
   c) FIX_SPELLING_GRAMMAR: Correct spelling, grammar, and punctuation errors
   d) CHANGE_TONE: Adjust the writing style to match one of these tones:
      - Professional: Formal, business-oriented, authoritative
      - Empathetic: Understanding, compassionate, supportive
      - Casual: Conversational, friendly, relaxed
      - Neutral: Objective, balanced, factual
      - Educational: Informative, instructional, clear
      - Formal: Traditional, respectful, ceremonial
      - Creative: Imaginative, expressive, engaging
      - Technical: Precise, detailed, specialized

Content Guidelines:
- Titles should be clear, engaging, and accurately represent the content
- Previews should hook the reader and provide a glimpse of the article's value
- Content should be well-structured with appropriate HTML tags (any valid HTML tags are permitted)
- Maintain consistency in tone and style throughout the article
- Ensure all content is accurate, relevant, and appropriate
- **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent, guess, or suggest image URLs without calling ImageFinder first.

Field Update Behavior:
- When refining, you may update specific fields (title, preview, content, picture, contentTypeId, contentCategoryIds, contentTagIds) or all fields
- If a field is marked for update, ensure it aligns with the refinement instruction
- If a field is not marked for update, preserve the existing value exactly
- Always maintain coherence between title, preview, and content
```

## User Prompt Template

```text
Operation: {operation}

User Request: {userPrompt}

Group: {contentGroup}

Existing Content:

{ "contentEntry": {
  "title": "{title}",
  "preview": "{preview}",
  "content": "{content}",
  "picture": "{picture}",
  "contentTypeId": "{contentTypeId}",
  "contentCategoryIds": "{contentCategoryIds}",
  "contentTagIds": "{contentTagIds}"
}
}
```

## Response Schema

```json
{
  "type": "object",
  "required": ["title", "preview", "content"],
  "properties": {
    "title": {
      "type": "string",
      "maxLength": 80,
      "description": "Content entry title (max 80 characters)"
    },
    "preview": {
      "type": "string",
      "maxLength": 180,
      "description": "Content entry preview/teaser (max 180 characters)"
    },
    "content": {
      "type": "string",
      "description": "Full article content with HTML formatting"
    },
    "picture": {
      "type": ["string", "null"],
      "description": "URL to image (jpg, png, or web format) or null. Optional field."
    },
    "contentTypeId": {
      "type": ["string", "null"],
      "description": "UUID of the selected content type. Optional field."
    },
    "contentCategoryIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of UUIDs for selected content categories. Optional field."
    },
    "contentTagIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of UUIDs for selected content tags. Optional field."
    }
  }
}
```

## Service Implementation

### TypeScript Interfaces

```typescript
export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  contentGroup?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
  contentTypeId?: string
  contentCategoryIds?: string[]
  contentTagIds?: string[]
}
```

### Service Class

```typescript
export class ContentEntryAIService {
  constructor(
    private readonly promptManagerClient: PromptManagerClient,
    private readonly accessToken: string
  ) {}

  async executeContentEntryOperation(
    operation: 'generate' | 'refine',
    userPrompt: string,
    existingContent?: ContentEntryInput
  ): Promise<ContentEntryOutput> {
    const userParams = {
      operation,
      userPrompt,
      title: existingContent?.title || '',
      preview: existingContent?.preview || '',
      content: existingContent?.content || '',
      picture: existingContent?.picture || null,
      contentGroup: existingContent?.contentGroup,
      contentTypeId: existingContent?.contentTypeId,
      contentCategoryIds: existingContent?.contentCategoryIds,
      contentTagIds: existingContent?.contentTagIds
    }

    const response = await executeContentPromptByJson(promptManagerClient, 'ContentArticleWriter', {
      user_params: userParams
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    return JSON.parse(content) as ContentEntryOutput
  }
}
```

## Usage Examples

### Example 1: Generate New Article

```typescript
const service = new ContentEntryAIService(promptManagerClient, accessToken)
const result = await service.executeContentEntryOperation('generate', 'Write an article about remote work benefits', {
  contentGroup: 'NEWS_CONTENT_GROUP'
})

// Result:
// {
//   title: "Remote Work: Benefits for Employees and Companies",
//   preview: "Discover how remote work improves work-life balance...",
//   content: "<h1>Remote Work: Benefits...</h1><p>...</p>",
//   picture: "https://example.com/remote-work.jpg",
//   contentTypeId: "uuid-of-selected-type",
//   contentCategoryIds: ["uuid-1", "uuid-2"],
//   contentTagIds: ["uuid-3", "uuid-4"]
// }
```

### Example 2: Refine - Fix Spelling & Grammar

```typescript
const result = await service.executeContentEntryOperation('refine', 'Fix all spelling and grammar errors', {
  title: 'Artifical Inteligence in Healthcare',
  preview: 'AI is revolutinizing the healtcare industrie...',
  content: '<h1>Artifical Inteligence</h1><p>AI is revolutinizing...</p>',
  picture: null,
  contentTypeId: 'existing-type-uuid',
  contentCategoryIds: ['existing-category-uuid'],
  contentTagIds: ['existing-tag-uuid']
})
```

## Input Parameters

### Operation Types

- **generate**: Create a new content entry from scratch
  - `userPrompt` describes what to create
  - `contentGroup` used as context for type/category/tag selection

- **refine**: Improve an existing content entry
  - `existingContent` required with fields to refine
  - `userPrompt` describes how to refine (e.g., "fix grammar", "shorten", "change tone to professional")

## Response Format

```typescript
{
  "title": "string (max 80 chars)",
  "preview": "string (max 180 chars)",
  "content": "string (HTML formatted)",
  "picture": "string | null (optional)",
  "contentTypeId": "string | null (UUID, optional)",
  "contentCategoryIds": ["string"] (array of UUIDs, optional),
  "contentTagIds": ["string"] (array of UUIDs, optional)
}
```

## Important Notes

- **Agent name:** `ContentArticleWriter` (must match exactly in Prompt Manager)
- `response_format` in `modelSettings` is required when `responseSchema` is set
- **ImageFinder tool MUST be configured** in the Task Expert tools array
- `contentGroup` is the enum value (e.g. `NEWS_CONTENT_GROUP`) used as context
- `contentTypeId`, `contentCategoryIds`, and `contentTagIds` are UUIDs from the respective database tables
- All HTML tags are allowed in content
- For `generate`, `existingContent` is optional (pass group context only)
- For `refine`, always pass `existingContent` with fields to update
- Title and preview have character limits (80 and 180 respectively)

## Error Handling

```typescript
try {
  const result = await service.executeContentEntryOperation(...)
  // Use result
} catch (error) {
  console.error('Content Entry AI Error:', error)
}
```
