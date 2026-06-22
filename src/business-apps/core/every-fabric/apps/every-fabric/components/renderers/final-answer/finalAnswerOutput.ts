import type { MessageAttachmentRef, SessionAttachment, WorkspaceDocument } from '../../../types/enterpriseAgent'

const DOC_TYPE_KEY: Record<WorkspaceDocument['type'], string> = {
  document: 'renderer-doc-type-document',
  slides: 'renderer-doc-type-slides',
  note: 'renderer-doc-type-note'
}

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

/** Extract ### Summary body without regex (avoids Sonar S5852 ReDoS hotspot). */
export function extractSummarySection(output: string): string | null {
  const lines = output.split('\n')
  let summaryLine = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.toLowerCase() === '### summary' || line.toLowerCase().startsWith('### summary ')) {
      summaryLine = i
      break
    }
  }
  if (summaryLine === -1) return null

  const bodyLines: string[] = []
  for (let i = summaryLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('### ')) break
    bodyLines.push(lines[i])
  }
  const body = bodyLines.join('\n').trim()
  return body || null
}

/** When a dashboard or timeline artifact exists, hide redundant markdown from the orchestrator. */
export function compactOutputForChartDeliverable(output: string, hasVisualArtifacts: boolean, t: TranslateFn): string {
  if (!hasVisualArtifacts || !output.trim()) return output
  const isChartDeliverable =
    /chart rendered successfully/i.test(output) ||
    /timeline rendered successfully/i.test(output) ||
    /dashboard artifact/i.test(output) ||
    /open the (dashboard |timeline )?artifact/i.test(output)
  if (!isChartDeliverable) return output

  const summaryBody = extractSummarySection(output)
  if (summaryBody) {
    return `### Summary\n\n${summaryBody}`
  }

  const firstParagraph = output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('\n')
  return firstParagraph || t('renderer-dashboard-ready')
}

export function pdfAttachmentsFromSession(
  attachments?: Array<SessionAttachment | MessageAttachmentRef>
): Array<SessionAttachment | MessageAttachmentRef> {
  if (!attachments?.length) return []
  return attachments.filter(a => (a.mime_type || '').toLowerCase() === 'application/pdf')
}

export function buildCompactSummary(docs: WorkspaceDocument[], t: TranslateFn): string {
  if (docs.length === 1) {
    const d = docs[0]
    const typeLabel = t(DOC_TYPE_KEY[d.type] ?? 'renderer-doc-type-document').toLowerCase()
    return t('renderer-compact-summary-single', { type: typeLabel, title: d.title })
  }
  const titles = docs.map(d => `"${d.title}"`).join(', ')
  return t('renderer-compact-summary-multi', { count: docs.length, titles })
}
