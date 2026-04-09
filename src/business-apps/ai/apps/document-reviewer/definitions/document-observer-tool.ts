/**
 * Document Observer Tool Definition
 *
 * This file contains the tool definition to be registered in Prompt Manager.
 * The tool fetches and analyzes documents, returning structured annotations.
 *
 * Register via:
 * 1. Task Expert Studio UI
 * 2. Prompt Manager API
 * 3. Script (see setup documentation)
 */

import type { SchemaConfig } from '@/common/network/ai/prompt-manager/PromptManagerClient'

/**
 * Input schema for the document_observer tool
 */
export const DOCUMENT_OBSERVER_INPUT_SCHEMA: SchemaConfig['input'] = {
  type: 'object',
  properties: {
    document_id: {
      type: 'string',
      description: 'The unique identifier of the document to review'
    },
    content_type: {
      type: 'string',
      enum: ['knowledge_article', 'content_entry', 'document', 'contract', 'policy', 'email_template', 'custom'],
      description: 'The type of content being reviewed'
    },
    review_type: {
      type: 'string',
      enum: ['grammar', 'compliance', 'legal', 'factual', 'style', 'accessibility', 'brand', 'security', 'all'],
      description: 'The type of review to perform'
    },
    focus_categories: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific categories to focus on (optional)'
    },
    min_severity: {
      type: 'string',
      enum: ['critical', 'warning', 'info'],
      description: 'Minimum severity level to report (optional, defaults to info)'
    },
    max_annotations: {
      type: 'number',
      description: 'Maximum number of annotations to return (optional)'
    },
    custom_instructions: {
      type: 'string',
      description: 'Additional instructions for the review (optional)'
    },
    language: {
      type: 'string',
      description: 'Language of the document (optional, auto-detected if not provided)'
    },
    document_content: {
      type: 'string',
      description: 'The document content to review (optional, fetched by ID if not provided)'
    },
    document_title: {
      type: 'string',
      description: 'Title of the document for context (optional)'
    }
  },
  required: ['document_id', 'content_type', 'review_type']
}

/**
 * Output schema for the document_observer tool
 */
export const DOCUMENT_OBSERVER_OUTPUT_SCHEMA: SchemaConfig['output'] = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the review was successful'
    },
    annotations: {
      type: 'array',
      description: 'List of annotations found in the document',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique annotation ID' },
          type: {
            type: 'string',
            enum: ['highlight', 'comment', 'suggestion', 'error', 'warning', 'info']
          },
          severity: {
            type: 'string',
            enum: ['critical', 'warning', 'info', 'success']
          },
          category: {
            type: 'string',
            enum: [
              'grammar',
              'spelling',
              'punctuation',
              'style',
              'clarity',
              'compliance',
              'legal',
              'factual',
              'outdated',
              'inconsistency',
              'accessibility',
              'brand',
              'security',
              'custom'
            ]
          },
          start_offset: { type: 'number', description: 'Start character position' },
          end_offset: { type: 'number', description: 'End character position' },
          original_text: { type: 'string', description: 'The flagged text' },
          message: { type: 'string', description: 'Description of the issue' },
          suggestion: { type: 'string', description: 'Suggested fix (optional)' },
          details: { type: 'string', description: 'Additional context (optional)' },
          confidence: { type: 'number', description: 'Confidence score 0-1 (optional)' }
        },
        required: ['id', 'type', 'severity', 'category', 'start_offset', 'end_offset', 'original_text', 'message']
      }
    },
    summary: {
      type: 'string',
      description: 'Summary of the review findings'
    },
    issues_count: {
      type: 'object',
      properties: {
        critical: { type: 'number' },
        warning: { type: 'number' },
        info: { type: 'number' },
        total: { type: 'number' }
      }
    },
    score: {
      type: 'number',
      description: 'Overall document score 0-100 (optional)'
    },
    error: {
      type: 'string',
      description: 'Error message if review failed (optional)'
    }
  },
  required: ['success', 'annotations', 'summary', 'issues_count']
}

/**
 * JavaScript source code for the document_observer function tool
 *
 * This runs in the js-runtime of prompt-manager.
 * It fetches document content and prepares it for AI analysis.
 */
export const DOCUMENT_OBSERVER_SOURCE = `
/**
 * Document Observer Tool
 *
 * Fetches document content from the NEWWORK platform and returns it
 * in a format suitable for AI analysis. The actual analysis is performed
 * by the AI model using this tool's output.
 *
 * @param {Object} input - Tool input parameters
 * @returns {Object} Document content and metadata for analysis
 */
async function execute(input) {
  const {
    document_id,
    content_type,
    review_type,
    focus_categories,
    min_severity = 'info',
    max_annotations,
    custom_instructions,
    language,
    document_content,
    document_title
  } = input;

  try {
    let content = document_content;
    let title = document_title;
    let metadata = {};

    // If content not provided, fetch from platform
    if (!content && document_id) {
      // Build GraphQL query based on content type
      const query = buildFetchQuery(content_type, document_id);
      const result = await graphqlRequest(query);

      if (result.error) {
        return {
          success: false,
          annotations: [],
          summary: 'Failed to fetch document',
          issues_count: { critical: 0, warning: 0, info: 0, total: 0 },
          error: result.error
        };
      }

      content = extractContent(result.data, content_type);
      title = extractTitle(result.data, content_type) || title;
      metadata = extractMetadata(result.data, content_type);
    }

    if (!content) {
      return {
        success: false,
        annotations: [],
        summary: 'No content available to review',
        issues_count: { critical: 0, warning: 0, info: 0, total: 0 },
        error: 'Document content is empty or could not be retrieved'
      };
    }

    // Return content for AI analysis
    // The AI model will analyze this and generate annotations
    return {
      success: true,
      document_id,
      content_type,
      review_type,
      content,
      title,
      metadata,
      config: {
        focus_categories,
        min_severity,
        max_annotations,
        custom_instructions,
        language
      }
    };

  } catch (error) {
    return {
      success: false,
      annotations: [],
      summary: 'Error during document analysis',
      issues_count: { critical: 0, warning: 0, info: 0, total: 0 },
      error: error.message || 'Unknown error occurred'
    };
  }
}

function buildFetchQuery(contentType, documentId) {
  switch (contentType) {
    case 'knowledge_article':
    case 'content_entry':
      return \`
        query GetContentEntry($id: String!) {
          contentEntries(where: { id: { _eq: $id } }, limit: 1) {
            id
            title
            content
            preview
            contentGroup
            categoryNames
            tagNames
            createdAt
            modifiedAt
          }
        }
      \`;
    case 'document':
      return \`
        query GetDocument($id: String!) {
          contentDocuments(where: { id: { _eq: $id } }, limit: 1) {
            id
            name
            description
            fileInfo
            createdAt
          }
        }
      \`;
    default:
      return \`
        query GetContent($id: String!) {
          contentEntries(where: { id: { _eq: $id } }, limit: 1) {
            id
            title
            content
          }
        }
      \`;
  }
}

function extractContent(data, contentType) {
  if (contentType === 'document') {
    return data?.contentDocuments?.[0]?.description || '';
  }
  return data?.contentEntries?.[0]?.content || '';
}

function extractTitle(data, contentType) {
  if (contentType === 'document') {
    return data?.contentDocuments?.[0]?.name;
  }
  return data?.contentEntries?.[0]?.title;
}

function extractMetadata(data, contentType) {
  const entry = contentType === 'document'
    ? data?.contentDocuments?.[0]
    : data?.contentEntries?.[0];

  return {
    id: entry?.id,
    createdAt: entry?.createdAt,
    modifiedAt: entry?.modifiedAt,
    categories: entry?.categoryNames,
    tags: entry?.tagNames
  };
}
`

/**
 * This tool used to be a prompt-manager persisted function tool (js-runtime).
 *
 * Prompt Manager no longer persists function tools; use a functions-service tool instead.
 * Keep the schema/source here for reference when implementing `function.document_observer`.
 */
export const DOCUMENT_OBSERVER_FUNCTION_CODE = 'function.document_observer'
