interface LearningQuizTaskDocumentLink {
  url: string
  type?: string
  metadata?: {
    contentEntryId?: string
  }
}

function readContentIdFromUrl(url: string): string | undefined {
  const query = url.split('?')[1]
  if (!query) return undefined
  return new URLSearchParams(query).get('contentId') ?? undefined
}

export function extractLearningTaskContentEntryId(
  sourceLink: LearningQuizTaskDocumentLink | undefined
): string | undefined {
  if (!sourceLink) return undefined

  if (sourceLink.type?.startsWith('document:')) {
    const documentId = sourceLink.type.slice('document:'.length).trim()
    if (documentId) return documentId
  }

  const metadataId = sourceLink.metadata?.contentEntryId
  if (typeof metadataId === 'string' && metadataId.trim()) return metadataId.trim()

  return readContentIdFromUrl(sourceLink.url)
}
