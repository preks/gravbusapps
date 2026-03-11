import { DriveApiService } from '../services/DriveApiService'
import { exportToWord } from '@/business-apps/platform/apps/document-apps/utils/exportUtils'
import { downloadNote } from '@/business-apps/platform/apps/note-apps/utils/noteExportUtils'
import { exportSheetToExcel } from '@/business-apps/platform/apps/spreadsheet-apps/utils/exportUtils'
import { exportToPptx } from '@/business-apps/platform/apps/slide-apps/utils/exportUtils'
import { getThemeById } from '@/business-apps/platform/apps/slide-apps/components/slideThemes'
import type { DriveItem } from '../types/drive.types'

export async function downloadDriveItem(item: DriveItem): Promise<void> {
  switch (item.type) {
    case 'drive_file':
      await DriveApiService.downloadFile(item.id)
      return

    case 'document':
      await downloadDocument(item.id)
      return

    case 'note':
      await downloadNoteItem(item.id)
      return

    case 'spreadsheet_app':
      await downloadSpreadsheet(item.id)
      return

    case 'slide':
      await downloadSlide(item.id)
      return
  }
}

async function downloadDocument(id: string): Promise<void> {
  const doc = await DriveApiService.fetchDocument(id)
  await exportToWord(doc.title || 'Untitled', doc.content || doc.plainText || '')
}

async function downloadNoteItem(id: string): Promise<void> {
  const note = await DriveApiService.fetchNote(id)
  downloadNote(
    { id: note.id, title: note.title, content: note.content, isPinned: false, isArchived: false } as Parameters<
      typeof downloadNote
    >[0],
    { format: 'markdown' }
  )
}

async function downloadSpreadsheet(id: string): Promise<void> {
  const app = await DriveApiService.fetchSpreadsheet(id)
  const sheets = app.sheets ?? []
  if (sheets.length === 0) return

  const firstSheet = sheets.sort((a, b) => a.position - b.position)[0]
  const rows = await DriveApiService.fetchSpreadsheetRows(id, firstSheet.id)
  const data = rows.map(r => r.data ?? {})

  await exportSheetToExcel(app.name || 'Spreadsheet', firstSheet as Parameters<typeof exportSheetToExcel>[1], data)
}

async function downloadSlide(id: string): Promise<void> {
  const slide = await DriveApiService.fetchSlide(id)
  const contentJson = slide.contentJson as { slides?: unknown[]; themeId?: string } | undefined
  const slides = (contentJson?.slides ?? []) as Parameters<typeof exportToPptx>[0]
  const theme = getThemeById(contentJson?.themeId ?? 'corporate')

  if (slides.length === 0) return
  await exportToPptx(slides, theme, slide.title || 'Untitled')
}
