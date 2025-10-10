import { CatalogEntryManagement } from '@/common/types/CatalogTypes'

export interface CatalogEntry extends CatalogEntryManagement {
  isNew?: boolean
  isDirty?: boolean
  originalData?: CatalogEntryManagement
  // Translation fields
  valueTranslations?: Record<string, string>
  additionalValue1Translations?: Record<string, string>
  additionalValue2Translations?: Record<string, string>
  additionalValue3Translations?: Record<string, string>
}

const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) {
    return ''
  }

  let value = field.toString()

  // Remove or replace problematic characters
  value = value
    .replace(/\r\n/g, ' ') // Replace Windows line endings with space
    .replace(/\r/g, ' ') // Replace Mac line endings with space
    .replace(/\n/g, ' ') // Replace Unix line endings with space
    .replace(/"/g, '""') // Escape quotes by doubling them

  // Always wrap in quotes for safety
  return `"${value}"`
}

export const convertEntriesToCSV = (entries: CatalogEntry[]): string => {
  // Match the exact format expected by the server
  const headers = [
    'Code',
    'Alternative Code', // Note: with space, not 'AlternativeCode'
    'Value',
    'Additional Value1', // Note: with space, not 'AdditionalValue1'
    'Additional Value2',
    'Additional Value3',
    'Object Value' // Note: with space, not 'ObjectValue'
    // Note: NO Type or ParentEntryId columns in server format
  ]

  const csvRows = [headers.join(',')] // Don't escape headers - use exact format

  let processedCount = 0

  entries.forEach(entry => {
    // Only process entries that are marked as dirty or new AND have essential data
    if ((entry.isDirty || entry.isNew) && (entry.code || entry.id)) {
      const row = [
        entry.code || '',
        entry.alternativeCode || '', // Alternative Code is second column
        entry.value || '',
        entry.additionalValue1 || '',
        entry.additionalValue2 || '',
        entry.additionalValue3 || '',
        entry.objectValue ? JSON.stringify(entry.objectValue).replace(/\s+/g, ' ') : ''
        // Note: Removed Type and ParentEntryId as they're not in server format
      ]

      // Validate that we have exactly 7 fields (not 9)
      if (row.length === 7) {
        csvRows.push(row.map(escapeCSVField).join(','))
        processedCount++
      } else {
        console.warn('Skipping entry with incorrect field count:', entry.id, 'fields:', row.length, 'expected: 7')
      }
    }
  })

  console.log(`CSV generation: processed ${processedCount} entries out of ${entries.length} total`)

  // Use \r\n for better CSV compatibility
  return csvRows.join('\r\n')
}

export const createCsvFile = (csvData: string, filename: string = 'catalog-entries.csv'): File => {
  // Create UTF-8 encoded CSV blob but use standard MIME type for server compatibility
  const csvBlob = new Blob(['\uFEFF' + csvData], { type: 'text/csv' })
  return new File([csvBlob], filename, { type: 'text/csv' })
}
