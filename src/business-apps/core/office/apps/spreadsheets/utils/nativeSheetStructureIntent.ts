/**
 * User-driven native Univer sheet-bar commands we handle REST-first (API-first workbook structure).
 */

export const UNIVER_NATIVE_SHEET_STRUCTURE_COMMANDS = {
  INSERT_SHEET: 'sheet.command.insert-sheet',
  COPY_SHEET: 'sheet.command.copy-sheet',
  REMOVE_SHEET: 'sheet.command.remove-sheet',
  SET_WORKSHEET_NAME: 'sheet.command.set-worksheet-name'
} as const

export type NativeSheetStructureIntent =
  | {
      type: 'insert'
      sheetId: string
      sheetName: string
      index: number
    }
  | {
      type: 'duplicate'
      sourceSheetId: string
      /** Client-generated UUID for POST /sheets/:id/duplicate */
      targetSheetId: string
      sheetName: string
      index: number
    }
  | {
      type: 'rename'
      sheetId: string
      sheetName: string
    }
  | {
      type: 'delete'
      sheetId: string
    }
  | {
      type: 'visibility'
      sheetId: string
      hidden: boolean
    }
