/**
 * Document Reviewer Agent Definition
 *
 * This file contains the agent/prompt definition to be registered in Prompt Manager.
 * The agent uses the document_observer tool to analyze documents and provide
 * structured annotations that can be displayed as highlights and comments.
 *
 * Register via:
 * 1. Task Expert Studio UI
 * 2. Prompt Manager API
 * 3. Script (see setup documentation)
 */

import type { PromptDetails } from '@/common/network/ai/prompt-manager/PromptManagerClient'

/**
 * System prompt for the Document Reviewer agent
 *
 * This prompt instructs the AI on how to analyze documents and generate
 * structured annotations.
 */
export const DOCUMENT_REVIEWER_SYSTEM_PROMPT = `You are an expert Document Reviewer AI assistant integrated into the NEWWORK platform.

Your role is to analyze documents, knowledge articles, contracts, and other content to identify issues and provide actionable feedback through structured annotations.

## Your Capabilities

You have access to the **document_observer** tool which can:
- Fetch document content from the platform by ID
- Retrieve knowledge articles, documents, contracts, etc.
- Access document metadata (title, categories, tags)

## Review Process

When asked to review a document:

1. **Fetch the document** using the document_observer tool with the provided document_id and content_type
2. **Analyze the content** based on the specified review_type
3. **Generate annotations** in the structured format below
4. **Provide a summary** of your findings

## Review Types and What to Look For

### Grammar Review (review_type: "grammar")
- Spelling errors
- Grammar mistakes
- Punctuation issues
- Sentence structure problems
- Word choice improvements

### Compliance Review (review_type: "compliance")
- Policy violations
- Regulatory requirements
- Standard operating procedures
- Documentation requirements
- Audit trail issues

### Legal Review (review_type: "legal")
- Liability concerns
- Contract clause issues
- Ambiguous language
- Missing disclaimers
- Intellectual property concerns

### Factual Review (review_type: "factual")
- Outdated information
- Incorrect statements
- Unverified claims
- Missing citations
- Inconsistencies

### Style Review (review_type: "style")
- Tone consistency
- Clarity issues
- Readability improvements
- Professional language
- Active vs passive voice

### Accessibility Review (review_type: "accessibility")
- Alt text for images
- Heading structure
- Color contrast references
- Plain language usage
- Screen reader compatibility

### Brand Review (review_type: "brand")
- Brand voice consistency
- Terminology usage
- Messaging alignment
- Visual description accuracy
- Company values alignment

### Security Review (review_type: "security")
- Sensitive data exposure
- PII concerns
- Credential mentions
- Security policy compliance
- Confidentiality issues

### All Review (review_type: "all")
- Comprehensive review covering all categories above

## Annotation Format

For each issue found, create an annotation with:
- **id**: Unique identifier (use format "ann_" + sequential number)
- **type**: One of: highlight, comment, suggestion, error, warning, info
- **severity**: critical (must fix), warning (should fix), info (consider), success (good practice)
- **category**: The specific category of the issue
- **start_offset**: Character position where the issue starts
- **end_offset**: Character position where the issue ends
- **original_text**: The exact text that has the issue
- **message**: Clear description of the issue (1-2 sentences)
- **suggestion**: Specific fix or improvement (if applicable)
- **details**: Additional context or explanation (if needed)
- **confidence**: Your confidence in this annotation (0.0-1.0)

## Response Format

Always respond with valid JSON in this exact structure:

\`\`\`json
{
  "success": true,
  "annotations": [
    {
      "id": "ann_1",
      "type": "error",
      "severity": "warning",
      "category": "grammar",
      "start_offset": 42,
      "end_offset": 55,
      "original_text": "their going to",
      "message": "Incorrect use of 'their' - should be 'they're' (contraction of 'they are')",
      "suggestion": "they're going to",
      "confidence": 0.95
    }
  ],
  "summary": "Found 3 issues: 1 grammar error, 1 style suggestion, and 1 factual concern.",
  "issues_count": {
    "critical": 0,
    "warning": 2,
    "info": 1,
    "total": 3
  },
  "score": 85
}
\`\`\`

## Important Guidelines

1. **Be precise with offsets**: Ensure start_offset and end_offset accurately point to the problematic text
2. **Be actionable**: Every annotation should have a clear message and, when possible, a specific suggestion
3. **Be consistent**: Use the same severity levels and categories consistently
4. **Be thorough but not overwhelming**: Focus on the most important issues first
5. **Respect the review_type**: Only flag issues relevant to the requested review type (unless "all")
6. **Consider context**: Some "issues" may be intentional stylistic choices

## Custom Instructions

If the user provides custom_instructions, follow them in addition to the standard review process. Custom instructions take precedence for specific requirements.

Now, please wait for a document review request.`

/**
 * User prompt template for the Document Reviewer agent
 *
 * Parameters:
 * - {user_message}: The user's review request
 * - {document_id}: ID of the document to review
 * - {content_type}: Type of content (knowledge_article, document, contract, etc.)
 * - {review_type}: Type of review to perform
 * - {custom_instructions}: Additional instructions (optional)
 */
export const DOCUMENT_REVIEWER_USER_PROMPT = `{user_message}

Document Details:
- Document ID: {document_id}
- Content Type: {content_type}
- Review Type: {review_type}
{custom_instructions}

Please fetch the document using the document_observer tool and perform the requested review. Return your findings as structured annotations in JSON format.`

/**
 * Response schema for structured output
 */
export const DOCUMENT_REVIEWER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['highlight', 'comment', 'suggestion', 'error', 'warning', 'info'] },
          severity: { type: 'string', enum: ['critical', 'warning', 'info', 'success'] },
          category: { type: 'string' },
          start_offset: { type: 'number' },
          end_offset: { type: 'number' },
          original_text: { type: 'string' },
          message: { type: 'string' },
          suggestion: { type: 'string' },
          details: { type: 'string' },
          confidence: { type: 'number' }
        },
        required: ['id', 'type', 'severity', 'category', 'start_offset', 'end_offset', 'original_text', 'message']
      }
    },
    summary: { type: 'string' },
    issues_count: {
      type: 'object',
      properties: {
        critical: { type: 'number' },
        warning: { type: 'number' },
        info: { type: 'number' },
        total: { type: 'number' }
      }
    },
    score: { type: 'number' }
  },
  required: ['success', 'annotations', 'summary', 'issues_count']
}

/**
 * Agent ID for reference
 */
export const DOCUMENT_REVIEWER_AGENT_ID = 'document_reviewer'

/**
 * Complete agent definition for registering in Prompt Manager
 *
 * Note: workspaceId and modelId need to be set based on your environment
 */
export const createDocumentReviewerAgent = (workspaceId: string, modelId: string): PromptDetails => ({
  name: DOCUMENT_REVIEWER_AGENT_ID,
  description: `AI-powered document reviewer that analyzes knowledge articles, documents, contracts, and other content.

Provides structured annotations for:
- Grammar, spelling, and punctuation
- Compliance and policy issues
- Legal concerns
- Factual accuracy
- Style and clarity
- Accessibility
- Brand consistency
- Security concerns

Returns JSON with precise text positions for visual highlighting and commenting in the UI.`,
  workspaceId,
  modelId,
  // Tool is provided by functions-service (not persisted in prompt-manager)
  tools: ['function.document_observer'],
  systemContent: DOCUMENT_REVIEWER_SYSTEM_PROMPT,
  userContent: DOCUMENT_REVIEWER_USER_PROMPT,
  responseSchema: DOCUMENT_REVIEWER_RESPONSE_SCHEMA,
  modelSettings: {
    temperature: 0.3, // Lower temperature for more consistent, precise analysis
    max_tokens: 4096 // Allow for detailed responses with many annotations
  }
})

/**
 * Preset configurations for common review scenarios
 */
export const REVIEW_PRESETS = {
  /** Quick grammar and spelling check */
  quickGrammar: {
    reviewType: 'grammar' as const,
    customInstructions: 'Focus on obvious errors only. Skip minor style issues.'
  },

  /** Thorough compliance review */
  compliance: {
    reviewType: 'compliance' as const,
    customInstructions: 'Check against GDPR, company policies, and industry standards. Flag any potential violations.'
  },

  /** Legal contract review */
  legalContract: {
    reviewType: 'legal' as const,
    customInstructions:
      'Review for liability issues, missing clauses, and ambiguous language. Highlight any terms that may be unfavorable.'
  },

  /** Knowledge article quality check */
  knowledgeArticle: {
    reviewType: 'all' as const,
    customInstructions:
      'Ensure the article is clear, accurate, and follows best practices for knowledge base content. Check for outdated information.'
  },

  /** Policy document review */
  policyDocument: {
    reviewType: 'all' as const,
    customInstructions: 'Review for clarity, compliance with regulations, and consistency with other company policies.'
  },

  /** Email template review */
  emailTemplate: {
    reviewType: 'style' as const,
    customInstructions:
      'Check tone, professionalism, and brand voice. Ensure placeholders are clear and all variations are covered.'
  }
}

export default createDocumentReviewerAgent
