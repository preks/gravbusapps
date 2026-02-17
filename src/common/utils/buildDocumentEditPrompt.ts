interface BuildDocumentEditPromptOptions {
  documentId: string
  documentTitle?: string
  selectedText?: string
  selectedHtml?: string
  userInstruction: string
}

const MAX_SELECTION_PREVIEW_LENGTH = 1200
const MAX_SELECTION_HTML_PREVIEW_LENGTH = 4000

function truncateSelectionPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= MAX_SELECTION_PREVIEW_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, MAX_SELECTION_PREVIEW_LENGTH)}...`
}

function truncateSelectionHtmlPreview(html: string): string {
  const normalized = html.trim()
  if (normalized.length <= MAX_SELECTION_HTML_PREVIEW_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, MAX_SELECTION_HTML_PREVIEW_LENGTH)}...`
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
  const selectionPreview = hasSelection ? truncateSelectionPreview(rawSelectedText) : ''
  const selectionHtmlPreview = rawSelectedHtml.length > 0 ? truncateSelectionHtmlPreview(rawSelectedHtml) : ''
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
    hasSelection && selectionHtmlPreview
      ? '5. Pass selected_html exactly as provided under Selection HTML context.'
      : '5. Do not pass selected_html when Selection HTML context is missing.',
    '6. Return a concise summary of the applied change.'
  ]

  if (hasSelection) {
    lines.push('', 'Selection context:', selectionPreview)
  }
  if (selectionHtmlPreview) {
    lines.push('', 'Selection HTML context:', selectionHtmlPreview)
  }

  return lines.join('\n')
}
