import type { ColumnDefinition } from '../types'

export function sanitizeDefinitionKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-z0-9_]/g, '')
}

export function validateDefinitionForm(params: { key: string; columns: ColumnDefinition[] }): string | null {
  const { key, columns } = params

  if (!key.trim()) return 'Key is required'
  if (key.length < 3) return 'Key must be at least 3 characters'
  if (!/^[a-z][a-z0-9_]*$/.test(key))
    return 'Key must start with a letter and contain only lowercase letters, numbers, and underscores'
  if (columns.length === 0) return 'At least one column is required'

  // Validate each column
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    if (!col.name.trim()) return `Column ${i + 1}: Name is required`
    if (!col.label.trim()) return `Column ${i + 1}: Label is required`
    if (!/^[a-z][a-z0-9_]*$/.test(col.name)) {
      return `Column ${i + 1}: Name must start with a letter and contain only lowercase letters, numbers, and underscores`
    }
  }

  // Check for duplicate column names
  const names = columns.map(c => c.name)
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  if (duplicates.length > 0) {
    return `Duplicate column name: ${duplicates[0]}`
  }

  return null
}
