const SPECIAL_TOKEN_LABELS: Record<string, string> = {
  ai: 'AI',
  api: 'API',
  db: 'DB',
  fk: 'FK',
  graphql: 'GraphQL',
  id: 'ID',
  ids: 'IDs',
  pk: 'PK',
  ui: 'UI',
  url: 'URL',
  uuid: 'UUID'
}

export function humanizeDataViewerLabel(rawValue?: string | null): string {
  const normalizedValue = String(rawValue || '').trim()
  if (!normalizedValue) return ''

  return normalizedValue
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(token => {
      const lowerCasedToken = token.toLowerCase()
      const specialTokenLabel = SPECIAL_TOKEN_LABELS[lowerCasedToken]
      if (specialTokenLabel) return specialTokenLabel
      return lowerCasedToken.charAt(0).toUpperCase() + lowerCasedToken.slice(1)
    })
    .join(' ')
}
