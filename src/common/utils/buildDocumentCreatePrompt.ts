interface BuildDocumentCreatePromptOptions {
  title?: string
  userInstruction: string
  generationContext?: string
}

/**
 * Builds a deterministic prompt for EveryOffice document creation in Flowbot.
 *
 * The prompt nudges the agent to gather relevant facts first (when needed),
 * then call the dedicated create_everyoffice_document tool.
 */
export function buildDocumentCreatePrompt(options: BuildDocumentCreatePromptOptions): string {
  const title = options.title?.trim() || 'Untitled Document'
  const userInstruction = options.userInstruction.trim()
  const generationContext = options.generationContext?.trim() || ''

  const lines = [
    `Create EveryOffice document: ${userInstruction}`,
    '',
    'Document context:',
    `- title: ${title}`,
    '',
    'Required behavior:',
    '1. If business facts are needed, gather only relevant facts first using run_sql_query, run_graphql_query, or run_internal_search.',
    '2. Summarize gathered facts into a compact generation_context (no large raw payloads).',
    '3. Call create_everyoffice_document directly (do NOT treat it as a flow).',
    '4. Pass the same user instruction to the tool.',
    `5. Pass title="${title}" to the tool.`,
    '6. Return a concise summary and include the created document link when available.'
  ]

  if (generationContext) {
    lines.push('', 'Grounding context:', generationContext)
  }

  return lines.join('\n')
}
