import type { SearchItem } from '../types'

const OFFICE_TYPE_TO_PHOSPHOR: Record<string, string> = {
  SPREADSHEET: 'FileXls',
  XLS: 'FileXls',
  XLSX: 'FileXls',
  DOCUMENT: 'FileDoc',
  WORD: 'FileDoc',
  DOC: 'FileDoc',
  DOCX: 'FileDoc',
  PRESENTATION: 'FilePpt',
  SLIDE: 'FilePpt',
  SLIDES: 'FilePpt',
  PPT: 'FilePpt',
  PPTX: 'FilePpt',
  PDF: 'FilePdf',
  CSV: 'FileCsv',
  NOTE: 'FileText',
  PLAIN_TEXT: 'FileText',
  TEXT: 'FileText',
  TXT: 'FileTxt',
  IMAGE: 'FileImage',
  PNG: 'FilePng',
  JPG: 'FileJpg',
  JPEG: 'FileJpg',
  GIF: 'FileImage',
  ZIP: 'FileZip',
  ARCHIVE: 'FileArchive',
  HTML: 'FileHtml',
  MARKDOWN: 'FileMd',
  MD: 'FileMd'
}

function collectOfficeLookupKeys(item: SearchItem): string[] {
  const keys: string[] = []
  const raw = item.type.trim().toUpperCase().replace(/\s+/g, '_')
  if (raw) {
    keys.push(raw)
  }
  const withoutOfficePrefix = raw.replace(/^OFFICE_/, '')
  if (withoutOfficePrefix && withoutOfficePrefix !== raw) {
    keys.push(withoutOfficePrefix)
  }
  const fromLabel = item.typeLabel?.trim().toUpperCase().replace(/\s+/g, '_')
  if (fromLabel) {
    keys.push(fromLabel)
  }
  return keys
}

/**
 * Phosphor icon base name (e.g. `FileXls` → `FileXlsIcon` at render time) for office / file hits.
 * Prefer `kind === FILE` + `type` so spreadsheet rows use spreadsheet icons even when API sends a generic media icon.
 * Supports API `type` values such as `OFFICE_SPREADSHEET` and human `typeLabel` values (e.g. Spreadsheet).
 */
export function resolveSearchItemLeadIconName(item: SearchItem): string | undefined {
  const kind = item.kind?.toUpperCase()
  const allowOfficeIcon = !kind || kind === 'FILE'

  if (allowOfficeIcon) {
    for (const key of collectOfficeLookupKeys(item)) {
      const phosphor = OFFICE_TYPE_TO_PHOSPHOR[key]
      if (phosphor) {
        return phosphor
      }
    }
  }

  if (kind === 'FILE') {
    return 'File'
  }

  return undefined
}
