interface BuildDocumentEditPromptOptions {
  documentId: string
  documentTitle?: string
  selectedText?: string
  selectedHtml?: string
  userInstruction: string
}

/**
 * Builds a deterministic prompt for document editing in EveryAI/Flowbot.
 *
 * The prompt carries document identity and optional selected text so Flowbot
 * can call the document edit tool with minimal ambiguity.
 */
export function buildDocumentEditPrompt(options: BuildDocumentEditPromptOptions): string {
  const title = options.documentTitle?.trim() || 'Untitled Document'
  const rawSelectedText = options.selectedText?.trim() || ''
  const rawSelectedHtml = options.selectedHtml?.trim() || ''
  const userInstruction = options.userInstruction.trim()
  const hasSelection = rawSelectedText.length > 0
  const selectionText = hasSelection ? rawSelectedText : ''
  const selectionHtml = rawSelectedHtml.length > 0 ? rawSelectedHtml : ''
  const modeHint = hasSelection ? 'selection' : 'document'

  const lines = [
    `Edit EveryOffice document: ${userInstruction}`,
    '',
    'Document context:',
    `- document_id: ${options.documentId}`,
    `- document_title: ${title}`,
    `- mode_hint: ${modeHint}`,
    '',
    'Required behavior:',
    '1. Use the edit_everyoffice_document tool.',
    '2. Pass the same user instruction to the tool.',
    `3. Use mode="${modeHint}" for this request.`,
    hasSelection
      ? '4. Pass selected_text exactly as provided under Selection context (do not omit or paraphrase).'
      : '4. Do not pass selected_text when there is no Selection context.',
    hasSelection && selectionHtml
      ? '5. Pass selected_html exactly as provided under Selection HTML context.'
      : '5. Do not pass selected_html when Selection HTML context is missing.',
    '6. Return a concise summary of the applied change.',
    hasSelection
      ? '7. Keep edits scoped to the selected content and preserve unrelated sections.'
      : '7. Update the full document as requested.',
    hasSelection
      ? '8. If updated_html is returned in selection mode, it must be the FULL document HTML (never only the selected fragment).'
      : '8. Return updated_html with the full document.'
  ]

  if (hasSelection) {
    lines.push('', 'Selection context:', selectionText)
  }
  if (selectionHtml) {
    lines.push('', 'Selection HTML context:', selectionHtml)
  }

  return lines.join('\n')
}
