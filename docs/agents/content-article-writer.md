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
- **contentTypeRef**: Optional catalog entry ID for content type (searched based on group, singular)
- **contentCategoryRefs**: Optional array of catalog entry IDs for content categories (searched in catalogs)
- **contentCategoryNames**: Optional array of category names (suggested when no matching categories found or provided in input)
- **contentTagRefs**: Optional array of catalog entry IDs for content tags (searched in catalogs)
- **contentTagNames**: Optional array of tag names (suggested when no matching tags found or provided in input)

## System Prompt

````text
You are a professional content creation and editing assistant specialized in generating and refining content entries.

Your task is to help users create and improve content entries with the following structure:
- title: A compelling, concise title (maximum 80 characters)
- preview: A brief summary or teaser text (maximum 180 characters)
- content: A full article with proper HTML formatting (you may use any valid HTML tags)
- picture: A URL to an image (jpg, png, or web image format). **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent, guess, or suggest image URLs without calling ImageFinder first.
- contentTypeRef: Catalog entry ID for content type (searched based on the provided group, singular)
- contentCategoryRefs: Array of catalog entry IDs for content categories (searched in catalogs)
- contentCategoryNames: Array of category names (suggested when no matching categories found or provided in input - consumer will create new entries)
- contentTagRefs: Array of catalog entry IDs for content tags (searched in catalogs)
- contentTagNames: Array of tag names (suggested when no matching tags found or provided in input - consumer will create new entries)

Available Operations:

1. GENERATE: Create a new content entry from scratch based on a user's prompt
   - Generate an engaging title (max 80 chars)
   - Create a preview that entices readers (max 180 chars)
   - Write a complete, well-structured article with HTML formatting (any valid HTML tags are allowed)
   - **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent or suggest image URLs without using ImageFinder. Call ImageFinder with an appropriate search query based on the article content, then use the returned image URL in the picture field.
   - **CRITICAL**: For contentTypeRef, you MUST search the ContentType catalog from the Knowledge Base. The contentGroupRef provided in the user input is the parentEntryId of the content type entry you need to find. Look for catalog entries where the 'parentEntryId' field equals the contentGroupRef. Find ALL entries with parentEntryId = contentGroupRef, then select the most appropriate one. DO NOT invent or guess contentTypeRef values - you MUST find the actual catalog entry ID from the Knowledge Base.
   - Search for appropriate content categories in catalogs (return as contentCategoryRefs array)
   - If no matching categories found or names provided in input, suggest category names (return as contentCategoryNames array)
   - Search for appropriate content tags in catalogs (return as contentTagRefs array)
   - If no matching tags found or names provided in input, suggest tag names (return as contentTagNames array)

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
- **MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent, guess, or suggest image URLs without calling ImageFinder first. Always call ImageFinder with a relevant search query based on the article topic, then use the returned image URL.

Catalog Integration (from Knowledge Base):
**CRITICAL INSTRUCTIONS FOR CATALOG USAGE:**

You have access to catalog data through the Knowledge Base section provided below. The catalogs are loaded as structured data with entries containing: { id, code, value, description, type, ParentEntryId, ... }

**MANDATORY RULES:**

1. **Content Type (contentTypeRef) - STRICT REQUIREMENTS:**
   - The contentGroupRef provided in the user input is the parentEntryId of the content type entry you MUST find.
   - You MUST search the ContentType catalog in the Knowledge Base for entries where:
     * The 'parentEntryId' field equals the contentGroupRef
   - Find ALL entries that have parentEntryId = contentGroupRef, then select the most appropriate one based on the content context.
   - DO NOT invent, guess, or hallucinate contentTypeRef values.
   - DO NOT use generic IDs or placeholder values.
   - You MUST find the actual catalog entry ID from the Knowledge Base.
   - If you cannot find a matching entry in the Knowledge Base, return null.
   - Content type does not have a names field - it is static and must come from the catalog.

2. **Content Categories (contentCategoryRefs/contentCategoryNames):**
   - Search the ContentCategory catalog in the Knowledge Base.
   - Match entries by their 'value', 'code', or 'description' fields that relate to the content theme.
   - If matching categories are found, return their 'id' values as contentCategoryRefs array.
   - If no suitable categories are found OR names are provided in the input, suggest meaningful category names as contentCategoryNames array.
   - NEVER return both refs and names for the same field.

3. **Content Tags (contentTagRefs/contentTagNames):**
   - Search the ContentTag catalog in the Knowledge Base.
   - Match entries by their 'value', 'code', or 'description' fields that relate to the content topics.
   - If matching tags are found, return their 'id' values as contentTagRefs array.
   - If no suitable tags are found OR names are provided in the input, suggest meaningful tag names as contentTagNames array.
   - NEVER return both refs and names for the same field.

4. **Catalog Entry Structure:**
   - Catalog entries have: { id, code, value, description, type, parentEntryId, ... }
   - Use the 'id' field for all refs (contentTypeRef, contentCategoryRefs, contentTagRefs).
   - Search by 'value', 'code', 'description', or 'parentEntryId' fields to find matches.

5. **Validation:**
   - Before returning any ref, verify it exists in the Knowledge Base catalog data.
   - If you cannot verify a ref exists, use names instead (for categories/tags) or null (for content type).

Field Update Behavior:
- When refining, you may update specific fields (title, preview, content, picture, contentTypeRef, contentCategoryRefs, contentCategoryNames, contentTagRefs, contentTagNames) or all fields
- If a field is marked for update, ensure it aligns with the refinement instruction
- If a field is not marked for update, preserve the existing value exactly
- Always maintain coherence between title, preview, and content
- If names are provided in the input (contentCategoryNames, contentTagNames), you can use them or suggest better alternatives based on the content

ImageFinder Tool Usage:
**MANDATORY**: You MUST use the ImageFinder tool to find images. NEVER invent, guess, or suggest image URLs without calling ImageFinder first.

**Tool Name**: ImageFinder

**Input Schema**:
```json
{
  "type": "object",
  "required": ["query"],
  "properties": {
    "page": {
      "type": "integer",
      "default": 1,
      "minimum": 1,
      "description": "Page number for pagination (default: 1)"
    },
    "query": {
      "type": "string",
      "maxLength": 100,
      "minLength": 1,
      "description": "Search query for images (e.g., 'nature', 'business', 'technology')"
    },
    "orderBy": {
      "enum": ["latest", "oldest", "popular", "views", "downloads"],
      "type": "string",
      "default": "popular",
      "description": "Sort order for results (default: 'popular')"
    },
    "perPage": {
      "type": "integer",
      "default": 10,
      "maximum": 30,
      "minimum": 1,
      "description": "Number of results per page (default: 10, max: 30)"
    },
    "orientation": {
      "enum": ["landscape", "portrait", "squarish"],
      "type": "string",
      "description": "Image orientation filter (optional)"
    }
  }
}
````

**Output Schema**:

```json
{
  "type": "object",
  "required": ["success", "images"],
  "properties": {
    "error": {
      "type": "string",
      "description": "Error message if search failed"
    },
    "total": {
      "type": "integer",
      "description": "Total number of results available"
    },
    "images": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "url", "thumbnailUrl", "width", "height"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique image ID"
          },
          "url": {
            "type": "string",
            "format": "uri",
            "description": "Direct URL to the full-size image"
          },
          "width": {
            "type": "integer",
            "description": "Image width in pixels"
          },
          "author": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "username": {
                "type": "string"
              },
              "profileUrl": {
                "type": "string",
                "format": "uri"
              }
            }
          },
          "height": {
            "type": "integer",
            "description": "Image height in pixels"
          },
          "license": {
            "type": "string",
            "description": "License information (Unsplash License - free for commercial use)"
          },
          "description": {
            "type": "string",
            "description": "Image description"
          },
          "downloadUrl": {
            "type": "string",
            "format": "uri",
            "description": "Direct download URL"
          },
          "thumbnailUrl": {
            "type": "string",
            "format": "uri",
            "description": "URL to thumbnail/small version"
          }
        }
      }
    },
    "success": {
      "type": "boolean",
      "description": "Whether the search was successful"
    },
    "totalPages": {
      "type": "integer",
      "description": "Total number of pages"
    }
  }
}
```

**Usage Steps**:

1. Analyze the article content and determine appropriate image search terms
2. Call ImageFinder with a relevant search query (e.g., "business meeting", "remote work", "technology")
3. Review the returned images array and select the most appropriate one
4. Use the selected image's 'url' field in the picture field of your response
5. NEVER invent, guess, or suggest image URLs without calling ImageFinder first
6. If ImageFinder returns no results (success: false or empty images array), set picture to null

Response Format:
Always respond with valid JSON matching the specified output schema.

````

## User Prompt Template

```text
Operation: {operation}

User Request: {userPrompt}

Group: {contentGroupRef}

Existing Content:

{ "contentEntry": {
  "title": "{title}",
  "preview": "{preview}",
  "content": "{content}",
  "picture": "{picture}",
  "contentTypeRef": "{contentTypeRef}",
  "contentCategoryRefs": "{contentCategoryRefs}",
  "contentCategoryNames": "{contentCategoryNames}",
  "contentTagRefs": "{contentTagRefs}",
  "contentTagNames": "{contentTagNames}"
}
}
````

**Note:** Catalogs are automatically loaded as Knowledge Sources and will be available in the `[KNOWLEDGE BASE]` section of the system prompt. You do not need to reference them explicitly in the user prompt.

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
    "contentTypeRef": {
      "type": ["string", "null"],
      "description": "Catalog entry ID for content type (searched based on group). Optional field."
    },
    "contentCategoryRefs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of catalog entry IDs for content categories (when matching categories found). Optional field."
    },
    "contentCategoryNames": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of category names (suggested when no matching categories found or provided in input - consumer will create new entries). Optional field."
    },
    "contentTagRefs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of catalog entry IDs for content tags (when matching tags found). Optional field."
    },
    "contentTagNames": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of tag names (suggested when no matching tags found - consumer will create new entries). Optional field."
    }
  }
}
```

**Note:** Catalogs are automatically loaded as Knowledge Sources and will be available in the `[KNOWLEDGE BASE]` section of the system prompt. You do not need to reference them explicitly in the user prompt.

## Registration Details

### Prompt Manager Configuration

```typescript
{
  name: 'ContentArticleWriter',
  description: 'AI agent for generating and refining content entries',
  type: 'completion',
  workspaceId: 'your-workspace-id',
  modelId: 'gpt-4o',
  userContent: CONTENT_ENTRY_AI_AGENT_USER_PROMPT,
  systemContent: CONTENT_ENTRY_AI_AGENT_SYSTEM_PROMPT,
  tools: [],
  responseSchema: CONTENT_ENTRY_OUTPUT_SCHEMA,
  modelSettings: {
    response_format: {
      type: 'json_object'
    }
  }
}
```

**Important:** `modelSettings.response_format` is required when `responseSchema` is set.

## Service Implementation

### TypeScript Interfaces

```typescript
export interface ContentEntryInput {
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  contentTypeRef?: string | null
  contentCategoryRefs?: string[]
  contentCategoryNames?: string[]
  contentTagRefs?: string[]
  contentTagNames?: string[]
}

export interface ContentEntryOutput {
  title: string
  preview: string
  content: string
  picture?: string | null
  contentTypeRef?: string | null
  contentCategoryRefs?: string[]
  contentCategoryNames?: string[]
  contentTagRefs?: string[]
  contentTagNames?: string[]
}
```

### Service Class

```typescript
import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export class ContentEntryAIService {
  private accessToken: string
  private readonly PROMPT_ID = 'ContentArticleWriter'

  constructor(accessToken: string) {
    this.accessToken = accessToken
    promptManagerClient.setAccessToken(accessToken)
  }

  async executeContentEntryOperation(
    operation: 'generate' | 'refine',
    userPrompt: string,
    userId: string,
    contentGroupRef: string,
    existingContent?: ContentEntryInput
  ): Promise<ContentEntryOutput> {
    // Build user prompt
    const userPromptText = CONTENT_ENTRY_AI_AGENT_USER_PROMPT.replace('{operation}', operation)
      .replace('{userPrompt}', userPrompt)
      .replace('{contentGroupRef}', contentGroupRef)
      .replace('{title}', existingContent?.title || '')
      .replace('{preview}', existingContent?.preview || '')
      .replace('{content}', existingContent?.content || '')
      .replace('{picture}', existingContent?.picture || 'null')
      .replace('{contentTypeRef}', existingContent?.contentTypeRef || 'null')
      .replace('{contentCategoryRefs}', JSON.stringify(existingContent?.contentCategoryRefs || []))
      .replace('{contentCategoryNames}', JSON.stringify(existingContent?.contentCategoryNames || []))
      .replace('{contentTagRefs}', JSON.stringify(existingContent?.contentTagRefs || []))
      .replace('{contentTagNames}', JSON.stringify(existingContent?.contentTagNames || []))

    const formData = new FormData()
    formData.append('system_params', JSON.stringify({}))
    formData.append('user_params', JSON.stringify({ prompt: userPromptText }))

    const response = await promptManagerClient.executePromptById(this.PROMPT_ID, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as ContentEntryOutput
  }
}
```

## Usage Examples

### Example 1: Generate New Article

```typescript
const service = new ContentEntryAIService(accessToken)
const result = await service.executeContentEntryOperation(
  'generate',
  'Write an article about remote work benefits',
  userId,
  'blog-posts' // contentGroupRef for content type lookup
)

// Result (when categories/tags found):
// {
//   title: "Remote Work: Benefits for Employees and Companies",
//   preview: "Discover how remote work improves work-life balance...",
//   content: "<h1>Remote Work: Benefits...</h1><p>...</p>",
//   picture: "https://example.com/remote-work.jpg",
//   contentTypeRef: "catalog-entry-id-1",
//   contentCategoryRefs: ["catalog-entry-id-2", "catalog-entry-id-3"],
//   contentTagRefs: ["catalog-entry-id-4", "catalog-entry-id-5"]
// }

// Result (when categories/tags NOT found):
// {
//   title: "Remote Work: Benefits for Employees and Companies",
//   preview: "Discover how remote work improves work-life balance...",
//   content: "<h1>Remote Work: Benefits...</h1><p>...</p>",
//   picture: "https://example.com/remote-work.jpg",
//   contentTypeRef: "catalog-entry-id-1",
//   contentCategoryNames: ["Work-Life Balance", "Remote Work"],
//   contentTagNames: ["productivity", "flexibility", "work-from-home"]
// }
```

### Example 2: Refine - Fix Spelling & Grammar

```typescript
const result = await service.executeContentEntryOperation(
  'refine',
  'Fix all spelling and grammar errors',
  userId,
  'blog-posts', // contentGroupRef
  {
    title: 'Artifical Inteligence in Healthcare',
    preview: 'AI is revolutinizing the healtcare industrie...',
    content: '<h1>Artifical Inteligence</h1><p>AI is revolutinizing...</p>',
    picture: null,
    contentTypeRef: 'existing-type-id',
    contentCategoryRefs: ['existing-category-id'],
    contentTagRefs: ['existing-tag-id']
  }
)
```

### Example 3: Refine - Shorten

```typescript
const result = await service.executeContentEntryOperation(
  'refine',
  'Shorten the title, preview, and content while keeping key information',
  userId,
  'blog-posts', // contentGroupRef
  {
    title: 'Very long title that needs to be shortened...',
    preview: 'Long preview text...',
    content: '<h1>Long content...</h1><p>...</p>',
    contentTypeRef: 'existing-type-id'
  }
)
```

### Example 4: Refine - Change Tone

```typescript
const result = await service.executeContentEntryOperation(
  'refine',
  'Change the tone to professional',
  userId,
  'blog-posts', // contentGroupRef
  {
    title: 'Hey! Check out this cool AI stuff!',
    preview: 'So, AI is like super awesome and stuff, you know?',
    content: '<h1>AI is Cool!</h1><p>So like, AI is really changing things up...</p>',
    contentTypeRef: 'existing-type-id'
  }
)
```

### Example 5: Refine - Custom Prompt

```typescript
const result = await service.executeContentEntryOperation(
  'refine',
  'Make the title more engaging and add a call-to-action at the end of the content',
  userId,
  'blog-posts', // contentGroupRef
  {
    title: 'Remote Work',
    preview: 'Remote work is becoming popular',
    content: '<h1>Remote Work</h1><p>Remote work has many benefits...</p>',
    contentTypeRef: 'existing-type-id'
  }
)
```

### Example 6: Refine - With Names in Input

```typescript
const result = await service.executeContentEntryOperation(
  'refine',
  'Improve the categories and tags based on the content',
  userId,
  'blog-posts', // contentGroupRef
  {
    title: 'Remote Work Benefits',
    preview: 'Discover the advantages of remote work...',
    content: '<h1>Remote Work Benefits</h1><p>...</p>',
    contentTypeRef: 'existing-type-id',
    contentCategoryNames: ['Work-Life Balance', 'Remote Work'], // Names provided in input
    contentTagNames: ['productivity', 'flexibility'] // Names provided in input
  }
)
// The AI will use these names or suggest better alternatives based on catalog search
```

## Input Parameters

### Operation Types

- **generate**: Create a new content entry from scratch
  - No `existingContent` required
  - `userPrompt` describes what to create
  - `contentGroupRef` is required for content type lookup

- **refine**: Improve an existing content entry
  - `existingContent` required with fields to refine
  - `userPrompt` describes how to refine (e.g., "fix grammar", "shorten", "change tone to professional")
  - `contentGroupRef` is required for content type validation

### User Prompt Examples

**For Generate:**

- "Write an article about artificial intelligence in healthcare"
- "Create a blog post about sustainable energy solutions for small businesses"
- "Generate an article about remote work benefits with practical tips"

**For Refine:**

- "Fix all spelling and grammar errors"
- "Shorten the title, preview, and content while keeping key information"
- "Change the tone to professional"
- "Make the title more engaging and add a call-to-action at the end"
- "Improve the content structure and add more details about technical implementation"

## Response Format

```typescript
{
  "title": "string (max 80 chars)",
  "preview": "string (max 180 chars)",
  "content": "string (HTML formatted)",
  "picture": "string | null (optional)",
  "contentTypeRef": "string | null (catalog entry ID, optional, singular)",
  "contentCategoryRefs": ["string"] | null (array of catalog entry IDs, optional - when categories found),
  "contentCategoryNames": ["string"] | null (array of category names, optional - when categories NOT found or provided in input),
  "contentTagRefs": ["string"] | null (array of catalog entry IDs, optional - when tags found),
  "contentTagNames": ["string"] | null (array of tag names, optional - when tags NOT found or provided in input)
}
```

**Important:**

- Either `contentCategoryRefs` OR `contentCategoryNames` will be present (never both)
- Either `contentTagRefs` OR `contentTagNames` will be present (never both)
- `contentTypeRef` is singular (no plural form, no names field)
- If refs are provided, use them directly
- If names are provided, the consumer must create new catalog entries with those names
- Names can be provided in the input (existingContent) and will be used or improved by the AI

## Important Notes

- **Agent name:** `ContentArticleWriter` (must match exactly in Prompt Manager)
- `response_format` in `modelSettings` is required when `responseSchema` is set
- **ImageFinder tool MUST be configured** in the Task Expert tools array
- **Catalogs must be configured as Knowledge Sources** in Task Expert Editor before use
- Required Knowledge Sources:
  - ContentType catalog (identifier: "ContentType", version: "v1")
  - ContentCategory catalog (identifier: "ContentCategory", version: "v1")
  - ContentTag catalog (identifier: "ContentTag", version: "v1")
- `contentGroupRef` parameter is required for content type lookup
- `picture`, `contentTypeRef`, `contentCategoryRefs`, `contentCategoryNames`, `contentTagRefs`, and `contentTagNames` are optional fields
- `contentTypeRef` is singular (no plural, no names field)
- `contentCategoryRefs` and `contentTagRefs` are plural (arrays)
- Either refs OR names will be returned for categories/tags (never both)
- Names can be provided in the input (existingContent) and will be used or improved by the AI
- If `contentCategoryNames` or `contentTagNames` are returned, the consumer must create new catalog entries
- Catalog data is automatically available in the `[KNOWLEDGE BASE]` section of the system prompt
- All HTML tags are allowed in content
- For `generate`, don't pass `existingContent`
- For `refine`, always pass `existingContent` with fields to update
- Title and preview have character limits (80 and 180 respectively)

## Error Handling

```typescript
try {
  const result = await service.executeContentEntryOperation(...)
  // Use result
} catch (error) {
  console.error('Content Entry AI Error:', error)
  // Handle error - check if it's a parsing error, API error, etc.
}
```

## Catalog Integration Details

### Knowledge Sources Configuration

**Important:** Catalogs must be configured as Knowledge Sources in the Task Expert Editor before they can be used.

1. **Add Catalog Knowledge Sources:**
   - In Task Expert Editor, go to Knowledge Sources panel
   - Add catalogs with type `catalog`:
     - **ContentType Catalog**: `catalogIdentifier: "ContentType"`, `catalogVersion: "v1"`
     - **ContentCategory Catalog**: `catalogIdentifier: "ContentCategory"`, `catalogVersion: "v1"`
     - **ContentTag Catalog**: `catalogIdentifier: "ContentTag"`, `catalogVersion: "v1"`

2. **Automatic Loading:**
   - Catalogs are automatically loaded by the backend when the prompt is executed
   - Catalog data is injected into the System Prompt under `[KNOWLEDGE BASE]` section
   - The AI agent can access all catalog entries from this section

3. **Catalog Structure in Knowledge Base:**
   - Catalog entries are provided with structure: `{ id, code, value, description, type, parentEntryId, ... }`
   - Use the `id` field for refs (contentTypeRef, contentCategoryRefs, contentTagRefs)
   - Search by `value`, `code`, `description`, or `parentEntryId` fields to find matching entries
   - **IMPORTANT**: The `contentGroupRef` from user input is the `parentEntryId` - search for entries where `parentEntryId = contentGroupRef` to find all matching content type entries, then select the most appropriate one

### Content Type (contentTypeRef)

**CRITICAL**: The `contentGroupRef` provided in the user input is the `parentEntryId` of the content type entry.

- **MUST** search the ContentType catalog in the Knowledge Base
- **MUST** find entries where:
  - The `parentEntryId` field equals the `contentGroupRef`
- Find ALL entries that have `parentEntryId = contentGroupRef`, then select the most appropriate one based on the content context
- **DO NOT** invent, guess, or hallucinate contentTypeRef values
- **DO NOT** use generic IDs or placeholder values
- **MUST** return the actual catalog entry `id` from the Knowledge Base
- If no match is found in the Knowledge Base, returns `null`
- Content type does not have a names field - it is static and must come from the catalog
- **Catalog Source**: ContentType catalog (must be added as Knowledge Source)

### Content Categories

- **When found**: Returns array of catalog entry IDs as `contentCategoryRefs` (plural)
- **When NOT found or names provided in input**: Returns array of suggested category names as `contentCategoryNames`
- Consumer must create new catalog entries when `contentCategoryNames` is provided
- Never returns both `contentCategoryRefs` and `contentCategoryNames` at the same time
- Names can be provided in the input (existingContent) and will be used or improved by the AI
- **Catalog Source**: ContentCategory catalog (must be added as Knowledge Source)

### Content Tags

- **When found**: Returns array of catalog entry IDs as `contentTagRefs` (plural)
- **When NOT found or names provided in input**: Returns array of suggested tag names as `contentTagNames`
- Consumer must create new catalog entries when `contentTagNames` is provided
- Never returns both `contentTagRefs` and `contentTagNames` at the same time
- Names can be provided in the input (existingContent) and will be used or improved by the AI
- **Catalog Source**: ContentTag catalog (must be added as Knowledge Source)

### Content Group ID Parameter

- Required for content type lookup
- Determines which catalog group/type to search for content types
- Examples: "blog-posts", "news-articles", "product-docs", etc.
- Must be passed in every request to ensure correct type matching
- Used to filter content type catalog entries by their `type` field

## Setup Instructions

### 1. Configure Knowledge Sources

Before using the ContentArticleWriter agent, you must add the required catalogs as Knowledge Sources:

1. Open Task Expert Studio
2. Edit the ContentArticleWriter Task Expert
3. Navigate to Knowledge Sources panel
4. Add the following catalogs:

   **ContentType Catalog:**
   - Type: Catalog
   - Catalog Identifier: `ContentType`
   - Catalog Version: `v1`
   - Name: `Content Types`
   - Description: `Catalog of available content types`

   **ContentCategory Catalog:**
   - Type: Catalog
   - Catalog Identifier: `ContentCategory`
   - Catalog Version: `v1`
   - Name: `Content Categories`
   - Description: `Catalog of content categories`

   **ContentTag Catalog:**
   - Type: Catalog
   - Catalog Identifier: `ContentTag`
   - Catalog Version: `v1`
   - Name: `Content Tags`
   - Description: `Catalog of content tags`

5. Save the Task Expert

### 2. Catalog Data Access

- Catalogs are automatically loaded when the prompt is executed
- Catalog entries are injected into the System Prompt under `[KNOWLEDGE BASE]`
- The AI agent can search and reference catalog entries from this section
- Catalog entries have the structure: `{ id, code, value, description, type, ... }`

## Integration with Other Functions

This agent can be combined with:

- **searchFreeImages** function: To automatically find images for generated articles
- **Catalog Service**: Direct integration for type, category, and tag management

Example workflow:

1. Configure catalogs as Knowledge Sources in Task Expert Editor
2. Generate article content using ContentArticleWriter
3. If `contentCategoryNames` or `contentTagNames` are returned, create new catalog entries
4. Use the returned refs or newly created refs to associate with the content entry
