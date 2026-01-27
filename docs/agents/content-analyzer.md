# ContentArticleAnalyzer - AI Agent Documentation

## Overview

**Agent Name:** `ContentArticleAnalyzer`  
**Type:** General (Task Expert)  
**Description:** AI agent for analyzing content entries, their reactions, and descendant entries to provide summaries, engagement insights, and improvement recommendations

## Agent Structure

The ContentArticleAnalyzer analyzes:

- **contentEntry**: The main content entry to analyze, including its reaction counts (contentEntryReactionCounts)
- **descendants**: All descendant entries (comments, replies) of the content entry, each including their reaction counts (contentEntryReactionCounts)
- **userId**: The ID of the current user viewing the analysis

## System Prompt

```text
You are a professional content analysis assistant specialized in analyzing content entries, their engagement metrics, and providing actionable insights for content creators.

Your task is to analyze content entries with the following structure:
- contentEntry: The main content entry with title, preview, content, creatorEmployeeId, and other metadata, including contentEntryReactionCounts array with reaction counts
- descendants: Array of all descendant entries (child comments, replies) with their content, creatorEmployeeId, and contentEntryReactionCounts array with reaction counts
- userId: The ID of the current user requesting the analysis

Reactions are provided as aggregated counts in the contentEntryReactionCounts array for both the main content entry and each descendant entry. Each reaction count includes the contentReactionRef (catalog entry ID), count (number of reactions), and contentReaction (catalog entry details with id, value, code).

Available Operations:

1. ANALYSIS FOR NON-AUTHORS (userId != contentEntry.creatorEmployeeId):
   - Provide a comprehensive summary of the article
   - Analyze and summarize all reactions and descendants in a structured way
   - Provide engagement insights showing how the article is received by readers ("wie dieser Artikel bei den Lesern ankommt")
   - Structure the response with ratings and metrics suitable for frontend visualization

2. ANALYSIS FOR AUTHORS (userId == contentEntry.creatorEmployeeId):
   - DO NOT provide a summary of the article (author already knows the content)
   - Provide improvement tips based on reactions and engagement patterns
   - Suggest what to consider when writing next articles
   - Focus especially on how to write better content for company intranet context
   - Analyze and summarize all reactions and descendants in a structured way
   - Provide engagement insights with ratings and metrics

Analysis Guidelines:

**Reaction Analysis:**
- Analyze reaction types and their distribution (positive, negative, neutral)
- Identify patterns in reaction timing and frequency
- Calculate engagement metrics (total reactions, reaction diversity, engagement rate)
- Identify most common reaction types and their meanings
- Analyze reaction distribution across the content entry and its descendants

**Descendant Analysis:**
- Count total comments and replies
- Analyze comment sentiment and themes
- Identify most engaging discussion topics
- Calculate average comment length and depth
- Identify active discussion periods
- Analyze comment quality and engagement

**Engagement Insights:**
- Overall engagement score (0-100)
- Reaction sentiment score (positive/negative/neutral distribution)
- Comment engagement score (based on comment count, depth, and quality)
- Reader reception rating (how well the article is received)
- Key themes and topics that resonated with readers
- Areas that generated discussion or controversy

**Improvement Recommendations (for authors only):**
- Specific writing style improvements based on reaction patterns
- Content structure suggestions based on engagement data
- Topic areas that resonated well (to emphasize in future articles)
- Areas that need clarification or expansion (based on comments)
- Best practices for company intranet content based on engagement patterns
- Tone and style recommendations for better reader engagement
- Formatting and structure suggestions for improved readability

**Company Intranet Context:**
- Consider the professional, internal communication environment
- Focus on clarity, relevance, and actionable insights
- Emphasize internal company culture and communication norms
- Consider diverse audience within the organization
- Balance between informative and engaging content
- Respect for professional boundaries and appropriate tone

Response Format:
Always respond with valid JSON matching the specified output schema.

```

## User Prompt Template

```text
Analyze the following content entry and provide insights:

Content Entry:
{contentEntry}

Descendants (Comments and Replies):
{descendants}

Current User ID: {userId}
```

**Note:** Reaction catalog entries are automatically loaded as Knowledge Sources and will be available in the `[KNOWLEDGE BASE]` section of the system prompt. You can reference reaction types by their catalog entry data.

## Response Schema

```json
{
  "type": "object",
  "required": ["engagementAnalysis"],
  "properties": {
    "summary": {
      "type": "object",
      "required": ["text"],
      "properties": {
        "text": {
          "type": "string",
          "description": "Comprehensive summary of the article content (2-4 paragraphs). Only provided when userId != creatorEmployeeId."
        },
        "keyPoints": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Array of key points or takeaways from the article"
        }
      },
      "description": "Article summary. Only included when userId != creatorEmployeeId (non-author view)."
    },
    "improvementRecommendations": {
      "type": "object",
      "required": ["writingTips", "contentStructure", "futureConsiderations", "intranetBestPractices"],
      "properties": {
        "writingTips": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["tip", "reason", "priority"],
            "properties": {
              "tip": {
                "type": "string",
                "description": "Specific writing improvement tip"
              },
              "reason": {
                "type": "string",
                "description": "Reason for this tip based on engagement data"
              },
              "priority": {
                "type": "string",
                "enum": ["high", "medium", "low"],
                "description": "Priority level of this recommendation"
              }
            }
          },
          "description": "Specific writing style and content improvements"
        },
        "contentStructure": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Suggestions for improving content structure and organization"
        },
        "futureConsiderations": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["consideration", "rationale"],
            "properties": {
              "consideration": {
                "type": "string",
                "description": "What to consider when writing next articles"
              },
              "rationale": {
                "type": "string",
                "description": "Why this consideration matters based on current engagement"
              }
            }
          },
          "description": "Things to consider for future articles"
        },
        "intranetBestPractices": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["practice", "explanation"],
            "properties": {
              "practice": {
                "type": "string",
                "description": "Best practice for company intranet content"
              },
              "explanation": {
                "type": "string",
                "description": "Explanation of why this practice is important"
              }
            }
          },
          "description": "Best practices specifically for company intranet content writing"
        },
        "strengths": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "What worked well in this article (to replicate in future)"
        },
        "areasForImprovement": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Areas that need improvement based on reactions and comments"
        }
      },
      "description": "Improvement recommendations. Only included when userId == creatorEmployeeId (author view)."
    },
    "engagementAnalysis": {
      "type": "object",
      "required": ["overallScore", "reactionAnalysis", "commentAnalysis", "readerReception"],
      "properties": {
        "overallScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 100,
          "description": "Overall engagement score (0-100)"
        },
        "reactionAnalysis": {
          "type": "object",
          "required": ["totalReactions", "reactionBreakdown", "sentimentScore"],
          "properties": {
            "totalReactions": {
              "type": "number",
              "description": "Total number of reactions"
            },
            "reactionBreakdown": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["reactionType", "count", "percentage", "sentiment"],
                "properties": {
                  "reactionType": {
                    "type": "string",
                    "description": "Name of the reaction type (e.g., 'Like', 'Love', 'Insightful')"
                  },
                  "reactionCode": {
                    "type": "string",
                    "description": "Code of the reaction from catalog"
                  },
                  "count": {
                    "type": "number",
                    "description": "Number of this reaction type"
                  },
                  "percentage": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Percentage of total reactions"
                  },
                  "sentiment": {
                    "type": "string",
                    "enum": ["positive", "negative", "neutral"],
                    "description": "Sentiment classification of this reaction"
                  }
                }
              },
              "description": "Breakdown of reactions by type"
            },
            "sentimentScore": {
              "type": "object",
              "required": ["positive", "negative", "neutral"],
              "properties": {
                "positive": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100,
                  "description": "Percentage of positive reactions"
                },
                "negative": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100,
                  "description": "Percentage of negative reactions"
                },
                "neutral": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100,
                  "description": "Percentage of neutral reactions"
                }
              }
            },
            "engagementRate": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "Engagement rate based on reactions per view (estimated)"
            }
          }
        },
        "commentAnalysis": {
          "type": "object",
          "required": ["totalComments", "averageDepth", "commentScore"],
          "properties": {
            "totalComments": {
              "type": "number",
              "description": "Total number of comments and replies"
            },
            "averageDepth": {
              "type": "number",
              "description": "Average depth of comment threads"
            },
            "commentScore": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "Comment engagement score (0-100)"
            },
            "topThemes": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["theme", "mentionCount"],
                "properties": {
                  "theme": {
                    "type": "string",
                    "description": "Theme or topic mentioned in comments"
                  },
                  "mentionCount": {
                    "type": "number",
                    "description": "Number of times this theme appears"
                  }
                }
              },
              "description": "Top themes discussed in comments"
            },
            "sentimentDistribution": {
              "type": "object",
              "properties": {
                "positive": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100
                },
                "negative": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100
                },
                "neutral": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100
                }
              }
            }
          }
        },
        "readerReception": {
          "type": "object",
          "required": ["rating", "summary", "keyInsights"],
          "properties": {
            "rating": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "Overall reader reception rating (0-100)"
            },
            "summary": {
              "type": "string",
              "description": "Text summary of how the article is received by readers (in German: 'wie dieser Artikel bei den Lesern ankommt')"
            },
            "keyInsights": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Key insights about reader reception"
            },
            "resonatingTopics": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Topics that resonated well with readers"
            },
            "discussionPoints": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Points that generated discussion or debate"
            }
          }
        }
      }
    }
  }
}
```

**Note:** The response schema is unified and includes both `summary` and `improvementRecommendations` as optional fields:

- When `userId != creatorEmployeeId` (non-author): `summary` is provided, `improvementRecommendations` is not
- When `userId == creatorEmployeeId` (author): `improvementRecommendations` is provided, `summary` is not
- `engagementAnalysis` is always provided for both cases

## Registration Details

### Prompt Manager Configuration

```typescript
{
  name: 'ContentArticleAnalyzer',
  description: 'AI agent for analyzing content entries, reactions, and engagement metrics',
  type: 'completion',
  workspaceId: 'your-workspace-id',
  modelId: 'gpt-4o',
  userContent: CONTENT_ANALYZER_USER_PROMPT,
  systemContent: CONTENT_ANALYZER_SYSTEM_PROMPT,
  tools: [],
  responseSchema: CONTENT_ANALYZER_OUTPUT_SCHEMA,
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
export interface ContentArticleAnalyzerInput {
  contentEntry: {
    id: string
    title?: string | null
    preview?: string | null
    content?: string | null
    creatorEmployeeId?: string | null
    createdAt?: string
    contentType?: {
      value?: string
    } | null
    contentGroup?: {
      value?: string
    } | null
    contentEntryReactionCounts?: Array<{
      contentReactionRef: string
      count: number
      contentReaction?: {
        id: string
        value?: string
        code?: string
      } | null
    }>
  }
  descendants: Array<{
    id: string
    content?: string | null
    creatorEmployeeId?: string | null
    createdAt?: string
    parentContentEntryId?: string | null
    contentEntryReactionCounts?: Array<{
      contentReactionRef: string
      count: number
      contentReaction?: {
        id: string
        value?: string
        code?: string
      } | null
    }>
  }>
  userId: string
}

export interface ContentArticleAnalyzerOutput {
  // For non-authors
  summary?: {
    text: string
    keyPoints: string[]
  }
  // For authors
  improvementRecommendations?: {
    writingTips: Array<{
      tip: string
      reason: string
      priority: 'high' | 'medium' | 'low'
    }>
    contentStructure: string[]
    futureConsiderations: Array<{
      consideration: string
      rationale: string
    }>
    intranetBestPractices: Array<{
      practice: string
      explanation: string
    }>
    strengths?: string[]
    areasForImprovement?: string[]
  }
  // Always present
  engagementAnalysis: {
    overallScore: number
    reactionAnalysis: {
      totalReactions: number
      reactionBreakdown: Array<{
        reactionType: string
        reactionCode?: string
        count: number
        percentage: number
        sentiment: 'positive' | 'negative' | 'neutral'
      }>
      sentimentScore: {
        positive: number
        negative: number
        neutral: number
      }
      engagementRate?: number
    }
    commentAnalysis: {
      totalComments: number
      averageDepth: number
      commentScore: number
      topThemes?: Array<{
        theme: string
        mentionCount: number
      }>
      sentimentDistribution?: {
        positive: number
        negative: number
        neutral: number
      }
    }
    readerReception: {
      rating: number
      summary: string
      keyInsights: string[]
      resonatingTopics?: string[]
      discussionPoints?: string[]
    }
  }
}
```

### Service Class

```typescript
import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export class ContentArticleAnalyzerService {
  private accessToken: string
  private readonly PROMPT_ID = 'ContentArticleAnalyzer'

  constructor(accessToken: string) {
    this.accessToken = accessToken
    promptManagerClient.setAccessToken(accessToken)
  }

  async analyzeContent(input: ContentArticleAnalyzerInput): Promise<ContentArticleAnalyzerOutput> {
    // Build user prompt
    const userPromptText = CONTENT_ANALYZER_USER_PROMPT.replace('{contentEntry}', JSON.stringify(input.contentEntry))
      .replace('{descendants}', JSON.stringify(input.descendants))
      .replace('{userId}', input.userId)

    const formData = new FormData()
    formData.append('system_params', JSON.stringify({}))
    formData.append('user_params', JSON.stringify({ prompt: userPromptText }))

    const response = await promptManagerClient.executePromptById(this.PROMPT_ID, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as ContentArticleAnalyzerOutput
  }
}
```

## Usage Examples

### Example 1: Analysis for Non-Author

```typescript
const service = new ContentArticleAnalyzerService(accessToken)
const result = await service.analyzeContent({
  contentEntry: {
    id: 'entry-123',
    title: 'Remote Work Best Practices',
    preview: 'Discover effective strategies for remote work...',
    content: '<h1>Remote Work Best Practices</h1><p>...</p>',
    creatorEmployeeId: 'employee-456',
    createdAt: '2024-01-15T10:00:00Z',
    contentType: { value: 'Article' },
    contentGroup: { value: 'Blog Posts' },
    contentEntryReactionCounts: [
      {
        contentReactionRef: 'reaction-like-id',
        count: 30,
        contentReaction: {
          id: 'reaction-like-id',
          value: 'Like',
          code: 'LIKE'
        }
      },
      {
        contentReactionRef: 'reaction-love-id',
        count: 12,
        contentReaction: {
          id: 'reaction-love-id',
          value: 'Love',
          code: 'LOVE'
        }
      }
    ]
  },
  descendants: [
    {
      id: 'comment-1',
      content: 'Great article! Very helpful tips.',
      creatorEmployeeId: 'employee-789',
      createdAt: '2024-01-15T11:00:00Z',
      parentContentEntryId: 'entry-123',
      contentEntryReactionCounts: [
        {
          contentReactionRef: 'reaction-like-id',
          count: 5,
          contentReaction: {
            id: 'reaction-like-id',
            value: 'Like',
            code: 'LIKE'
          }
        }
      ]
    }
  ],
  userId: 'employee-999' // Different from creatorEmployeeId
})

// Result includes:
// - summary: { text: "...", keyPoints: [...] }
// - engagementAnalysis: { overallScore, reactionAnalysis, commentAnalysis, readerReception }
```

### Example 2: Analysis for Author

```typescript
const result = await service.analyzeContent({
  contentEntry: {
    id: 'entry-123',
    title: 'Remote Work Best Practices',
    preview: 'Discover effective strategies for remote work...',
    content: '<h1>Remote Work Best Practices</h1><p>...</p>',
    creatorEmployeeId: 'employee-456',
    createdAt: '2024-01-15T10:00:00Z',
    contentEntryReactionCounts: [
      {
        contentReactionRef: 'reaction-like-id',
        count: 30,
        contentReaction: {
          id: 'reaction-like-id',
          value: 'Like',
          code: 'LIKE'
        }
      }
    ]
  },
  descendants: [
    {
      id: 'comment-1',
      content: 'Great article!',
      creatorEmployeeId: 'employee-789',
      createdAt: '2024-01-15T11:00:00Z',
      parentContentEntryId: 'entry-123',
      contentEntryReactionCounts: []
    }
  ],
  userId: 'employee-456' // Same as creatorEmployeeId
})

// Result includes:
// - improvementRecommendations: { writingTips, contentStructure, futureConsiderations, intranetBestPractices, strengths, areasForImprovement }
// - engagementAnalysis: { overallScore, reactionAnalysis, commentAnalysis, readerReception }
// - NO summary (author already knows the content)
```

## Input Parameters

### Content Entry Structure

- **id**: Unique identifier of the content entry
- **title**: Article title
- **preview**: Preview/teaser text
- **content**: Full article content (HTML formatted)
- **creatorEmployeeId**: ID of the employee who created the content
- **createdAt**: Creation timestamp
- **contentType**: Optional content type catalog entry
- **contentGroup**: Optional content group catalog entry
- **contentEntryReactionCounts**: Optional array of reaction counts for this content entry
  - **contentReactionRef**: Catalog entry ID for the reaction type
  - **count**: Number of reactions of this type
  - **contentReaction**: Catalog entry object with reaction details (id, value, code)

### Descendants Structure

Array of descendant entries (comments, replies):

- **id**: Unique identifier
- **content**: Comment/reply content
- **creatorEmployeeId**: ID of the employee who created the comment
- **createdAt**: Creation timestamp
- **parentContentEntryId**: ID of the parent content entry
- **contentEntryReactionCounts**: Optional array of reaction counts for this descendant entry
  - **contentReactionRef**: Catalog entry ID for the reaction type
  - **count**: Number of reactions of this type
  - **contentReaction**: Catalog entry object with reaction details (id, value, code)

### User ID

- **userId**: ID of the current user requesting the analysis
  - If `userId == contentEntry.creatorEmployeeId`: Author view (improvement recommendations)
  - If `userId != contentEntry.creatorEmployeeId`: Reader view (summary included)

## Response Format

**Note:** The response uses a unified schema. The examples below show which fields are populated based on the user role.

### Non-Author Response (userId != creatorEmployeeId)

```typescript
{
  summary: {
    text: "Comprehensive summary of the article...",
    keyPoints: ["Key point 1", "Key point 2", ...]
  },
  engagementAnalysis: {
    overallScore: 85,
    reactionAnalysis: {
      totalReactions: 42,
      reactionBreakdown: [
        {
          reactionType: "Like",
          reactionCode: "LIKE",
          count: 30,
          percentage: 71.4,
          sentiment: "positive"
        },
        ...
      ],
      sentimentScore: {
        positive: 80,
        negative: 5,
        neutral: 15
      },
      engagementRate: 12.5
    },
    commentAnalysis: {
      totalComments: 15,
      averageDepth: 2.3,
      commentScore: 75,
      topThemes: [
        { theme: "Remote work tools", mentionCount: 8 },
        ...
      ],
      sentimentDistribution: {
        positive: 70,
        negative: 10,
        neutral: 20
      }
    },
    readerReception: {
      rating: 82,
      summary: "Der Artikel kommt bei den Lesern sehr gut an...",
      keyInsights: ["Insight 1", "Insight 2", ...],
      resonatingTopics: ["Topic 1", "Topic 2", ...],
      discussionPoints: ["Point 1", "Point 2", ...]
    }
  }
}
```

### Author Response (userId == creatorEmployeeId)

```typescript
{
  improvementRecommendations: {
    writingTips: [
      {
        tip: "Use more concrete examples in the introduction",
        reason: "Comments indicate readers wanted more specific examples early on",
        priority: "high"
      },
      ...
    ],
    contentStructure: [
      "Consider adding a summary section at the end",
      "Break up long paragraphs for better readability"
    ],
    futureConsiderations: [
      {
        consideration: "Focus on practical, actionable tips",
        rationale: "Reactions show high engagement with practical content"
      },
      ...
    ],
    intranetBestPractices: [
      {
        practice: "Keep paragraphs concise (3-4 sentences max)",
        explanation: "Internal readers prefer scannable content for quick consumption"
      },
      ...
    ],
    strengths: [
      "Clear structure and organization",
      "Relevant examples that resonate with employees"
    ],
    areasForImprovement: [
      "Introduction could be more engaging",
      "Consider adding visual elements"
    ]
  },
  engagementAnalysis: {
    // Same structure as non-author response
    ...
  }
}
```

## Important Notes

- **Agent name:** `ContentArticleAnalyzer` (must match exactly in Prompt Manager)
- `response_format` in `modelSettings` is required when `responseSchema` is set
- **Reaction catalog must be configured as Knowledge Source** in Task Expert Editor
- Required Knowledge Source:
  - ContentReaction catalog (identifier: "ContentReaction", version: "v1")
- **Unified response schema**: There is a single response schema that includes both `summary` and `improvementRecommendations` as optional fields:
  - When `userId != creatorEmployeeId` (non-author): `summary` is provided, `improvementRecommendations` is not
  - When `userId == creatorEmployeeId` (author): `improvementRecommendations` is provided, `summary` is not
  - `engagementAnalysis` is always provided for both cases
- All engagement metrics are calculated based on reactions and comments provided
- Sentiment analysis is performed on reactions and comments
- Reader reception summary should be in German when describing "wie dieser Artikel bei den Lesern ankommt"
- Improvement recommendations focus on company intranet context for authors

## Error Handling

```typescript
try {
  const result = await service.analyzeContent(input)
  // Use result
} catch (error) {
  console.error('Content Article Analyzer Error:', error)
  // Handle error - check if it's a parsing error, API error, etc.
}
```

## Catalog Integration Details

### Knowledge Sources Configuration

**Important:** Reaction catalog must be configured as Knowledge Source in the Task Expert Editor before it can be used.

1. **Add Catalog Knowledge Source:**
   - In Task Expert Editor, go to Knowledge Sources panel
   - Add catalog with type `catalog`:
     - **ContentReaction Catalog**: `catalogIdentifier: "ContentReaction"`, `catalogVersion: "v1"`

2. **Automatic Loading:**
   - Catalog is automatically loaded by the backend when the prompt is executed
   - Catalog data is injected into the System Prompt under `[KNOWLEDGE BASE]` section
   - The AI agent can access all reaction catalog entries from this section

3. **Reaction Catalog Structure:**
   - Reaction catalog entries have structure: `{ id, code, value, description, type, ... }`
   - Use the `value` or `code` field to identify reaction types
   - Map reactions to sentiment (positive/negative/neutral) based on catalog entry data
   - Common reaction types: Like, Love, Insightful, Helpful, Agree, Disagree, etc.

### Reaction Sentiment Mapping

The agent should map reaction types to sentiment categories:

- **Positive**: Like, Love, Insightful, Helpful, Agree, Celebrate, etc.
- **Negative**: Disagree, Dislike, Concern, etc.
- **Neutral**: Question, Clarify, etc.

This mapping should be based on the reaction catalog entries available in the Knowledge Base.

## Setup Instructions

### 1. Configure Knowledge Sources

Before using the ContentArticleAnalyzer agent, you must add the required catalog as Knowledge Source:

1. Open Task Expert Studio
2. Edit the ContentArticleAnalyzer Task Expert
3. Navigate to Knowledge Sources panel
4. Add the following catalog:

   **ContentReaction Catalog:**
   - Type: Catalog
   - Catalog Identifier: `ContentReaction`
   - Catalog Version: `v1`
   - Name: `Content Reactions`
   - Description: `Catalog of available content reaction types`

5. Save the Task Expert

### 2. Catalog Data Access

- Catalog is automatically loaded when the prompt is executed
- Reaction catalog entries are injected into the System Prompt under `[KNOWLEDGE BASE]`
- The AI agent can search and reference reaction types from this section
- Reaction catalog entries have the structure: `{ id, code, value, description, type, ... }`

## Integration with Content Entry System

This agent integrates with:

- **Content Entry Service**: To fetch content entries with their metadata
- **Reaction Service**: To fetch all reactions for content entries and descendants
- **Comment Service**: To fetch all descendant entries (comments and replies)
- **Catalog Service**: To understand reaction types and their meanings

Example workflow:

1. Fetch content entry with full details
2. Fetch all descendant entries (comments, replies)
3. Fetch all reactions for content entry and descendants
4. Call ContentArticleAnalyzer with all data
5. Display results based on user role (author vs. reader)
