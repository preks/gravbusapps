export function createSearchCondition(search?: string, entityId?: string, withDescription = true): string {
  if (entityId) return ''
  if (!search) return ''
  const searchFields = ['name', 'code']
  if (withDescription) {
    searchFields.push('description')
  }
  return `
    _or: [
      ${searchFields.map(field => ` { ${field}: { _ilike: "%${search}%" } }`).join(',\n')}
    ]
  `
}

export function createWhereCondition(entityId: string | undefined) {
  return entityId ? `id: { _eq: "${entityId}" }, isDeleted: { _eq: false }` : 'isDeleted: { _eq: false }'
}
